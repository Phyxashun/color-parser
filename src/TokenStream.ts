import { inspect, type InspectOptions } from 'node:util';
import PrettyTree, { Tree, type ArchyNode } from './PrettyTree';
import { treeify } from './treeify';

export type CharType = typeof CharType[keyof typeof CharType];
export type CharTypeFn = (char: string) => boolean;
export type ClassifyFunction = (char: string) => CharType;
export type CharTypeType = [CharType, CharTypeFn][] // SigmaType
export type Predicate = (token: Character) => boolean;

export const CharType = {
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
    Underscore: 'Underscore',
    Operator: 'Operator', // All others

    // Special and Meta Characters
    Hash: 'Hash', // #
    Exponent: 'Exponent', // e | E
    Other: 'Other',
    Error: 'Error',
} as const;

export const CharMap = new Map<string, CharType>([
    ['%', CharType.Percent],
    ['.', CharType.Dot],
    [',', CharType.Comma],
    ['/', CharType.Slash],
    ['(', CharType.LParen],
    [')', CharType.RParen],
    ['+', CharType.Plus],
    ['-', CharType.Minus],
    ['_', CharType.Underscore],
    ['#', CharType.Hash],
    ['!', CharType.Operator],
    ['\\', CharType.Operator],
    ['*', CharType.Operator],
    ['@', CharType.Operator],
    ['$', CharType.Operator],
    ['^', CharType.Operator],
    ['&', CharType.Operator],
    ['{', CharType.Operator],
    ['}', CharType.Operator],
    ['[', CharType.Operator],
    [']', CharType.Operator],
    ['|', CharType.Operator],
    [':', CharType.Operator],
    [';', CharType.Operator],
    ['<', CharType.Operator],
    ['>', CharType.Operator],
    ['?', CharType.Operator],
    ['~', CharType.Operator],
    ['`', CharType.Operator],
    ['=', CharType.Operator],
]);

export const CharSpec = new Map<CharType, CharTypeFn>([
    [CharType.Whitespace, (char) => /\s/.test(char)],
    [CharType.Letter, (char) => /\p{L}/u.test(char)],
    [CharType.Digit, (char) => /\p{Nd}/u.test(char)],
    [CharType.Quote, (char) => /["'`]|\p{Pi}|\p{Pf}/u.test(char)],
    [CharType.Exponent, (char) => /[eE]/.test(char)],
    [CharType.Hex, (char) => /[a-f0-9]/i.test(char)],
    [CharType.Unicode, (char) => /[^\x00-\x7F]/.test(char)],
]);


export class Character {
    value: string;
    type: CharType;
    index: number;
    line: number;
    column: number;
    source: string;

    constructor(value: string, type: CharType | undefined, index: number, line: number, column: number, source: string) {
        this.value = value || '';
        this.type = type || Character.classify(value);
        this.index = index || 0;
        this.line = line || 1;
        this.column = column || 1;
        this.source = source || '';
    }

    public [inspect.custom](depth: number, options: any, inspect: any) {
        if (depth < 0) return options.stylize('[Character Object]', 'special');

        const newOptions = Object.assign({}, options, {
            depth: options.depth === null ? null : options.depth - 1,
            colors: true,
            maxArrayLength: null,
        });

        // Five space padding because that's the size of "Character[##]< ".
        const pad1 = ' '.repeat(3 - String(this.index).length);
        const pad2 = ' '.repeat((this.type.length < 15) ? 15 - this.type.length : 0);
        const type = `${this.type}${pad2}`;
        const padding = ' '.repeat(11);
        const outer = `Character[${pad1}${this.index}] `;
        const innermost = {
            value: this.value,      // 8 + 5
            type: type,             // 8 + 15
            index: this.index,      // 8 + 4
            line: this.line,        // 8 + 4
            column: this.column,    // 8 + 4
        };
        const inner = inspect(innermost, newOptions).replace(/\n/g, `\n${padding}`);
        const result = `${options.stylize(outer, 'special')}< ${inner} >`;
        return result;
    }

    public static classify: ClassifyFunction = (char) => {
        if (char === '\n') return CharType.Newline;
        if (CharMap.has(char)) return CharMap.get(char)!;

        let cls: CharType = CharType.Other;
        const direct = CharMap.get(char);

        for (const [CharType, CharTypeFn] of CharSpec) {
            if (direct) {
                cls = direct
            } else if (CharTypeFn(char)) {
                cls = CharType as CharType;
            }
        }

        CharMap.set(char, cls);
        return cls;
    };

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

// CharStream.ts
export class CharStream implements Iterator<Character>, Iterable<Character> {
    private readonly source: string;
    private index: number = 0;
    private line: number = 1;
    private column: number = 1;
    private history: Character[] = [];

    constructor(input: string) {
        this.source = input.normalize('NFC');
        this.consume();
    }

    public consume(): Character {
        const char = this.makeChar(this.source[this.index]!);
        this.history.push(char);
        this.advance(char);
        return char;
    }

    public reset(): this {
        this.index = 0;
        this.line = 1;
        this.column = 1;
        this.history.length = 0;
        return this;
    }

    next(): IteratorResult<Character> {
        if (this.isEOF()) {
            return { value: this.EOFChar(), done: true };
        }

        return { value: this.consume(), done: false };
    }

    [Symbol.iterator](): Iterator<Character> {
        this.reset();
        return this;
    }

    private isEOF() {
        return this.index >= this.source.length;
    }

    private EOFChar(): Character {
        return new Character('', CharType.EOF, this.index, this.line, this.column, this.source);
    }

    private makeChar(char: string): Character {
        return new Character(char, undefined, this.index, this.line, this.column, this.source);
    }

    private advance(char: Character): this {
        this.index++;
        if (char.value === '\n' || char.type === CharType.Newline) {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return this;
    }
}


// TESTING

const test = () => {
    const options = {
        depth: null,
        colors: true,
        maxArrayLength: null,
    };

    const str = "This is a very long string";// that we want to split into multiple lines to make it more readable and fit within a specific display constraint.";
    const result = [];
    const stream = new CharStream(str);

    //console.log(inspect(test, options));

    for (const char of stream) {
        result.push(char);
        console.log(inspect(char, options));
    }

    console.log();

    console.log(Tree(result, 'Character Stream', 'Token', undefined, true, false));
}

test();
