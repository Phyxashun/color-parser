// src/Tokenizer.ts

import { TokenType, type Token } from '../types/TokenizerTypes';
import { ListNode, LinkedList } from './LinkedList';

export class Tokenizer {
    private readonly source: string = '';
    private cursor: number = 0;
    public tokens: LinkedList;

    constructor(input: string) {
        this.source = input;
        this.tokens = new LinkedList();
    }

    public tokenize(): LinkedList {
        while (!this.isEof()) {
            const char = this.current();

            if (this.spec.isWhitespace(char)) {
                this.tokens.append(this.Whitespace());
                continue;
            }

            if (this.spec.isHash(char)) {
                this.tokens.append(this.HexColor());
                continue;
            }

            if (
                this.spec.isDigit(char) ||
                this.spec.isSign(char) ||
                this.spec.isDot(char)
            ) {
                this.tokens.append(this.NumberLike());
                continue;
            }

            if (this.spec.isIdentifierStart(char)) {
                this.tokens.append(this.IdentifierOrFunction());
                continue;
            }

            this.tokens.append(this.Operator());
        }

        this.tokens.append({
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

        const typeMap = {
            "(": TokenType.LPAREN,
            ")": TokenType.RPAREN,
            ",": TokenType.COMMA,
            "/": TokenType.SLASH,
            "+": TokenType.PLUS,
            "-": TokenType.MINUS,
            "*": TokenType.STAR
        } as const;

        type OperatorChar = keyof typeof typeMap;

        if (!(char in typeMap)) {
            throw new SyntaxError(`Unexpected character '${char}' at ${start}`);
        }

        const type: TokenType = typeMap[char as OperatorChar];

        return {
            type,
            value: char,
            start,
            end: this.cursor
        };
    }

    public *[Symbol.iterator](): Iterator<ListNode> {
        for (const listNode of this.tokens) {
            yield listNode;
        }
    }

    public toString(): string {
        let result = ``;
        for (const listNode of this.tokens) {
            result += JSON.stringify(listNode, null, 2);
            result += `\n`;
        }
        return result;
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

    private isEof(): boolean {
        return this.cursor >= this.source.length;
    }

    private spec = {
        isWhitespace: (char: string) => char === " " || char === "\t" || char === "\n",
        isDigit: (char: string) => char >= "0" && char <= "9",
        isHash: (char: string) => char === '#',
        isHexDigit: (char: string) => /[0-9a-fA-F]/.test(char),
        isIdentifierStart: (char: string) => /[a-zA-Z_-]/.test(char),
        isIdentifierChar: (char: string) => /[a-zA-Z0-9_-]/.test(char),
        isSign: (char: string) => char === "+" || char === "-",
        isDot: (char: string) => char === ".",
        isDimensionStart: (char: string) => /[a-zA-Z]/.test(char),
    }
} // End class Tokenizer

export default Tokenizer;
