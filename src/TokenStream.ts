import util from 'util';

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

export interface Position {
    index: number;   // absolute index
    line: number;    // 1-based
    column: number;  // 1-based
}

export interface CharToken {
    char: string;
    class: CharClass;
    position: Position;
}

export const CharSpec: CharClassType = [
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

export const classify: ClassifyFunction = (char: string): CharClass => {
    for (const [charClass, fn] of CharSpec) {
        if (fn(char)) return charClass as CharClass;
    }
    return CharClass.Other;
}

// CharStream.ts
export class CharStream {
    private readonly maxLength: number = 50;
    private readonly chars: string[];
    private position: Position = {
        index: 0,
        line: 1,
        column: 1,
    }
    private tokens: CharToken[] = [];
    private history: CharToken[] = [];

    constructor(input: string) {
        this.chars = this.split(input);
        this.init();
    }

    /* -------------------------------------------------- */
    /* Internal                                           */
    /* -------------------------------------------------- */

    init() {
        console.log('CHARS:', this.chars);
        for (const char of this.chars) {
            console.log('CHAR:', char);
            if (!this.isEOF) {
                this.tokens.push(this.makeToken(char));
                this.advance(char);
                this.consume();
            }
        }
        this.tokens.push(this.EOFToken());
    }

    *[Symbol.iterator](): Generator<CharToken> {
        yield* this.tokens;
    }

    private isEOF() {
        return this.position.index >= this.chars.length;
    }

    private makeToken(ch: string): CharToken {
        return {
            char: ch,
            class: classify(ch),
            position: this.getPosition(),
        };
    }

    private advance(ch: string): void {
        this.position.index++;

        if (ch === '\n') {
            this.position.line++;
            this.position.column = 1;
        } else {
            this.position.column++;
        }
    }

    private retreat(token: CharToken): void {
        this.position = token.position;
    }

    private EOFToken(): CharToken {
        return {
            char: '',
            class: CharClass.EOF,
            position: this.getPosition(),

        };
    }

    private getPosition(): Position {
        return {
            index: this.position.index,
            line: this.position.line,
            column: this.position.column,
        }
    }

    /* -------------------------------------------------- */
    /* Core API                                          */
    /* -------------------------------------------------- */

    peek(): CharToken {
        if (this.isEOF()) {
            return this.EOFToken();
        }
        return this.makeToken(this.chars[this.position.index]!);
    }

    rewind(): CharToken | null {
        const token = this.history.pop();
        if (!token) return null;

        this.retreat(token);
        return token;
    }

    previous(): CharToken | null {
        return this.history.at(-1) ?? null;
    }

    reset(): void {
        this.position.index = 0;
        this.position.line = 1;
        this.position.column = 1;
        this.history.length = 0;
    }

    /* -------------------------------------------------- */
    /* Consumption Helpers                                */
    /* -------------------------------------------------- */

    consume(): CharToken {
        const token = this.peek();

        if (token.class !== CharClass.EOF) {
            this.history.push(token);
            this.advance(token.char);
        }

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
    public split(input: string): string[] {
        const codePoints = Array.from(input);
        if (codePoints.length >= this.maxLength) return codePoints;

        const lines: string[] = [];
        let buffer: string[] = [];

        for (const ch of codePoints) {
            if (ch === '\n') {
                lines.push(buffer.join(''));
                buffer = [];
                continue;
            }

            buffer.push(ch);

            if (buffer.length >= this.maxLength) {
                lines.push(buffer.join(''));
                buffer = [];
            }
        }

        if (buffer.length) lines.push(buffer.join(''));

        const result = lines.join('\n');

        return [result];
    }
}


// TESTING

const test = () => {
    const options = {
        depth: null,
        colors: true,
        maxArrayLength: null,
    };

    const str = "This is a very long string that we want to split into multiple lines to make it more readable and fit within a specific display constraint.";
    const test = new CharStream(str);

    //test.buildCharInformation();
    for (const t of test) {
        console.log(util.inspect(t, options));
    }


}

test();