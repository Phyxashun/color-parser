// src/DfaTokenizer.ts

/* ============================================================
 * Token Types
 * ============================================================ */

export enum TokenType {
    HEXCOLOR,
    FUNCTION,
    IDENT,
    NUMBER,
    PERCENT,
    DIMENSION,
    COMMA,
    SLASH,
    LPAREN,
    RPAREN,
    WHITESPACE,
    EOF,
}

/* ============================================================
 * Position / Token
 * ============================================================ */

export interface Position {
    index: number;
    line: number;
    column: number;
}

export interface Token {
    type: TokenType;
    value: string;
    start: Position;
    end: Position;
}

/* ============================================================
 * Tokenizer Errors
 * ============================================================ */

export class DiagnosticError extends Error {
    constructor(
        message: string,
        public readonly source: string,
        public readonly start: Position,
        public readonly end: Position,
        public readonly hint?: string
    ) {
        super(message);
        this.name = 'DiagnosticError';
    }
}

export class LexerError extends SyntaxError {
    constructor(
        message: string,
        public readonly source: string,
        public readonly index: number
    ) {
        super(message);
        this.name = 'LexerError';
    }
}

/* ============================================================
 * Character Classes
 * ============================================================ */

enum CharClass {
    Digit,
    Dot,
    Plus,
    Minus,
    Hash,
    Letter,
    Percent,
    LParen,
    RParen,
    Comma,
    Slash,
    Whitespace,
    EOF,
    Other,
}

function classify(ch: string): CharClass {
    if (ch === '') return CharClass.EOF;
    if (ch >= '0' && ch <= '9') return CharClass.Digit;
    if (ch === '.') return CharClass.Dot;
    if (ch === '+') return CharClass.Plus;
    if (ch === '-') return CharClass.Minus;
    if (ch === '#') return CharClass.Hash;
    if (/[a-zA-Z_]/.test(ch)) return CharClass.Letter;
    if (ch === '%') return CharClass.Percent;
    if (ch === '(') return CharClass.LParen;
    if (ch === ')') return CharClass.RParen;
    if (ch === ',') return CharClass.Comma;
    if (ch === '/') return CharClass.Slash;
    if (ch === ' ' || ch === '\t' || ch === '\n') return CharClass.Whitespace;
    return CharClass.Other;
}

/* ============================================================
 * DFA States
 * ============================================================ */

enum State {
    Start,
    Whitespace,
    Sign,
    Integer,
    Fraction,
    Unit,
    Ident,
    Hex,
}

/* ============================================================
 * DFA Transition Table
 * ============================================================ */

const T: Record<State, Partial<Record<CharClass, State>>> = {
    [State.Start]: {
        [CharClass.Whitespace]: State.Whitespace,
        [CharClass.Hash]: State.Hex,
        [CharClass.Digit]: State.Integer,
        [CharClass.Dot]: State.Fraction,
        [CharClass.Plus]: State.Sign,
        [CharClass.Minus]: State.Sign,
        [CharClass.Letter]: State.Ident,
    },

    [State.Whitespace]: {
        [CharClass.Whitespace]: State.Whitespace,
    },

    [State.Sign]: {
        [CharClass.Digit]: State.Integer,
        [CharClass.Dot]: State.Fraction,
    },

    [State.Integer]: {
        [CharClass.Digit]: State.Integer,
        [CharClass.Dot]: State.Fraction,
        [CharClass.Letter]: State.Unit,
        [CharClass.Percent]: State.Unit,
    },

    [State.Fraction]: {
        [CharClass.Digit]: State.Fraction,
        [CharClass.Letter]: State.Unit,
        [CharClass.Percent]: State.Unit,
    },

    [State.Unit]: {
        [CharClass.Letter]: State.Unit,
    },

    [State.Ident]: {
        [CharClass.Letter]: State.Ident,
        [CharClass.Digit]: State.Ident,
    },

    [State.Hex]: {
        [CharClass.Digit]: State.Hex,
        [CharClass.Letter]: State.Hex,
    },
};

