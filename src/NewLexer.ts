
import { Tree } from './PrettyTree.ts';
import { RESET, RED, YELLOW, GREEN, BLUE, BOLD } from './AnsiCodes.ts';

/**
 * Deterministic Finite Automaton
 * 
 * M = ( Q, Σ (Sigma), δ (delta), q0, F)
 * 
 * Symbol           Meaning                             Set Example
 *  Q               All possible states                 { q0, q1, q2 }
 *  Σ               Allowed characters                  { '0', '1' }
 *  δ               Rules for moving between states     Transition table
 *  q0              Where we start                      q0
 *  F               Accepting states                    { q2 }
 * 
 */
interface Token {
    type: TokenType;
    value: string;
}

interface Position {
    index: number;
    line: number;
    column: number;
}

type TokenType = typeof TokenType[keyof typeof TokenType];
type CharClass = typeof CharClass[keyof typeof CharClass];
type CharClassFn = (char: string) => boolean;
type State = typeof State[keyof typeof State];
type StateType<T extends string> = { [K in T]: `<${Lowercase<K>}>`; }; // QType
type CharClassType = [CharClass, CharClassFn][] // SigmaType
type TransitionType = Record<State, Partial<Record<CharClass, State>>>; // DeltaType
type AcceptingType = Partial<Record<State, TokenType>>; // Ftype

// Terminals used in accepting states
const TokenType = {
    // String and Numeric Literals
    IDENTIFIER: 'IDENTIFIER',  // words
    STRING: 'STRING',          // string literals
    HEXVALUE: 'HEXVALUE',      // hexadecimal values
    NUMBER: 'NUMBER',          // numeric literals
    PERCENT: 'PERCENT',        // numeric literals followed by '%'
    DIMENSION: 'DIMENSION',    // numeric literals followed by units

    // Operator Tokens
    PLUS: 'PLUS',              // '+'
    MINUS: 'MINUS',            // '-'
    STAR: 'STAR',              // '*'

    // Delimiter Tokens
    COMMA: 'COMMA',            // ','
    SLASH: 'SLASH',            // '/'
    LPAREN: 'LPAREN',          // '('
    RPAREN: 'RPAREN',          // ')'
    DELIMITER: 'DELIMITER',    // all other delimiters, puntuators, operators
    PUNCTUATOR: 'PUNCTUATOR',
    OPERATOR: 'OPERATOR',

    // Possibly ignored Tokens
    WHITESPACE: 'WHITESPACE',  // all whitespace
    EOF: '<end>',              // end of file/line
    ERROR: '<error>',          // token error
} as const;

// Σ (Sigma) - the set of allowed characters
const CharClass: {
    readonly Whitespace: "Whitespace";
    readonly Quote: "Quote";
    readonly Letter: "Letter";
    readonly Digit: "Digit";
    readonly Percent: "Percent";
    readonly Dot: "Dot";
    readonly LParen: "LParen";
    readonly RParen: "RParen";
    readonly Comma: "Comma";
    readonly Slash: "Slash";
    readonly Hash: "Hash";
    readonly Hex: "Hex";
    readonly Operator: "Operator";
    readonly Other: "Other";
    readonly EOF: "EOF";
} = {
    Whitespace: 'Whitespace',
    Quote: 'Quote',
    Letter: 'Letter',
    Digit: 'Digit',
    Percent: 'Percent',
    Dot: 'Dot',
    LParen: 'LParen',
    RParen: 'RParen',
    Comma: 'Comma',
    Slash: 'Slash',
    Hash: 'Hash',
    Hex: 'Hex',
    Operator: 'Operator',
    Other: 'Other',
    EOF: 'EOF',
} as const;

