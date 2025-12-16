// src/DfaTokenizer.ts

/* ============================================================
 * Token Types
 * ============================================================ */

/*
// /src/types/Tokenizer.d.ts

declare enum TokenType {
    FUNCTION = 'FUNCTION',
    NAMEDCOLOR = 'NAMEDCOLOR',
    KEYWORD = 'KEYWORD',
    IDENTIFIER = 'IDENTIFIER',
    HEXVALUE = 'HEXVALUE',
    NUMBER = 'NUMBER',
    PERCENT = 'PERCENT',
    ANGLE = 'ANGLE',
    COMMA = 'COMMA',
    SLASH = 'SLASH',
    LPAREN = 'LPAREN',
    RPAREN = 'RPAREN',
    DELIMITER = 'DELIMITER',
    WHITESPACE = 'WHITESPACE',
    CHAR = 'CHAR',
    EOF = '<end>'
}

type TokenNode<T extends TokenType> = { type: T; }

interface TokenValueNode<T extends TokenType> extends TokenNode<T> {
    value: string;
}

interface StartEndNode<T extends TokenType> extends TokenNode<T>, TokenValueNode<T> {
    start: number;
    end: number;
}

type Token =
    | TokenNode<TokenType.WHITESPACE>
    | StartEndNode<TokenType.FUNCTION>
    | StartEndNode<TokenType.NAMEDCOLOR>
    | StartEndNode<TokenType.KEYWORD>
    | StartEndNode<TokenType.LPAREN>
    | StartEndNode<TokenType.RPAREN>
    | StartEndNode<TokenType.COMMA>
    | StartEndNode<TokenType.SLASH>
    | StartEndNode<TokenType.ANGLE>
    | StartEndNode<TokenType.PERCENT>
    | StartEndNode<TokenType.NUMBER>
    | StartEndNode<TokenType.HEXVALUE>
    | StartEndNode<TokenType.DELIMITER>
    | StartEndNode<TokenType.CHAR>
    | StartEndNode<TokenType.IDENTIFIER>
    | TokenValueNode<TokenType.EOF>

type TokenSpecTuple = [TokenType, RegExp];
type TokenSpec = TokenSpecTuple[];
//*/

export enum TokenType {
    // String and Numeric Literals
    IDENTIFIER = 'IDENTIFIER',  // words
    STRING = 'STRING',          // string literals
    HEXVALUE = 'HEXVALUE',      // hexadecimal values
    NUMBER = 'NUMBER',          // numeric literals
    PERCENT = 'PERCENT',        // numeric literals followed by '%'
    DIMENSION = 'DIMENSION',    // numeric literals followed by units

    // Operator Tokens
    PLUS = 'PLUS',              // '+'
    MINUS = 'MINUS',            // '-'
    STAR = 'STAR',              // '*'

    // Delimiter Tokens
    COMMA = 'COMMA',            // ','
    SLASH = 'SLASH',            // '/'
    LPAREN = 'LPAREN',          // '('
    RPAREN = 'RPAREN',          // ')'
    DELIMITER = 'DELIMITER',    // all other delimiters, puntuators, operators

    // Possibly ignored Tokens
    WHITESPACE = 'WHITESPACE',  // all whitespace
    EOF = '<end>',              // end of file/line
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
 * Character Classes
 * ============================================================ */

enum CharClass {
    Digit,
    Dot,
    Quote,
    Plus,
    Minus,
    Hash,
    Letter,
    Percent,
    LParen,
    RParen,
    Comma,
    Slash,
    Operator,
    Whitespace,
    EOF,
    Invalid,
    Other,
}

// Store regex literals outside the function.
// This ensures they are created only once.
const IS_DIGIT = /\d/;
const IS_LETTER = /[a-zA-Z]/;
const IS_WHITESPACE = /\s/;

const classify = (ch: string | null | undefined): CharClass => {
    if (ch === null || ch === undefined) {
        return CharClass.Invalid;
    }

    switch (ch) {
        case '': return CharClass.EOF;
        case '.': return CharClass.Dot;
        case "'": return CharClass.Quote;
        case '"': return CharClass.Quote;
        case '+': return CharClass.Plus;
        case '-': return CharClass.Minus;
        case '#': return CharClass.Hash;
        case '%': return CharClass.Percent;
        case '(': return CharClass.LParen;
        case ')': return CharClass.RParen;
        case ',': return CharClass.Comma;
        case '/': return CharClass.Slash;
        case '*': return CharClass.Operator;
    }

    // Handle character classes after the simple switches
    if (IS_DIGIT.test(ch)) return CharClass.Digit;
    if (IS_LETTER.test(ch)) return CharClass.Letter;
    if (IS_WHITESPACE.test(ch)) return CharClass.Whitespace;

    return CharClass.Other;
}

/* ============================================================
 * DFA States
 * ============================================================ */

enum State {
    Start = '<start>',
    Whitespace = '<whitespace>',
    Sign = '<sign>',
    Integer = '<integer>',
    Fraction = '<fraction>',
    Dimension = '<dimension>',
    Identifier = '<identifier>',
    Hex = '<hex-value>',
    ExponentStart = '<exponent-start>',
    Exponent = '<exponent>',
    Percent = '<percent>',
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
        [CharClass.Letter]: State.Identifier,
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
        [CharClass.Percent]: State.Percent,
        [CharClass.Letter]: State.Dimension,
    },

