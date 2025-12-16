// src/Tokenizer.ts
// types/Tokenizer.d.ts

export const TokenSpec = {
    isWhitespace: (ch: string) => ch === ' ' || ch === '\t' || ch === '\n',
    isDigit: (ch: string) => ch >= '0' && ch <= '9',
    isHash: (ch: string) => ch === '#',
    isHexDigit: (ch: string) => /[0-9a-fA-F]/.test(ch),
    isIdentifierStart: (ch: string) => /[a-zA-Z_-]/.test(ch),
    isIdentifierChar: (ch: string) => /[a-zA-Z0-9_-]/.test(ch),
    isOperator: (ch: string) => ch === '+' || ch === '-',
    isDecimal: (ch: string) => ch === '.',
    isPercent: (ch: string) => ch === '%',
    isDimensionStart: (ch: string) => /[a-zA-Z]/.test(ch),
} as const;

export enum TokenType {
    // Structure
    LPAREN = 'LPAREN',
    RPAREN = 'RPAREN',
    COMMA = 'COMMA',
    SLASH = 'SLASH',
    WHITESPACE = 'WHITESPACE',

    // Literals
    NUMBER = 'NUMBER',
    PERCENT = 'PERCENT',
    DIMENSION = 'DIMENSION',    // deg | rad | grad | turn
    HEXCOLOR = 'HEXCOLOR',

    // Identifiers
    IDENTIFIER = 'IDENTIFIER',        // names, keywords, channels
    FUNCTION = 'FUNCTION',     // rgb, hsl, lab, color, etc.

    // Operators
    PLUS = 'PLUS',
    MINUS = 'MINUS',
    STAR = 'STAR',

    // End of File
    EOF = 'EOF',
}

interface BaseToken<T extends TokenType> {
    type: T;
}

interface ValueToken<T extends TokenType> extends BaseToken<T> {
    value: string;
}

interface PositionToken<T extends TokenType> extends ValueToken<T> {
    start: number;
    end: number;
}

interface DimensionToken<T extends TokenType> extends PositionToken<T> {
    unit: string;
}

export type Token =
    | PositionToken<TokenType.LPAREN>
    | PositionToken<TokenType.RPAREN>
    | PositionToken<TokenType.COMMA>
    | PositionToken<TokenType.SLASH>
    | PositionToken<TokenType.WHITESPACE>
    | PositionToken<TokenType.NUMBER>
    | DimensionToken<TokenType.PERCENT>
    | DimensionToken<TokenType.DIMENSION>
    | PositionToken<TokenType.HEXCOLOR>
    | PositionToken<TokenType.IDENTIFIER>
    | PositionToken<TokenType.FUNCTION>
    | PositionToken<TokenType.PLUS>
    | PositionToken<TokenType.MINUS>
    | PositionToken<TokenType.STAR>
    | PositionToken<TokenType.EOF>

export default class Tokenizer {
    private readonly source: string = '';
    private cursor: number = 0;
    public tokens: Token[] = [];

    constructor(input: string) {
        this.source = input;
    }

    public tokenize(): Token[] {
        const startCursor = this.cursor;

        while (!this.isEof()) {
            const char = this.current();

            if (TokenSpec.isWhitespace(char)) {
                this.tokens.push(this.Whitespace());
                continue;
            }

            if (TokenSpec.isHash(char)) {
                this.tokens.push(this.HexColor());
                continue;
            }

            if (
                TokenSpec.isDigit(char) ||
                TokenSpec.isOperator(char) ||
                TokenSpec.isDecimal(char)
            ) {
                this.tokens.push(this.NumberLike());
                continue;
            }

            if (TokenSpec.isIdentifierStart(char)) {
                this.tokens.push(this.IdentifierOrFunction());
                continue;
            }

            if (this.cursor === startCursor) {
                throw new Error(`Tokenizer did not advance at position ${this.cursor}`);
            }

            this.tokens.push(this.Operator());
        }
        this.tokens.push({
            type: TokenType.EOF,
            value: "<end>",
            start: this.cursor,
            end: this.cursor
        });

        return this.tokens;
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