/* ============================================================
 * Accepting States
 * ============================================================ */

const Accepting: Partial<Record<State, TokenType>> = {
    [State.Whitespace]: TokenType.WHITESPACE,
    [State.Integer]: TokenType.NUMBER,
    [State.Fraction]: TokenType.NUMBER,
    [State.Unit]: TokenType.DIMENSION,
    [State.Ident]: TokenType.IDENT,
    [State.Hex]: TokenType.HEXCOLOR,
};

/* ============================================================
 * DFA Tokenizer
 * ============================================================ */

export default class DFATokenizer {
    private index = 0;
    private line = 1;
    private column = 1;

    constructor(private readonly source: string) { }

    tokenize(): Token[] {
        const tokens: Token[] = [];

        while (!this.isEof()) {
            const startPos = this.position();
            let state = State.Start;

            while (true) {
                const ch = this.current();
                const cls = classify(ch);
                const next: State | undefined = T[state]?.[cls];
                if (next === undefined) break;

                state = next;
                this.consume();
            }

            /* Single-character tokens */
            if (state === State.Start) {
                tokens.push(this.singleCharToken());
                continue;
            }

            const type = Accepting[state];
            if (!type) {
                throw new DiagnosticError(
                    'Invalid token',
                    this.source,
                    startPos,
                    this.position(),
                    'Check CSS color syntax near this location'
                );
            }

            let value = this.source.slice(startPos.index, this.index);

            /* Percent */
            if (value.endsWith('%')) {
                tokens.push({
                    type: TokenType.PERCENT,
                    value: value.slice(0, -1),
                    start: startPos,
                    end: this.position(),
                });
                continue;
            }

            /* IDENT vs FUNCTION */
            if (type === TokenType.IDENT && this.current() === '(') {
                tokens.push({
                    type: TokenType.FUNCTION,
                    value,
                    start: startPos,
                    end: this.position(),
                });
                continue;
            }

            tokens.push({
                type,
                value,
                start: startPos,
                end: this.position(),
            });
        }

        const eofPos = this.position();
        tokens.push({
            type: TokenType.EOF,
            value: '',
            start: eofPos,
            end: eofPos,
        });

        return tokens;
    }

    /* ============================================================
     * Helpers
     * ============================================================ */

    private singleCharToken(): Token {
        const start = this.position();
        const ch = this.consume();

        const map: Record<string, TokenType> = {
            '(': TokenType.LPAREN,
            ')': TokenType.RPAREN,
            ',': TokenType.COMMA,
            '/': TokenType.SLASH,
        };

        const type = map[ch];
        if (!type) {
            throw new DiagnosticError(
                `Unexpected character '${ch}'`,
                this.source,
                start,
                this.position(),
                'Only valid CSS color tokens are allowed here'
            );
        }

        return {
            type,
            value: ch,
            start,
            end: this.position(),
        };
    }

    private consume(): string {
        const ch = this.source[this.index++] ?? '';

        if (ch === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }

        return ch;
    }

    private current(): string {
        return this.index >= this.source.length
            ? ''
            : this.source[this.index]!;
    }

    private position(): Position {
        return {
            index: this.index,
            line: this.line,
            column: this.column,
        };
    }

    private isEof(): boolean {
        return this.index >= this.source.length;
    }
}

export function formatDiagnostic(err: DiagnosticError): string {
    const lines = err.source.split(/\r?\n/);
    const line = lines[err.start.line - 1] ?? '';

    const startCol = err.start.column - 1;
    const width = Math.max(
        1,
        err.end.index - err.start.index
    );

    const caret =
        ' '.repeat(startCol) + '^'.repeat(width);

    const location =
        `line ${err.start.line}, column ${err.start.column}`;

    return [
        `${err.message} (${location})`,
        '',
        line,
        caret,
        err.hint ? `\nHint: ${err.hint}` : '',
    ].join('\n');
}