    [State.Fraction]: {
        [CharClass.Digit]: State.Fraction,
        [CharClass.Percent]: State.Percent,
        [CharClass.Letter]: State.Dimension,
    },

    [State.Percent]: {},

    /*  HANDLING EXPONENTS
        // Inside your main tokenizer loop, when you are in State.Integer or State.Fraction...
        // And the next character's class is CharClass.Letter...

        if (currentChar === 'e' || currentChar === 'E') {
            // If the letter is 'e' or 'E', MANUALLY transition to the ExponentStart state
            currentState = State.ExponentStart;
        } else {
            // For any other letter, use the DFA table's transition to Dimension
            currentState = T[currentState][CharClass.Letter]; // This will go to State.Dimension
        }
    */
    [State.ExponentStart]: {
        [CharClass.Plus]: State.Exponent,
        [CharClass.Minus]: State.Exponent,
        [CharClass.Digit]: State.Exponent,
    },

    [State.Exponent]: {
        [CharClass.Digit]: State.Exponent,
    },

    [State.Dimension]: {
        [CharClass.Letter]: State.Dimension,
    },

    [State.Identifier]: {
        [CharClass.Letter]: State.Identifier,
        [CharClass.Digit]: State.Identifier,
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
    [State.Exponent]: TokenType.NUMBER,
    [State.Dimension]: TokenType.DIMENSION,
    [State.Identifier]: TokenType.IDENTIFIER,
    [State.Hex]: TokenType.HEXVALUE,
    [State.Percent]: TokenType.PERCENT,
};

/* ============================================================
 * DFA Tokenizer
 * ============================================================ */
/**
 * The core of the DFA is a loop that iterates through the input 
 * string character by character, transitioning between states 
 * based on the current character. The "longest match" rule is 
 * crucial: the DFA should continue consuming characters as long 
 * as it can form a valid token, and only emit the token when no 
 * further valid transitions are possible. 
 */
export default class Tokenizer {
    private readonly source: string;
    private index = 0;
    private line = 1;
    private column = 1;
    private readonly _tokens: Token[] = [];

    constructor(input: string) {
        this.source = input ?? '';
        if (this.source.length > 0) this.tokenize();
    }

    // Public accessor method to the tokenized tokens
    public get tokens(): Token[] {
        return this._tokens;
    }

    /* ============================================================
     * TOKENIZE()
     * ============================================================ */
    public tokenize(): void {

        try {
            // Read entire input string
            while (!this.isEof()) {

                // STRING LITERALS
                if (this.StringLiterals()) continue;

                const startPosition = this.position();
                let state = State.Start;

                // DETERMINISTIC FINITE AUTOMATA (DFA) LOOP
                while (true) {
                    const innerChar = this.current();
                    const innerCharClass = classify(innerChar);

                    // NUMERIC LITERALS
                    state = this.NumericLiterals(state, innerChar, innerCharClass);

                    const nextState = T[state]?.[innerCharClass];
                    if (nextState === undefined) break;

                    state = nextState;
                    this.consume();
                }

                const endPosition = this.position();
                const tokenValue = this.source.slice(startPosition.index, endPosition.index);

                switch (state) {
                    // START
                    case State.Start:
                        // DELIMITERS
                        if (!this.isEof()) this.Delimiters();
                        break;

                    // WHITESPACE
                    case State.Whitespace:
                        // If we later want to ignore Whitespace...we just continue.
                        // continue;

                        this.createToken(
                            TokenType.WHITESPACE,
                            tokenValue,
                            startPosition,
                            endPosition,
                        );
                        break;

                    // PERCENT
                    case State.Percent:
                        // The DFA has confirmed this is a percentage.
                        this.createToken(
                            TokenType.PERCENT,
                            tokenValue.slice(0, -1),
                            startPosition,
                            endPosition,
                        );
                        break;

                    // 'ACCEPTING' MAP TOKEN
                    case State.Identifier:
                    case State.Hex:
                    case State.Integer:
                    case State.Fraction:
                    case State.Exponent:
                    case State.Dimension:
                        const type = Accepting[state];
                        if (!type) {
                            throw new DiagnosticError(
                                'Invalid token state', this.source, startPosition, endPosition,
                                'The tokenizer entered a state that is not a valid accepting state.'
                            );
                        }
                        this.createToken(
                            type,
                            tokenValue,
                            startPosition,
                            endPosition
                        );
                        break;

                    // INVALID TOKEN
                    default:
                        throw new DiagnosticError(
                            'Invalid token', this.source, startPosition, endPosition,
                            'Check the CSS color syntax at this location'
                        );
                }
            }

            // EOF TOKEN
            const eofPosition = this.position();
            this.createToken(
                TokenType.EOF,
                '<end>',
                eofPosition,
                eofPosition,
            );

            // ERROR PROCESSING TOKEN
        } catch (error) {
            if (error instanceof DiagnosticError) {
                console.error(formatDiagnostic(error));
            } else {
                throw error;
            }
        }
    }

