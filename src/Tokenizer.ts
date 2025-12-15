/// <reference types='../types/Tokenizer.d.ts' />
// src/Tokenizer.ts

enum TokenType {
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

export class Tokenizer {
    private readonly source: string = '';
    private cursor: number = 0;
    public tokens: Token[] = [];

    constructor(input: string) {
        this.source = input;
    }

    public tokenize(): Token[] {
        while (!this.spec.isEof()) {
            const char = this.current();

            if (this.spec.isWhitespace(char)) {
                this.tokens.push(this.Whitespace());
                continue;
            }

            if (this.spec.isHash(char)) {
                this.tokens.push(this.HexColor());
                continue;
            }

            if (
                this.spec.isDigit(char) ||
                this.spec.isSign(char) ||
                char === "."
            ) {
                this.tokens.push(this.NumberLike());
                continue;
            }

            if (this.spec.isIdentifierStart(char)) {
                this.tokens.push(this.IdentifierOrFunction());
                continue;
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
        while (this.spec.isWhitespace(this.current())) this.consume();
        return {
            type: TokenType.WHITESPACE,
            value: "<whitespace>",
            start: start,
            end: this.cursor
        };
    }

    private HexColor(): Token {
        const start = this.cursor++;

        while (this.spec.isHexDigit(this.current())) this.consume();
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

        // Position or Negative Number
        if (this.spec.isSign(this.current())) this.consume();

        // Collect all digits
        while (this.spec.isDigit(this.current())) this.consume();
        if (this.current() === ".") {
            this.consume();
            while (this.spec.isDigit(this.current())) this.consume();
        }
        const number = this.source.slice(start, this.cursor);

        // TokenType.PERCENT
        if (this.current() === "%") {
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
        if (this.spec.isDimensionStart(this.current())) {
            const unitStart = this.cursor;
            while (this.spec.isIdentifierChar(this.current())) this.consume();
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
        const start = this.cursor
        while (this.spec.isIdentifierChar(this.current())) this.cursor++
        const value = this.source.slice(start, this.cursor)

        if (this.current() === "(") {
            return { type: TokenType.FUNCTION, value, start, end: this.cursor }
        }

        return { type: TokenType.IDENTIFIER, value, start, end: this.cursor }
    }

    private Operator(): Token {
        const start = this.cursor++
        const char = this.source[start]

        if (!char) {
            throw new SyntaxError(`Unexpected character '${char}' at ${start}`)
        }

        const typeMap: Record<string, TokenType> = {
            "(": TokenType.LPAREN,
            ")": TokenType.RPAREN,
            ",": TokenType.COMMA,
            "/": TokenType.SLASH,
            "+": TokenType.PLUS,
            "-": TokenType.MINUS,
            "*": TokenType.STAR
        }

        const type = typeMap[char]
        if (!type) {
            throw new SyntaxError(`Unexpected character '${char}' at ${start}`)
        }

        return { type, value: char, start, end: this.cursor }
    }

    public *[Symbol.iterator](): Iterator<Token> {
        for (const token of this.tokens) {
            yield token;
        }
    }

    public toString(): string {
        return this.tokens
            .map(token => `Token ${JSON.stringify(token)}`)
            .join('\n');
    }

    public consume(): string {
        const char = this.current();
        this.cursor++;
        return char;
    }

    public current(): string {
        return (this.cursor <= this.source.length)
            ? this.source[this.cursor] ?? ''
            : this.source[this.source.length - 1] ?? '';
    }

    public lookahead(offset: number = 1): string {
        const index = this.cursor + offset;
        return (index <= this.source.length)
            ? this.source[index] ?? ''
            : this.source[this.source.length - 1] ?? '';
    }

    public lookbehind(offset: number = 1): string | null {
        const index = this.cursor - offset;
        if (index < 0) {
            return null;
        }
        return this.source[index] ?? '';
    }

    private spec = {
        isEof: () => this.cursor >= this.source.length,
        isWhitespace: (char: string) => char === " " || char === "\t" || char === "\n",
        isDigit: (char: string) => char >= "0" && char <= "9",
        isHash: (char: string) => char === '#',
        isHexDigit: (char: string) => /[0-9a-fA-F]/.test(char),
        isIdentifierStart: (char: string) => /[a-zA-Z_-]/.test(char),
        isIdentifierChar: (char: string) => /[a-zA-Z0-9_-]/.test(char),
        isSign: (char: string) => char === "+" || char === "-",
        isDimensionStart: (char: string) => /[a-zA-Z]/.test(char),
    }
} // End class Tokenizer

export default Tokenizer;