const hexRegex = /^(#?([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8}))$/i;

const CharSpec: CharClassType = [
    [CharClass.Whitespace, (char: string) => /\s/.test(char)],
    [CharClass.Letter, (char: string) => /[a-z]/i.test(char)],
    [CharClass.Digit, (char: string) => /\d/.test(char)],
    [CharClass.Quote, (char: string) => char === '\"' || char === "\'"],
    [CharClass.Percent, (char: string) => char === '%'],
    [CharClass.Dot, (char: string) => char === '.'],
    [CharClass.LParen, (char: string) => char === '('],
    [CharClass.RParen, (char: string) => char === ')'],
    [CharClass.Comma, (char: string) => char === ','],
    [CharClass.Slash, (char: string) => char === '/'],
    [CharClass.Hash, (char: string) => char === '#'],
    [CharClass.Hex, (char: string) => hexRegex.test(char)],
    [CharClass.Operator, (char: string) => {
        switch (char) {
            case "!": return true;
            case "+": return true;
            case "-": return true;
            case "\\": return true;
            case "'": return true;
            case '"': return true;
            case '*': return true;
            default: return false;
        }
    }],
    [CharClass.EOF, (char: string) => /$(?![\r\n])/.test(char)]
]

const classify = (char: string): CharClass => {
    for (const [charClass, charClassFn] of CharSpec) {
        if (charClassFn(char)) return charClass as CharClass;
    }
    return CharClass.Other;
}
// End of Σ (Sigma)

// Q - the set of all possible states
const State = {
    Start: '<start>',
    Whitespace: '<whitespace>',
    Identifier: '<identifier>',
    HexValue: '<hexvalue>',
    Integer: '<integer>',
    Float: '<float>',
    Delimiter: '<delimiter>',
    Operator: '<operator>',
    Error: '<error>',
} as const;


// End of Q

// δ (delta) - the set of rules for transitioning between states
const Transition: TransitionType = {
    [State.Start]: {
        [CharClass.Whitespace]: State.Whitespace,
        [CharClass.Hash]: State.HexValue,
        [CharClass.Letter]: State.Identifier,
        [CharClass.Digit]: State.Integer,
        [CharClass.LParen]: State.Delimiter,
        [CharClass.RParen]: State.Delimiter,
        [CharClass.Comma]: State.Delimiter,
        [CharClass.Operator]: State.Operator,
        [CharClass.Other]: State.Error,
    },

    [State.Whitespace]: {
        [CharClass.Whitespace]: State.Whitespace,
    },

    [State.HexValue]: {
        [CharClass.Hex]: State.HexValue || State.Error,
        [CharClass.Letter]: State.HexValue,
        [CharClass.Digit]: State.HexValue,
    },

    [State.Identifier]: {
        [CharClass.Letter]: State.Identifier,
    },

    [State.Integer]: {
        [CharClass.Digit]: State.Integer,
        [CharClass.Dot]: State.Float,
    },

    [State.Float]: {
        [CharClass.Digit]: State.Float,
    },

    [State.Delimiter]: {
        [CharClass.LParen]: State.Delimiter,
        [CharClass.RParen]: State.Delimiter,
        [CharClass.Comma]: State.Delimiter,
    },

    [State.Operator]: {
        [CharClass.Operator]: State.Operator,
    },

    [State.Error]: {
        [CharClass.Other]: State.Error,
    }
}
// End of // δ (delta)

// F - the set of accepting states
const Accepting: AcceptingType = {
    [State.Whitespace]: TokenType.WHITESPACE,
    [State.HexValue]: TokenType.HEXVALUE,
    [State.Identifier]: TokenType.IDENTIFIER,
    [State.Integer]: TokenType.NUMBER,
    [State.Float]: TokenType.NUMBER,
    [State.Delimiter]: TokenType.DELIMITER,
    [State.Operator]: TokenType.OPERATOR,
    [State.Error]: TokenType.ERROR,
}
// End of F

export default class Tokenizer {
    private readonly source: string;
    private debug: boolean = false;
    private index = 0;
    private line = 1;
    private column = 1;
    private readonly tokens: Token[] = [];

    constructor(input: string, debug?: boolean) {
        this.source = input ?? '';
        this.debug = debug ?? false;
    }

    public tokenize = (): Token[] => {
        const tokens: Token[] = [];

        console.log();
        console.log("index:", this.index);
        console.log("SOURCE.LENGTH:", this.source.length);

        while (!this.isEOF()) {
            let state: State = State.Start;
            const startPos: Position = this.position();

            while (true) {
                // 1. ? At the end of input, break
                if (this.isEOF()) break;

                // 2. Get the current character
                let char = this.source[this.index] as string;

                // 3. Get the class of the current character
                const charClass = classify(char);

                // 4. If undefined break
                if (charClass === undefined) break;

                // 5. Get the transition state based on the current character class
                const nextState: any = Transition[state]?.[charClass];

                // If not state, break
                if (nextState === undefined) break;

                // Advance to the next state
                state = nextState;

                // Advance the index
                this.index++;
            }

            const endPos: Position = this.position();
            let type: TokenType;
            const value: string = this.source.slice(startPos.index, endPos.index);

            switch (state) {

                case State.Start:
                    if (!this.isEOF()) continue;
                    break;

                case State.Whitespace:
                    // If we later want to ignore Whitespace...we just continue.
                    continue;

                case State.Operator:
                case State.Delimiter:
                case State.Identifier:
                case State.Integer:
                case State.Float:
                    type = Accepting[state]!;
                    tokens.push({
                        type,
                        value
                    });
                    break;

                case State.HexValue:
                    const match = value.match(hexRegex);
                    if (match) {
                        type = Accepting[state]!;
                        tokens.push({
                            type,
                            value: match[0],
                        });
                        break;
                    } else {
                        state = State.Error;
                        this.displayError(state, startPos.index, endPos.index, value);
                        continue;
                    }
                // INVALID TOKEN
                case State.Error:
                    state = State.Error;
                    break;
                default:
                    state = State.Error;
                    throw new DiagnosticError(
                        'Invalid token', this.source, startPos, endPos,
                        'Check the input string at this location.'
                    );
            }
        }

        tokens.push({ type: TokenType.EOF, value: '<end>' });

        for (const token of tokens) {
            this.tokens.push(token);
        }

        return tokens;
    }

    private isEOF = () => {
        return this.index >= this.source.length;
    }

    private position(): Position {
        return {
            index: this.index,
            line: this.line,
            column: this.column,
        };
    }

    private displayError(state: State, startPos: number, endPos: number, value: any) {
        if (!this.debug) return;
        const prefix = this.source.substring(0, startPos);
        const target = this.source.substring(startPos, endPos);
        const suffix = this.source.substring(endPos);
        const newSource = `${BLUE}${prefix}${YELLOW}${BOLD}${target}${RESET}${BLUE}${suffix}${RESET}`
        const pL = ' '.repeat(prefix.length);
        const tL = '~'.repeat(target.length);
        const sL = ' '.repeat(suffix.length);
        const marker = `${RESET}${pL}${RED}${BOLD}${tL}${RESET}${sL}`;

        const code = [{
            State: state,
            Error: `${RED}${BOLD}Invalid token${RESET}`,
            Token: value,
            Source: newSource,
            '': marker,
            StartPosition: startPos,
            EndPosition: endPos,
        }];

        console.log();
        console.log(Tree(code, "Tokenizer Error Log", "Detailed Information", undefined, true, false));
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


// SMALL TESTING
(() => {
    const createTokenTree = (tokens: Token[], rootLabel: string = 'Token Stream') => {
        return {
            label: rootLabel,
            nodes: tokens.map((token, index) => ({
                label: `Token [${index}] (${token.type})`,
                leaf: token
            }))
        };
    }

    // EXAMPLE:
    const debug = true;
    const input = 'price + 4.99 * 100! - (3 * 5) #ffff';

    const tokenizer: Tokenizer = new Tokenizer(input, debug);
    const tokens: Token[] = tokenizer.tokenize();

    console.log();
    console.log(Tree(tokens, 'Token Stream', 'Token', createTokenTree));
})();