    /* ============================================================
     * Utility Methods
     * ============================================================ */

    /**
     * A factory method to create a new Token object.
     */
    private createToken(type: TokenType, value: string, start: Position, end: Position): void {
        this._tokens.push({ type, value, start, end });
    }

    private Delimiters(): void {
        const start = this.position();
        const char = this.consume();

        const specificTokens: Record<string, TokenType> = {
            '(': TokenType.LPAREN,
            ')': TokenType.RPAREN,
            ',': TokenType.COMMA,
            '/': TokenType.SLASH,
            '+': TokenType.PLUS,
            '-': TokenType.MINUS,
            '*': TokenType.STAR,
        };

        let type = specificTokens[char];

        if (!type) {
            type = TokenType.DELIMITER;
        }

        return this.createToken(type, char, start, this.position());
    }

    private NumericLiterals(state: State, char: string, charClass: CharClass): State {
        const specialState = this.handleNumericLiteral(state, char, charClass);
        if (specialState) {
            this.consume();
            return specialState;
        }
        return state;
    }

    /**
     * Handles complex state transitions that can't be purely defined
     * in the DFA table, like distinguishing 'e' (exponent) from
     * other letters (dimension units).
     * @returns The next state to transition to.
     */
    private handleNumericLiteral(
        currentState: State,
        char: string,
        charClass: CharClass
    ): State | null {

        // 1. Check state
        if (currentState === State.Integer || currentState === State.Fraction) {
            // 2. Is there a letter?
            if (charClass === CharClass.Letter) {
                // 3. Is the letter an 'e' or 'E'?
                if (char === 'e' || char === 'E') {
                    // 4. It's an exponent
                    return State.ExponentStart;
                }
                // 5. It's a dimension unit (e.g., 'deg' or 'rad')
                return State.Dimension;
            }
        }
        // 6. No special handling needed, use the DFA table
        return null;
    }

    private StringLiterals(): boolean {
        const outerChar = this.current();
        const outerCharClass = classify(outerChar);
        if (outerCharClass === CharClass.Quote) {
            this.handleStringLiteral();
            return true;
        }
        return false;
    }

    /**
     * Consumes a string literal token from the source.
     * Handles matching quotes, escape sequences, and unterminated strings.
     */
    private handleStringLiteral(): void {
        const startPos = this.position();
        const quoteChar = this.consume();
        let value = '';

        while (!this.isEof()) {
            const char = this.current();

            // 1. Check for closing quote
            if (char === quoteChar) {
                this.consume(); // Consume the closing quote
                this.createToken(TokenType.STRING, value, startPos, this.position());
                return;
            }

            // 2. Handle escape sequences
            if (char === '\\\\') {
                this.consume(); // Consume the backslash
                const escapedChar = this.consume();
                value += escapedChar;
                continue;
            }

            // 3. Add any other character to the string value
            value += this.consume();
        }

        // This error is now correctly thrown only if the loop finishes
        // because the end of the file was reached.
        throw new DiagnosticError(
            'Unterminated string literal',
            this.source,
            startPos,
            this.position(),
            `A string that starts with ${quoteChar} must be closed with a matching ${quoteChar}.`
        );
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

/* ============================================================
 * Tokenizer Errors
 * ============================================================ */

export class DiagnosticError extends Error {
    constructor(
        message: string,
        public readonly source: string,
        public readonly start?: Position,
        public readonly end?: Position,
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

export const formatDiagnostic = (err: DiagnosticError): string => {
    const pos = {
        start: {
            index: err.start?.index ?? 0,
            line: err.start?.line ?? 0,
            column: err.start?.column ?? 0,
        },
        end: {
            index: err.end?.index ?? 0,
            line: err.end?.line ?? 0,
            column: err.end?.column ?? 0,
        }
    }
    const lines = err.source.split(/\r?\n/);
    const line = lines[pos.start.line - 1] ?? '';
    const startCol = pos.start.column - 1;
    const width = Math.max(1, pos.end.index - pos.start.index);

    const caret =
        ' '.repeat(startCol) + '^'.repeat(width);

    const location =
        `line ${pos.start.line}, column ${pos.start.column}`;

    return [
        `${err.message} (${location})`,
        '',
        line,
        caret,
        err.hint ? `\nHint: ${err.hint}` : '',
    ].join('\n');
}