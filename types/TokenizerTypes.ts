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

export interface ITokenizer {
    tokens: Token[];
    tokenize(): Token[];
    [Symbol.iterator](): Iterator<Token>;
    toString(): string;
    consume(): string;
    current(): string;
    lookahead(offset?: number): string;
    lookbehind(offset?: number): string | null;
}