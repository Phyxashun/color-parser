import { inspect, type InspectOptions } from 'node:util';
import PrettyTree, { Tree, type ArchyNode } from './PrettyTree';
import { treeify } from './treeify';

export type CharClass = typeof CharClass[keyof typeof CharClass];
export type CharClassFn = (char: string) => boolean;
export type ClassifyFunction = (char: string) => CharClass;
export type CharClassType = [CharClass, CharClassFn][] // SigmaType
export type Predicate = (token: CharToken) => boolean;

export const CharClass = {
    // Structural and Whitespace
    Whitespace: 'Whitespace',
    Newline: 'Newline',
    EOF: 'EOF',

    // Literals and Components
    Digit: 'Digit', // 0-9
    Unicode: 'Unicode',
    Hex: 'Hex', // 0-9a-fA-f  
    Letter: 'Letter',
    Quote: 'Quote',
    Dot: 'Dot',

    // Punctuation and Operators
    LParen: 'LParen',
    RParen: 'RParen',
    LBrace: 'LBrace',
    RBrace: 'RBrace',
    LBracket: 'LBracket',
    RBracket: 'RBracket',
    Comma: 'Comma',
    SemiColon: 'SemiColon',
    Colon: 'Colon',
    Equals: 'Equals',
    Plus: 'Plus',
    Minus: 'Minus',
    Slash: 'Slash',
    Percent: 'Percent',
    Operator: 'Operator', // All others

    // Special and Meta Characters
    Hash: 'Hash', // #
    Exponent: 'Exponent', // e | E
    Other: 'Other',
    Error: 'Error',
} as const;

export class CharToken implements Iterable<CharToken> {
    character: string;
    class: CharClass;
    index: number;   // absolute index
    line: number;    // 1-based
    column: number;  // 1-based

    constructor(char: string, charClass: CharClass | undefined, index: number, line: number, column: number) {
        this.character = char || '';
        this.class = charClass || classify(this.character);
        this.index = index || 0;
        this.line = line || 1;
        this.column = column || 1;
    }

    *[Symbol.iterator]() {
        return this;
    }

    [inspect.custom](depth: number, options: any, inspect: any) {
        if (depth < 0) {
            return options.stylize('[CharToken]', 'special');
        }

        const newOptions = Object.assign({}, options, {
            depth: options.depth === null ? null : options.depth - 1,
            colors: true,
            maxArrayLength: null,
        });

        // Five space padding because that's the size of "Box< ".
        const padding = ' '.repeat(11);
        const inner = inspect({
            character: this.character,
            class: this.class,
            index: this.index,
            line: this.line,
            column: this.column,
        }, newOptions).replace(/\n/g, `\n${padding}`);
        return `${options.stylize('CharToken', 'special')}< ${inner} >`;
    }

    /*
    toString(): string {
        const options = {
            depth: null,
            colors: true,
            maxArrayLength: null,
        };
        return inspect({
            character: this.character,
            class: this.class,
            index: this.index,
            line: this.line,
            column: this.column,
        }, options);
    }
    */
}

