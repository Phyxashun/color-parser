// types/Tokenizer.d.ts

declare enum TokenType {
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

type Token =
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
    | PositionToken<TokenType.START>
    | ValueToken<TokenType.EOF>