export enum TokenType {
    HEXCOLOR,
    FUNCTION,
    IDENT,
    NUMBER,
    PERCENT,
    DIMENSION,   // angle units
    COMMA,
    SLASH,
    LPAREN,
    RPAREN,
    WHITESPACE,
    EOF
}

export enum CharClass {
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
    Other
}

export const classify = (ch: string): CharClass => {
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
};

export enum State {
    Start,

    // Whitespace
    Whitespace,

    // Numbers
    Sign,
    Integer,
    Fraction,

    // Identifiers / functions
    Ident,

    // Dimensions
    Unit,

    // Hex
    Hex,

    Done,
    Error
}

export const T: Record<State, Partial<Record<CharClass, State>>> = {
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
        [CharClass.Percent]: State.Done,
    },

    [State.Fraction]: {
        [CharClass.Digit]: State.Fraction,
        [CharClass.Letter]: State.Unit,
        [CharClass.Percent]: State.Done,
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

export const Accepting: Partial<Record<State, TokenType>> = {
    [State.Whitespace]: TokenType.WHITESPACE,
    [State.Integer]: TokenType.NUMBER,
    [State.Fraction]: TokenType.NUMBER,
    [State.Unit]: TokenType.DIMENSION,
    [State.Ident]: TokenType.IDENT,
    [State.Hex]: TokenType.HEXCOLOR,
};

interface Token {
    type: TokenType,
    value: string,
    start: number,
    end: number,
}

export default class Tokenizer {
    private readonly source: string = '';
    private cursor: number = 0;
    public tokens: Token[] = [];

    constructor(input: string) {
        this.source = input;
    }

    public tokenize(): Token[] {
        const tokens: Token[] = [];

        while (!this.isEof()) {
            let state = State.Start;
            const start = this.cursor;

            while (true) {
                const ch = this.current();
                const cls = classify(ch);
                const next = T[state]?.[cls];

                if (next === undefined) break;

                state = next;
                this.consume();
            }

            // Single-char tokens
            if (state === State.Start) {
                tokens.push(this.singleCharToken());
                continue;
            }

            const type = Accepting[state];
            if (!type) {
                throw new SyntaxError(`Unexpected '${this.current()}'`);
            }

            let value = this.source.slice(start, this.cursor);

            // IDENT vs FUNCTION
            if (type === TokenType.IDENT && this.current() === '(') {
                tokens.push({ type: TokenType.FUNCTION, value, start, end: this.cursor });
                continue;
            }

            tokens.push({ type, value, start, end: this.cursor });
        }

        tokens.push({ type: TokenType.EOF, value: '', start: this.cursor, end: this.cursor });
        return tokens;
    }


    private Whitespace(): Token {
        const start = this.cursor;
        while (TokenSpec.isWhitespace(this.current())) this.consume();
        return {
            type: TokenType.WHITESPACE,
            value: "<whitespace>",
            start,
            end: this.cursor
        };
    }

    private HexColor(): Token {
        const start = this.consume();

        while (TokenSpec.isHexDigit(this.current())) this.consume();
        const hexColor = this.source.slice(start, this.cursor);

        switch (hexColor.length) {
            case 4: // #fff
            case 5: // #ffff
            case 7: // #ffffff
            case 9: // #ffffffff
                return {
                    type: TokenType.HEXCOLOR,
                    value: hexColor,
                    start,
                    end: this.cursor
                };
            default:
                throw new SyntaxError(`HexColor, invalid length: ${hexColor.length}.`)
        }
    }

    private NumberLike(): Token {
        const start = this.cursor;

        // Check if sign is followed by digit or dot
        if (TokenSpec.isOperator(this.current())) {

            const nextChar = this.lookahead();

            if (TokenSpec.isDigit(nextChar) || TokenSpec.isDecimal(nextChar)) {
                this.consume();
            }
        }

        // Collect all digits
        while (TokenSpec.isDigit(this.current())) this.consume();
        if (TokenSpec.isDecimal(this.current())) {
            this.consume();
            while (TokenSpec.isDigit(this.current())) this.consume();
        }

        const number = this.source.slice(start, this.cursor);

        // TokenType.PERCENT
        if (TokenSpec.isPercent(this.current())) {
            this.consume();
            return {
                type: TokenType.PERCENT,
                value: number,
                unit: "%",
                start,
                end: this.cursor
            };
        }

        // TokenType.DIMENSION
        if (TokenSpec.isDimensionStart(this.current())) {
            const unitStart = this.cursor;
            while (TokenSpec.isIdentifierChar(this.current())) this.consume();
            return {
                type: TokenType.DIMENSION,
                value: number,
                unit: this.source.slice(unitStart, this.cursor),
                start,
                end: this.cursor
            };
        }

        // TokenType.NUMBER
        return {
            type: TokenType.NUMBER,
            value: number,
            start,
            end: this.cursor
        };
    }

    private IdentifierOrFunction(): Token {
        const start = this.cursor;
        while (TokenSpec.isIdentifierChar(this.current())) this.consume();

        const value = this.source.slice(start, this.cursor);

        if (this.current() === "(") {
            return {
                type: TokenType.FUNCTION,
                value,
                start,
                end: this.cursor
            };
        }

        return {
            type: TokenType.IDENTIFIER,
            value,
            start,
            end: this.cursor
        };
    }

    private Operator(): Token {
        const start = this.consume();

        const char = this.source[start]

        if (!char) {
            throw new SyntaxError(`Unexpected character '${char}' at ${start}`)
        }

        const typeMap = {
            "(": TokenType.LPAREN,
            ")": TokenType.RPAREN,
            ",": TokenType.COMMA,
            "/": TokenType.SLASH,
            "+": TokenType.PLUS,
            "-": TokenType.MINUS,
            "*": TokenType.STAR
        } as const;

        if (!(char in typeMap)) {
            throw new SyntaxError(`Unexpected character '${char}' at ${start}`);
        }

        const type: TokenType = typeMap[char as keyof typeof typeMap];

        return {
            type,
            value: char,
            start,
            end: this.cursor
        };
    }

    public *[Symbol.iterator](): Iterator<Token> {
        for (const token of this.tokens) {
            yield token;
        }
    }

    public toString(): string {
        let result = ``;
        for (const token of this.tokens) {
            result += `${token}\n`;
        }
        return result;
    }

    public consume(): number {
        return this.cursor++;
    }

    public current(): string {
        const index = this.cursor;
        if (index >= this.source.length) return '';
        return this.source[index]!;
    }

    public lookahead(offset: number = 1): string {
        const index = this.cursor + offset;
        if (index >= this.source.length) return '';
        return this.source[index]!;
    }

    public lookbehind(offset: number = 1): string {
        const index = this.cursor - offset;
        if (index < 0) return '';
        return this.source[index]!;
    }

    private isEof(): boolean {
        return this.cursor >= this.source.length;
    }
} // End class Tokenizer
