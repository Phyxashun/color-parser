// src/Lexer.ts

import util from 'util';
import { Tree } from './PrettyTree.ts';
import { RESET, RED, YELLOW, GREEN, BLUE, BOLD, BrRED, BrYELLOW, CYAN, MAGENTA, WHITE, DOUBLEUNDERLINE, UNDERLINE, BrMAGENTA, BLINK, HIDDEN, BrGREEN } from './AnsiCodes.ts';
import { LexerError } from './Tokenizer.ts';

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
    UNICODE: 'UNICODE',        // unicode characters

    // Operator Tokens
    PLUS: 'PLUS',              // '+'
    MINUS: 'MINUS',            // '-'

    // Delimiter Tokens
    COMMA: 'COMMA',            // ','
    SLASH: 'SLASH',            // '/'
    LPAREN: 'LPAREN',          // '('
    RPAREN: 'RPAREN',          // ')'
    DELIMITER: 'DELIMITER',    // all other delimiters, puntuators
    OPERATOR: 'OPERATOR',

    // Possibly ignored Tokens
    WHITESPACE: 'WHITESPACE',  // all whitespace
    EOF: '<end>',              // end of file/line
    ERROR: '<error>',          // token error
} as const;

// Σ (Sigma) - the set of allowed characters
const CharClass: {
    readonly Whitespace: 'Whitespace';
    readonly Quote: 'Quote';
    readonly Letter: 'Letter';
    readonly Digit: 'Digit';
    readonly Exponent: 'Exponent'
    readonly Percent: 'Percent';
    readonly Dot: 'Dot';
    readonly LParen: 'LParen';
    readonly RParen: 'RParen';
    readonly Comma: 'Comma';
    readonly Slash: 'Slash';
    readonly Plus: 'Plus';
    readonly Minus: 'Minus';
    readonly Hash: 'Hash';
    readonly Hex: 'Hex';
    readonly Unicode: 'Unicode';
    readonly Operator: 'Operator';
    readonly Other: 'Other';
    readonly EOF: 'EOF';
} = {
    Whitespace: 'Whitespace',
    Quote: 'Quote',
    Letter: 'Letter',
    Digit: 'Digit',
    Exponent: 'Exponent',
    Percent: 'Percent',
    Dot: 'Dot',
    LParen: 'LParen',
    RParen: 'RParen',
    Comma: 'Comma',
    Slash: 'Slash',
    Plus: 'Plus',
    Minus: 'Minus',
    Hash: 'Hash',
    Hex: 'Hex',
    Unicode: 'Unicode',
    Operator: 'Operator',
    Other: 'Other',
    EOF: 'EOF',
} as const;