export const CharSpec: CharClassType = [
    [CharClass.Newline, (char) => char === '\n'],
    [CharClass.Whitespace, (char) => /\s/u.test(char)],

    // Unicode letters
    [CharClass.Letter, (char) => /\p{L}/u.test(char)],

    // Unicode digits
    [CharClass.Digit, (char) => /\p{Nd}/u.test(char)],

    [CharClass.Quote, (char) =>
        /["'`]|\p{Pi}|\p{Pf}/u.test(char)
    ],

    [CharClass.Percent, (char) => char === '%'],
    [CharClass.Dot, (char) => char === '.'],
    [CharClass.LParen, (char) => char === '('],
    [CharClass.RParen, (char) => char === ')'],
    [CharClass.Comma, (char) => char === ','],
    [CharClass.Slash, (char) => char === '/'],
    [CharClass.Plus, (char) => char === '+'],
    [CharClass.Minus, (char) => char === '-'],
    [CharClass.Hash, (char) => char === '#'],

    // Exponent marker is intentionally ASCII
    [CharClass.Exponent, (char) => /[eE]/.test(char)],

    [CharClass.Hex, (char) => /[a-f0-9]/i.test(char)],

    [CharClass.Operator, (char) => {
        switch (char) {
            case '!': case '\\': case '*': case '@':
            case '$': case '^': case '&': case '{':
            case '}': case '[': case ']': case '|':
            case ':': case ';': case '<': case '>':
            case '?': case '~': case '`': case '=':
                return true;
            default:
                return false;
        }
    }],

    // Non-ASCII fallback
    [CharClass.Unicode, (char) => /[^\x00-\x7F]/.test(char)],
];

export const classify: ClassifyFunction = (char) => {
    if (char === '\n') return CharClass.Newline;
    if (charMap.has(char)) return charMap.get(char)!;

    let cls: CharClass;
    const direct = charMap.get(char);

    if (direct) cls = direct;
    else if (/\p{L}/u.test(char)) cls = CharClass.Letter;
    else if (/\p{Nd}/u.test(char)) cls = CharClass.Digit;
    else if (/\s/u.test(char)) cls = CharClass.Whitespace;
    else if (/[^\x00-\x7F]/.test(char)) cls = CharClass.Unicode;
    else cls = CharClass.Other;

    charMap.set(char, cls);
    return cls;
};

export const charMap = new Map<string, CharClass>([
    ['(', CharClass.LParen],
    [')', CharClass.RParen],
    ['+', CharClass.Plus],
    ['-', CharClass.Minus],
    ['#', CharClass.Hash],
]);

// CharStream.ts
export class CharStream implements Iterable<CharToken>, Iterator<CharToken> {
    private readonly maxLength: number = 50;
    private readonly chars: string[];

    private index: number = 0;
    private line: number = 1;
    private column: number = 1;

    history: CharToken[] = [];

    constructor(input: string) {
        this.chars = CharStream.split(input, this.maxLength);
    }

    /* ------------------------- Iterator ------------------------- */
    public get() {
        //return this.next().value;
    }

    next(): IteratorResult<CharToken> {
        if (this.isEOF()) return { value: this.EOFToken(), done: true };
        return { value: this.consume(), done: false };
    }

    [Symbol.iterator](): Iterator<CharToken> {
        this.reset();
        return this; // the iterator is itself iterable
    }

    /* -------------------------------------------------- */
    /* Internal                                           */
    /* -------------------------------------------------- */

    private isEOF() {
        return this.index >= this.chars.length;
    }

    private EOFToken(): CharToken {
        return new CharToken('', CharClass.EOF, this.index, this.line, this.column);
    }

    private makeToken(char: string): CharToken {
        return new CharToken(char, undefined, this.index, this.line, this.column);
    }

    private advance(char: string): this {
        this.index++;
        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return this;
    }

    private goto(token: CharToken): this {
        this.index = token.index;
        this.line = token.line;
        this.column = token.column;
        return this;
    }

    /* -------------------------------------------------- */
    /* Core API                                          */
    /* -------------------------------------------------- */

    peek(): CharToken {
        if (this.isEOF()) return this.EOFToken();
        return this.makeToken(this.chars[this.index]!);
    }

    rewind(): CharToken | null {
        const token = this.history.pop();
        if (!token) return null;
        this.goto(token);
        return token;
    }

    previous(): CharToken | null {
        const token = this.history.at(-1) ?? null;
        if (!token) return null;
        this.goto(token);
        return token;
    }

    reset(): this {
        this.index = 0;
        this.line = 1;
        this.column = 1;
        this.history.length = 0;
        return this;
    }

    /* -------------------------------------------------- */
    /* Consumption Helpers                                */
    /* -------------------------------------------------- */

    consume(): CharToken {
        const token = this.makeToken(this.chars[this.index]!);
        this.history.push(token);
        this.advance(token.character);
        return token;
    }

    consumeIf(predicate: Predicate): CharToken | null {
        const next = this.peek();
        if (next.class === CharClass.EOF) return null;
        if (!predicate(next)) return null;
        return this.consume();
    }

    consumeWhile(predicate: Predicate): CharToken[] {
        const consumed: CharToken[] = [];

        while (true) {
            const next = this.peek();
            if (next.class === CharClass.EOF) break;
            if (!predicate(next)) break;

            consumed.push(this.consume());
        }

        return consumed;
    }

    consumeUntil(predicate: Predicate): CharToken[] {
        const consumed: CharToken[] = [];

        while (true) {
            const next = this.peek();
            if (next.class === CharClass.EOF) break;
            if (predicate(next)) break;

            consumed.push(this.consume());
        }

        return consumed;
    }

    /* -------------------------------------------------- */
    /* Utilities                                         */
    /* -------------------------------------------------- */
    public static split(input: string, maxLength: number = 50): string[] {
        const codePoints = Array.from(input.normalize('NFC'));
        const result: string[] = [];

        let count = 0;
        for (const ch of codePoints) {
            result.push(ch);
            count++;
            if (ch === '\n' || count >= maxLength) {
                if (ch !== '\n') result.push('\n');
                count = 0;
            }
        }
        return result;
    }
}


// TESTING
/*
const test = () => {
    const options = {
        depth: null,
        colors: true,
        maxArrayLength: null,
    };

    const str = "This is a very long string";// that we want to split into multiple lines to make it more readable and fit within a specific display constraint.";
    const test = new CharStream(str);
    const result: CharToken[] = [];

    for (const token of test) {


        result.push(token[Symbol.iterator]().next().value);
    }

    const tokenTree = new PrettyTree(true, true);

    console.log(inspect(result, options))
}

test();
*/