const hexRegex = /^(#?([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8}))$/i;

const CharSpec: CharClassType = [
    [CharClass.Whitespace, (char: string) => /\s/.test(char)],
    [CharClass.Letter, (char: string) => /[a-z]/i.test(char)],
    [CharClass.Digit, (char: string) => /\d/.test(char)],
    [CharClass.Quote, (char: string) =>
        /["'`]|\p{Pi}|\p{Pf}/u.test(char)],
    [CharClass.Percent, (char: string) => char === '%'],
    [CharClass.Dot, (char: string) => char === '.'],
    [CharClass.LParen, (char: string) => char === '('],
    [CharClass.RParen, (char: string) => char === ')'],
    [CharClass.Comma, (char: string) => char === ','],
    [CharClass.Slash, (char: string) => char === '/'],
    [CharClass.Plus, (char: string) => char === '+'],
    [CharClass.Minus, (char: string) => char === '-'],
    [CharClass.Hash, (char: string) => char === '#'],
    [CharClass.Exponent, (char: string) => /[eE]/.test(char)],
    [CharClass.Hex, (char: string) => /[a-f0-9]/i.test(char)],
    [CharClass.Operator, (char: string) => {
        switch (char) {
            case '!': return true;
            case '\\': return true;
            case '*': return true;
            case '@': return true;
            case '$': return true;
            case '^': return true;
            case '&': return true;
            case '{': return true;
            case '}': return true;
            case '[': return true;
            case ']': return true;
            case '|': return true;
            case ':': return true;
            case ';': return true;
            case '<': return true;
            case '>': return true;
            case '?': return true;
            case '~': return true;
            case '`': return true;
            case '=': return true;
            default: return false;
        }
    }],
    [CharClass.Unicode, (char: string) => /[^\x00-\x7F]/.test(char)],
];

type ClassifyFunction = (char: string) => CharClass;

const charLookup = new Map<string, CharClass>();

const classify: ClassifyFunction = (char: string): CharClass => {
    for (const [charClass, charClassFn] of CharSpec) {
        if (charClassFn(char)) return charClass as CharClass;
    }
    return CharClass.Other;
}

for (let i = 0; i < 256; i++) {
    const char = String.fromCharCode(i);
    charLookup.set(char, classify(char));
}
// End of Σ (Sigma)

// Q - the set of all possible states
const State = {
    Start: '<start>',
    Whitespace: '<whitespace>',
    InsideQuote: '<inside-quote>',
    EndQuote: '<end-quote>',
    Identifier: '<identifier>',
    HexValue: '<hexvalue>',
    Integer: '<integer>',
    Float: '<float>',
    Exponent: '<exponent>',
    Delimiter: '<delimiter>',
    Operator: '<operator>',
    Error: '<error>',
    Percent: '<percent>',
    Dimension: '<dimension>',
    Unicode: '<unicode>',
} as const;


// End of Q

// δ (delta) - the set of rules for transitioning between states
const Transition: TransitionType = {
    [State.Start]: {
        [CharClass.Quote]: State.InsideQuote,
        [CharClass.Whitespace]: State.Whitespace,
        [CharClass.Hash]: State.HexValue,
        [CharClass.Letter]: State.Identifier,
        [CharClass.Dot]: State.Delimiter,
        [CharClass.Digit]: State.Integer,
        [CharClass.Percent]: State.Percent,
        [CharClass.Plus]: State.Operator,
        [CharClass.Minus]: State.Operator,
        [CharClass.LParen]: State.Delimiter,
        [CharClass.RParen]: State.Delimiter,
        [CharClass.Comma]: State.Delimiter,
        [CharClass.Slash]: State.Delimiter,
        [CharClass.Unicode]: State.Unicode,
        [CharClass.Operator]: State.Operator,
        [CharClass.Other]: State.Error,
    },

    [State.Whitespace]: {
        [CharClass.Whitespace]: State.Whitespace,
    },

    [State.HexValue]: {
        [CharClass.Hex]: State.HexValue,
        [CharClass.Exponent]: State.HexValue,
        [CharClass.Letter]: State.HexValue,
        [CharClass.Digit]: State.HexValue,
    },

    [State.InsideQuote]: {
        [CharClass.Whitespace]: State.InsideQuote,
        [CharClass.Hash]: State.InsideQuote,
        [CharClass.Exponent]: State.InsideQuote,
        [CharClass.Letter]: State.InsideQuote,
        [CharClass.Digit]: State.InsideQuote,
        [CharClass.Percent]: State.InsideQuote,
        [CharClass.Plus]: State.InsideQuote,
        [CharClass.Minus]: State.InsideQuote,
        [CharClass.LParen]: State.InsideQuote,
        [CharClass.RParen]: State.InsideQuote,
        [CharClass.Comma]: State.InsideQuote,
        [CharClass.Slash]: State.InsideQuote,
        [CharClass.Unicode]: State.InsideQuote,
        [CharClass.Operator]: State.InsideQuote,
        [CharClass.Quote]: State.EndQuote,
    },

    [State.EndQuote]: {
        [CharClass.Hash]: State.InsideQuote,
        [CharClass.Exponent]: State.InsideQuote,
        [CharClass.Letter]: State.InsideQuote,
        [CharClass.Digit]: State.InsideQuote,
        [CharClass.Percent]: State.InsideQuote,
        [CharClass.Plus]: State.InsideQuote,
        [CharClass.Minus]: State.InsideQuote,
        [CharClass.LParen]: State.InsideQuote,
        [CharClass.RParen]: State.InsideQuote,
        [CharClass.Comma]: State.InsideQuote,
        [CharClass.Slash]: State.InsideQuote,
        [CharClass.Unicode]: State.InsideQuote,
        [CharClass.Operator]: State.InsideQuote,
        [CharClass.Quote]: State.EndQuote,
    },

    [State.Identifier]: {
        [CharClass.Exponent]: State.Identifier,
        [CharClass.Letter]: State.Identifier,
        [CharClass.Digit]: State.Identifier,
        [CharClass.Minus]: State.Identifier,
    },

    [State.Integer]: {
        [CharClass.Operator]: State.Integer,
        [CharClass.Exponent]: State.Integer,
        [CharClass.Dot]: State.Float,
        [CharClass.Percent]: State.Percent,
        [CharClass.Letter]: State.Dimension,
        [CharClass.Digit]: State.Integer,
    },

    [State.Float]: {
        [CharClass.Exponent]: State.Float,
        [CharClass.Percent]: State.Percent,
        [CharClass.Letter]: State.Dimension,
        [CharClass.Digit]: State.Float,
    },

    [State.Exponent]: {
        [CharClass.Letter]: State.Identifier,
        [CharClass.Digit]: State.Exponent,
    },

    [State.Percent]: {
    },

    [State.Dimension]: {
        [CharClass.Digit]: State.Exponent,
        [CharClass.Letter]: State.Dimension,
    },

    [State.Unicode]: {
        [CharClass.Unicode]: State.Unicode,
    },

    [State.Delimiter]: {
        [CharClass.LParen]: State.Delimiter,
        [CharClass.RParen]: State.Delimiter,
        [CharClass.Comma]: State.Delimiter,
        [CharClass.Slash]: State.Delimiter,
        [CharClass.Dot]: State.Delimiter,
    },

    [State.Operator]: {
        [CharClass.Plus]: State.Operator,
        [CharClass.Minus]: State.Operator,
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
    [State.Unicode]: TokenType.UNICODE,
    [State.EndQuote]: TokenType.STRING,
    [State.Identifier]: TokenType.IDENTIFIER,
    [State.Exponent]: TokenType.NUMBER,
    [State.Integer]: TokenType.NUMBER,
    [State.Float]: TokenType.NUMBER,
    [State.Percent]: TokenType.PERCENT,
    [State.Dimension]: TokenType.DIMENSION,
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
    private currentState: State = State.Start;
    private previousState: State = State.Start;
    private errorCount: number = 0;
    private readonly tokens: Token[] = [];

    constructor(input: string, debug?: boolean) {
        this.source = input ?? '';
        this.debug = debug ?? false;
        this.tokenize();
        this.displayTree();
    }

    public tokenize = (): Token[] => {
        const tokens: Token[] = [];

        while (!this.isEOF()) {
            let type: TokenType;
            let value: string = '';
            this.currentState = State.Start;
            const startPos: Position = this.position();

            while (true) {
                if (this.isEOF()) break;

                const char = this.source[this.index];
                if (!char) break;

                const charClass = classify(char);
                if (!charClass) {
                    this.reject(this.currentState, undefined, startPos, value);
                    break;
                }

                const nextState = this.transition(Transition, this.currentState, charClass);
                if (nextState === null) {
                    this.reject(this.currentState, charClass, startPos, value);
                    break;
                } else if (nextState === undefined) {
                    break;
                }

                this.currentState = nextState;
                this.index++;
            }
            const endPos: Position = this.position();

            //value += char;
            value = this.source.slice(startPos.index, endPos.index).normalize('NFC');

            switch (this.currentState) {

                case State.Start:
                    if (!this.isEOF()) {
                        this.index++;
                        this.currentState = State.Error;
                        const msg = `Skipped unexpected character at ${this.index}: '${value}'`;
                        //this.displayError(this.currentState, msg, startPos.index, endPos.index, value);
                        this.errorCount++;
                        tokens.push({ type: TokenType.ERROR, value });
                        continue;
                    }
                    break;

                case State.Whitespace:
                    // Skip <whitespace>
                    continue;

                case State.HexValue:
                    const match = value.match(hexRegex);
                    if (match) {
                        type = Accepting[this.currentState]!;
                        tokens.push({
                            type,
                            value: match[0],
                        });
                        break;
                    } else {
                        this.currentState = State.Error;
                        //this.displayError(this.currentState, undefined, startPos.index, endPos.index, value);
                        this.errorCount++;
                        tokens.push({ type: TokenType.ERROR, value });
                        continue;
                    }

                case State.Unicode:
                case State.EndQuote:
                case State.Operator:
                case State.Delimiter:
                case State.Identifier:
                case State.Integer:
                case State.Float:
                case State.Percent:
                case State.Exponent:
                    type = Accepting[this.currentState]!;
                    tokens.push({ type, value });
                    break;

                // INVALID TOKEN
                case State.Error:
                    //this.displayError(this.currentState, undefined, startPos.index, endPos.index, value);
                    this.errorCount++;
                    tokens.push({ type: TokenType.ERROR, value });
                    break;
                default:
                    type = Accepting[this.currentState]!;
                    tokens.push({ type, value });
                    break;
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

    private transition(table: TransitionType, state: State, char: CharClass): State | null | undefined {
        this.previousState = state;

        const nextState = table[state]?.[char];

        if (nextState) {
            return nextState;
        } else if (nextState === undefined) {
            return undefined;
        } else {
            return null;
        }
    }

    private reject(
        state: State,
        charClass: CharClass | undefined,
        startPos: Position,
        value?: any
    ) {
        this.currentState = State.Error;

        const msg = `Invalid token at position: ${YELLOW}${startPos.index}${MAGENTA} — no transition from ${BLUE}${state}${MAGENTA} to:\n\n\t\t\t\t${GREEN}VALUE: ${RED}'${value}'\t${GREEN}CHARACTER CLASS: ${RED}'${charClass}'${RESET}`;

        const endPos = startPos.index + (value.length ?? 1);

        if (value === ' ') value = '<whitespace>';

        this.displayError(
            this.currentState,
            msg,
            startPos.index,
            endPos,
            value
        );
    }

    /**
     * Use PrettyTree to display detailed information concerning error conditions if debug is true
     * @param state - Current State
     * @param startPos - start position in source of the error
     * @param endPos - end position in source of the error
     * @param value - character/s identified as the error
     * @param msg - (optional) any additional text to display about the error
     * @returns - void
     */
    private displayError(
        state: State,
        errorMsg?: string,
        startPos?: number,
        endPos?: number,
        value?: any
    ) {
        if (!this.debug) return;
        let errorDetails;
        const message = errorMsg || 'Lexer Error!!!';
        if (startPos !== undefined && endPos !== undefined && value !== undefined) {
            // A single character was identified as the error
            if (startPos === endPos) endPos++;

            // Create new colored source, highlighting invalid character
            const prefix = this.source.substring(0, startPos);
            const target = this.source.substring(startPos, endPos);
            const suffix = this.source.substring(endPos);
            const cPrefix = `${WHITE}${prefix}${RESET}`;
            const cTarget = `${BrMAGENTA}${BOLD}${UNDERLINE}${target}${RESET}`;
            const cSuffix = `${WHITE}${suffix}${RESET}`
            const cSource = `${cPrefix}${cTarget}${cSuffix}`;

            // Create an empty line with an arrow pointing at the error
            const pL = ' '.repeat(prefix.length);
            const tL = '↑'.repeat(target.length);
            const arrow = `${RESET}${pL}${RED}${BOLD}${tL}${RESET}`;

            // Develop error details
            errorDetails = [{
                PreviousState: this.previousState,
                CurrentState: `${RED}${BOLD}${state}${RESET}`,
                Error: `${MAGENTA}${BOLD}${message}${RESET}`,
                Token: value,
                Source: cSource,
                '': arrow,
                StartPosition: `${YELLOW}${startPos}${RESET}`,
                EndPosition: `${YELLOW}${endPos}${RESET}`,
            }];
        } else {
            errorDetails = [{
                PreviousState: this.previousState,
                CurrentState: `${RED}${BOLD}${state}${RESET}`,
                Error: `${MAGENTA}${BOLD}${message}${RESET}`,
            }];
        }
        console.log();
        console.log(Tree(errorDetails, 'Tokenizer Error Log', 'Detailed Information', undefined, true, false));
    }

    private createTokenTree = (tokens: Token[], rootLabel: string = 'Token Tree') => {
        return {
            label: rootLabel,
            nodes: tokens.map((token, index) => ({
                label: `Token [${index}] (${token.type})`,
                leaf: token
            }))
        };
    }

    private splitString(str: string, maxLength?: number): string[] {
        maxLength = maxLength ?? 50;
        if (str.length <= maxLength) return [str];
        const midpoint = Math.ceil(str.length / 2);
        if (midpoint > 45) return [str];
        const first = str.substring(0, midpoint);
        const second = str.substring(midpoint);
        return [first, second];
    }

    public displayTree() {
        // TITLE AND COLORS
        const title = ' TOKENIZING STRING INPUT ';
        const titleColor = CYAN;
        const barColor = WHITE;
        const headingColor = BrGREEN;
        const arrowColor = MAGENTA + BOLD;
        const dataColor = YELLOW + BOLD;

        // CALCULATE LENGTHS
        const maxLength = 100;
        const maxSourceLength = maxLength / 2;
        const [first, second] = this.splitString(this.source, maxSourceLength);

        // CALCULATE PADDING
        let rTitlePadding = Math.ceil((maxLength - title.length) / 2);
        const remainder = rTitlePadding % 2;
        const lTitlePadding = (remainder === 0) ? rTitlePadding : rTitlePadding + remainder;
        const totalTitleLength = lTitlePadding + title.length + rTitlePadding;
        if (totalTitleLength > maxLength) {
            const targetLength = totalTitleLength - maxLength;
            rTitlePadding -= targetLength;
        }

        // SMALL PIECES
        const tabs = `\t\t`;
        const rightArrow = `${arrowColor}►\t\t${RESET}`;
        const leftArrow = `${arrowColor}\t\t◄${RESET}`;
        const bar = '═'.repeat(maxLength);
        const longBar = '█'.repeat(maxLength)
        const leftTitle = '█'.repeat(lTitlePadding);
        const rightTitle = '█'.repeat(rTitlePadding);
        const centerTitle = `${titleColor}${title}${RESET}`;
        const sourceStringHeading = `${headingColor}${BOLD}Input String:${RESET}`;
        const sourceStringFirst = `${dataColor}${first}${RESET}`;
        const sourceStringSecond = second ? `${dataColor}${second}${RESET}` : '';
        const sourceLengthHeading = `${headingColor}${BOLD}Input Length:${RESET}`;
        const sourceLength = `${dataColor}${this.source.length}${RESET}`;

        // PUTTING PIECES TOGETHER
        const barRow = `${barColor}${bar}${RESET}`;
        const longBarRow = `${barColor}${longBar}${RESET}`;
        const titleRow = `${leftTitle}${centerTitle}${rightTitle}`;
        const sourceStringHeadingRow = `${sourceStringHeading}\n`;
        const sourceStringFirstRow = `${tabs}${rightArrow}${sourceStringFirst}${leftArrow}`;
        const sourceStringSecondRow = second ? `${tabs}${rightArrow}${sourceStringSecond}${leftArrow}` : '';
        const sourceLengthHeadingRow = `${sourceLengthHeading}\n`;
        const sourceLengthRow = `${tabs}${sourceLength}`;
        const treeRow = Tree(this.tokens, 'Token Tree', 'Token', this.createTokenTree);

        // DISPLAY REPORT
        console.log(`\n${barRow}`);
        console.log(`${longBarRow}`);
        console.log(`${titleRow}`);
        console.log(`${longBarRow}`);
        console.log(`${barRow}`);
        console.log(`${headingColor}${BOLD}Error Count:${RESET}\t`, this.errorCount);
        console.log(`${sourceStringHeadingRow}`);
        console.log(`${sourceStringFirstRow}`);
        if (second) console.log(`${sourceStringSecondRow}\n`);
        if (!second) console.log();
        console.log(`${barRow}`);
        console.log(`${sourceLengthHeadingRow}`);
        console.log(`${sourceLengthRow}\n`);
        console.log(`${barRow}\n`);
        console.log(`${treeRow}`);
        console.log(`${barRow}`);

        // DISPLAY COMPLETED BANNER
        this.displayBanner(maxLength, ' COMPLETED TOKENIZATION!!! ');
    }

    private displayBanner(maxLength: number, title?: string) {
        // TITLE AND COLORS
        title = title ?? '';
        const titleColor = YELLOW;
        const frameColor = GREEN;

        // CALCULATE LENGTHS
        const framePieceLength = 2;
        const barLength = maxLength - framePieceLength;

        // CALCULATE PADDING
        let rTitlePadding = Math.ceil((maxLength - title.length) / 2);
        const remainder = rTitlePadding % 2;
        const lTitlePadding = (remainder === 0) ? rTitlePadding : rTitlePadding + remainder;
        const totalTitleLength = lTitlePadding + title.length + rTitlePadding + framePieceLength;
        if (totalTitleLength > maxLength) {
            const targetLength = totalTitleLength - maxLength;
            rTitlePadding -= targetLength;
        }

        // OUTER PIECES
        const tlc = `${frameColor}╔${RESET}`;
        const trc = `${frameColor}╗${RESET}`;
        const blc = `${frameColor}╚${RESET}`;
        const brc = `${frameColor}╝${RESET}`;
        const h = `${frameColor}═${RESET}`;
        const v = `${frameColor}║${RESET}`;
        const s = `${frameColor}█${RESET}`;

        // INNER PIECES
        const colorTitle = `${titleColor}${title}${RESET}`;
        const bar = h.repeat(barLength);
        const space = s.repeat(barLength);
        const lTitle = s.repeat(lTitlePadding);
        const rTitle = s.repeat(rTitlePadding);

        // PUT IT ALL TOGETHER
        const topRow = `${tlc}${bar}${trc}`;
        const spaceRow = `${v}${space}${v}`;
        const titleRow = `${v}${lTitle}${colorTitle}${rTitle}${v}`;
        const botRow = `${blc}${bar}${brc}`;

        // DISPLAY BANNER
        console.log(`${topRow}`);
        console.log(`${spaceRow}`);
        console.log(`${titleRow}`);
        console.log(`${spaceRow}`);
        console.log(`${botRow}\n`);
    }
}

// SMALL TEST EXAMPLE
(() => {
    // EXAMPLE:
    const debug = true;
    const input = 'price + 4.99 * 100! - (3 * 50%) / 1e58 #ffff "test string 123 `#$%`" @ “Roses are Red!”';

    const tokenizer: Tokenizer = new Tokenizer(input, debug);


})();

/*
*   Character 	        Description	            ASCII Code	    Unicode Hex
* ---------------------------------------------------------------------------
        ─	        Horizontal line	                196           U+2500
        │	        Vertical line	                179	          U+2502
        ┌	        Upper-left corner	            218	          U+250C
        ┐	        Upper-right corner	            191	          U+2510
        └	        Lower-left corner	            192	          U+2514
        ┘	        Lower-right corner	            217	          U+2518
        ┼	        Center cross	                197	          U+253C
        ═	        Double horizontal line	        205	          U+2550
        ║	        Double vertical line	        186	          U+2551
        ╔	        Upper-left double corner	    201	          U+2554
        ╗	        Upper-right double corner	    187	          U+2557
        ╚	        Lower-left double corner	    200	          U+255A
        ╝	        Lower-right double corner	    188	          U+255D
        ╬	        Double center cross	            206	          U+256C

        ░           Light Shading                   176           U+2591

        ▒           Medium Shading                  177           U+2592

        ▓           Dark Shading                    178           U+2593

        █           Full Block                      219           U+2588
* ---------------------------------------------------------------------------
*/



/*
                                    Windows-1252
------------------------------------------------------------------------------------
MIME/IANA:	        windows-1252
Alias:	            Code page 1252
Category:	        Windows code pages
Created by:	        Microsoft
Languages:          English, Danish, Irish, Italian, Norwegian, Portuguese, 
                    Spanish, Swedish, German, Finnish, Icelandic, French, 
                    Faroese, Luxembourgish, Albanian, Estonian, Swahili, Tswana,
                    Catalan, Basque, Occitan, Rotokas, Romansh, Dutc, and Slovene
Standard:	        WHATWG Encoding Standard
Classification:     extended ASCII, Windows-125x

Code page layout:
␀  ␁  ␂  ␃  ␄  ␅  ␆  ␇  ␈  ␉  ␊  ␋  ␌  ␍  ␎  ␏  ␐  ␑  ␒  ␓  ␔  ␕ 
␖  ␗  ␘  ␙  ␚  ␛  ␜  ␝  ␞  ␟     !  "  #  $  %  &  '  (  )  *  +  ,  -  .
/  0  1  2  3  4  5  6  7  8  9  :  ;  <  =  >  ?  @  A  B  C  D  E  F  G  H  I  J 
K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y  Z  [  \  ]  ^  _  `  a  b  c  d  e  f 
g  h  i  j  k  l  m  n  o  p  q  r  s  t  u  v  w  x  y  z  {  |  }  ~  ␡  €  ‚  ƒ 
„  …  †  ‡  ˆ  ‰  Š  ‹  Œ  Ž  ‘  ’  “  ”  •  –  —  ˜  ™  š  ›  œ  ž  Ÿ     ¡  ¢  £ 
¤  ¥  ¦  §  ¨  ©  ª  «  ¬     ®  ¯  °  ±  ²  ³  ´  µ  ¶  ·  ¸  ¹  º  »  ¼  ½  ¾  ¿ 
À  Á  Â  Ã  Ä  Å  Æ  Ç  È  É  Ê  Ë  Ì  Í  Î  Ï  Ð  Ñ  Ò  Ó  Ô  Õ  Ö  ×  Ø  Ù  Ú  Û 
Ü  Ý  Þ  ß  à  á  â  ã  ä  å  æ  ç  è  é  ê  ë  ì  í  î  ï  ð  ñ  ò  ó  ô  õ  ö  ÷ 
ø  ù  ú  û  ü  ý  þ  ÿ

*/

