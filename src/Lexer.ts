// src/Lexer.ts

import util from 'util';
import { Tree } from './PrettyTree.ts';
import { RESET, RED, YELLOW, GREEN, BLUE, BOLD, MAGENTA, WHITE, UNDERLINE, BrMAGENTA } from './AnsiCodes.ts';
import TokenReport from './TokenReport.ts';
import Banner from './Banner.ts';
import { CharStream } from './TokenStream.ts';

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
export interface Token {
    type: TokenType;
    value: string;
}

export interface Position {
    index: number;
    line: number;
    column: number;
}

export type TokenType = typeof TokenType[keyof typeof TokenType];

export type CharClass = typeof CharClass[keyof typeof CharClass];
export type CharClassFn = (char: string) => boolean;
export type CharClassType = [CharClass, CharClassFn][] // SigmaType
export type ClassifyFunction = (char: string) => CharClass;

export type State = typeof State[keyof typeof State];
export type StateType<T extends string> = { [K in T]: `<${Lowercase<K>}>`; }; // QType

export type TransitionType = Record<State, Partial<Record<CharClass, State>>>; // DeltaType

export type AcceptingType = Partial<Record<State, TokenType>>; // Ftype


// Terminals used in accepting states
export const TokenType = {
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
export const CharClass = {
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

export const hexRegex = /^(#?([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8}))$/i;

export const CharSpec: CharClassType = [
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

export const classify: ClassifyFunction = (char: string): CharClass => {
    for (const [charClass, charClassFn] of CharSpec) {
        if (charClassFn(char)) return charClass as CharClass;
    }
    return CharClass.Other;
}
// End of Σ (Sigma)

// Q - the set of all possible states
export const State = {
    Start: '<start>',
    Whitespace: '<whitespace>',
    InsideQuote: '<inside-quote>',
    EndQuote: '<end-quote>',
    Identifier: '<identifier>',
    HexValue: '<hexvalue>',
    Integer: '<integer>',
    Float: '<float>',
    Exponent: '<exponent>',
    ExponentSign: '<exponent-sign>',
    AfterExponent: '<after-exponent>',
    Delimiter: '<delimiter>',
    Operator: '<operator>',
    Error: '<error>',
    Percent: '<percent>',
    Dimension: '<dimension>',
    Unicode: '<unicode>',
} as const;


// End of Q

// δ (delta) - the set of rules for transitioning between states
export const Transition: TransitionType = {
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
        [CharClass.Exponent]: State.HexValue,  // ⚠️ Why e/E in hex?
        [CharClass.Letter]: State.HexValue,    // ⚠️ All letters?
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
        //[CharClass.Quote]: State.InsideQuote, <-- Do i need a new CharClass for characters inside a nested string literal?
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
        [CharClass.Digit]: State.Integer,
        [CharClass.Dot]: State.Float,
        [CharClass.Exponent]: State.AfterExponent,
        [CharClass.Percent]: State.Percent,
        [CharClass.Letter]: State.Dimension,
    },

    [State.AfterExponent]: {
        [CharClass.Plus]: State.ExponentSign,
        [CharClass.Minus]: State.ExponentSign,
        [CharClass.Digit]: State.Exponent,
    },

    [State.ExponentSign]: {
        [CharClass.Digit]: State.Exponent,
    },

    [State.Exponent]: {
        [CharClass.Digit]: State.Exponent,
    },

    [State.Float]: {
        [CharClass.Digit]: State.Float,
        [CharClass.Exponent]: State.AfterExponent,
        [CharClass.Percent]: State.Percent,
        [CharClass.Letter]: State.Dimension,
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
export const Accepting: AcceptingType = {
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
    private readonly input: string;
    private readonly source: CharStream;
    private debug: boolean = false;
    private index = 0;
    private line = 1;
    private column = 1;
    private currentState: State = State.Start;
    private previousState: State = State.Start;
    private currentCharClass: CharClass | undefined = undefined;
    private previousCharClass: CharClass | undefined = undefined;
    private errorCount: number = 0;
    private quoteChar: string | undefined = undefined;
    private tokenReport: TokenReport | undefined = undefined;
    private readonly tokens: Token[] = [];

    constructor(input: string, debug?: boolean) {
        this.input = input ?? '';
        this.source = new CharStream(input);
        this.debug = debug ?? false;

        const done = this.tokenize();
        if (done) this.showReport();
    }

    public showReport() {
        const options = {
            depth: null,
            colors: true,
            maxArrayLength: null,
        };

        // LONG REPORT
        //this.tokenReport =
        //    new TokenReport(
        //        100,
        //        ' TOKENIZATION REPORT ',
        //        this.source,
        //        this.tokens,
        //        this.errorCount
        //    );
        //this.tokenReport.show();

        // SHORT REPORT
        console.log();
        console.log(util.inspect({
            title: ' TOKENIZATION REPORT ',
            source: this.source,
            errors: this.errorCount,
            //tokens: this.tokens,
        }, options));
    }

    public tokenize = (): boolean => {
        while (!this.isEOF()) {
            let type: TokenType;
            let value: string = '';
            this.previousCharClass = this.currentCharClass;
            this.reset();
            const startPos: Position = this.position();

            while (true) {
                const char = this.source.next();
                if (!char) break;

                this.currentCharClass = char.value.class;
                if (!this.currentCharClass) {
                    //this.reject(undefined, startPos, value);
                    break;
                }

                if (
                    this.currentState === State.InsideQuote && this.currentCharClass === CharClass.Quote
                ) {
                    this.quoteChar = char.value.character;
                    if (this.quoteChar && this.isMatchingQuote(this.quoteChar, char.value.character)) {
                        this.currentState = State.EndQuote;
                        this.advance();
                        break;
                    }

                    // Different quote → literal content
                    this.advance();
                    continue;
                }

                const nextState = this.transition(Transition, this.currentState, this.currentCharClass);
                if (!nextState) break;

                this.currentState = nextState;
                this.advance();
            }
            const endPos: Position = this.position();

            //value += char;
            value = this.source.history[this.index]!.character.slice(startPos.index, endPos.index).normalize('NFC');

            switch (this.currentState) {

                case State.Start:
                    if (!this.isEOF()) {
                        this.advance();
                        const msg = `Skipped unexpected character at ${this.index}: '${value}'`;
                        this.reject(msg, startPos, value);
                        continue;
                    }
                    break;

                case State.Whitespace:
                    // Skip <whitespace>
                    continue;

                case State.HexValue:
                    const hexValue = value.slice(1); // Remove #
                    const validLengths = [3, 4, 6, 8];

                    if (validLengths.includes(hexValue.length) &&
                        /^[0-9a-f]+$/i.test(hexValue)) {
                        type = Accepting[this.currentState]!;
                        this.tokens.push({ type, value });
                        this.reset();
                    } else {
                        const pState = `${BLUE}${this.previousState}${MAGENTA}`;
                        const sPos = `${YELLOW}${startPos.index}${RESET}`;
                        const msg = `Invalid ${pState} at position: ${sPos}`
                        this.reject(msg, startPos, value);
                    }
                    break;

                case State.InsideQuote:
                    if (this.isEOF()) {
                        this.reject(undefined, startPos, value);
                        break;
                    }
                    break;

                case State.AfterExponent:
                    if (!Accepting[State.AfterExponent]) {
                        this.reject(undefined, startPos, value);
                    }
                    break;

                case State.Unicode:
                case State.EndQuote:
                case State.Operator:
                case State.Delimiter:
                case State.Identifier:
                case State.Integer:
                case State.Float:
                case State.Percent:
                case State.Exponent:
                case State.Dimension:
                    type = Accepting[this.currentState]!;
                    this.tokens.push({ type, value });
                    this.reset();
                    break;

                // INVALID TOKEN
                case State.Error:
                    this.reject(undefined, startPos, value);
                    break;
                default:
                    type = Accepting[this.currentState]!;
                    this.tokens.push({ type, value });
                    break;
            }
        }

        this.tokens.push({ type: TokenType.EOF, value: '<end>' });
        return true;
    }

    private isEOF = () => {
        return this.index >= this.input.length;
    }

    private isMatchingQuote(open: string, close: string): boolean {
        if (open === close) return true;

        // Unicode paired quotes
        const pairs: Record<string, string> = {
            '“': '”',
            '‘': '’',
            '‹': '›',
            '«': '»',
        };

        return pairs[open] === close;
    }

    private reset(): void {
        this.currentState = State.Start;
        this.previousState = State.Start;
        this.currentCharClass = undefined;
        this.quoteChar = undefined;
    }

    private advance(): void {
        const char = this.source.history[this.index]?.character;

        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }

        this.index++;
    }

    private position(): Position {
        return {
            index: this.index,
            line: this.line,
            column: this.column,
        };
    }

    private transition(table: TransitionType, state: State, char: CharClass): State | undefined {
        this.previousState = state;
        return table[state]?.[char];
    }

    private reject(
        customMsg: string = '',
        startPos: Position,
        value?: any
    ) {
        this.currentState = State.Error;
        this.errorCount++;

        const sPos = `${YELLOW}${startPos.index}${RESET}`;
        const cState = `${BLUE}${this.previousState}${RESET}`;
        const space = `\n\n\t\t\t\t`;
        const cValue = `${GREEN}VALUE: ${RED}'${value}'${RESET}\t`;
        const cClass = `${GREEN}CHARACTER CLASS: ${RED}'${this.currentCharClass}'${RESET}`;

        const msgPart1 = `${MAGENTA}${customMsg}${RESET}` || `${MAGENTA}Invalid token at position: ${sPos}${RESET}`;
        const msgPart2 = `${MAGENTA} — no transition from ${cState} ${MAGENTA}to:${space}${cValue}${cClass}${RESET}`;

        const msg = `${msgPart1}${msgPart2}`;

        const endPos = startPos.index + (value.length ?? 1);

        if (value === ' ') value = '<whitespace>';

        this.tokens.push({ type: TokenType.ERROR, value });

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
        currentState: State,
        errorMsg?: string,
        startPos?: number,
        endPos?: number,
        value?: any
    ) {
        if (!this.debug) return;
        let errorDetails;
        const message = errorMsg || 'Lexer Error!!!';

        // Color Common Error Details
        const cPrev_StateRow = `${BLUE}${this.previousState}${RESET}`;
        const cCurr_StateRow = `${RED}${BOLD}${currentState}${RESET}`;
        const cPrev_ClassRow = `${BLUE}${this.previousCharClass}${RESET}`;
        const cCurr_ClassRow = `${RED}${BOLD}${this.currentCharClass}${RESET}`;
        const rowSpace = `\t`;
        const cStateRow = `${RESET}Previous: ${cPrev_StateRow}${rowSpace}Current: ${cCurr_StateRow}\n`;
        const cCharClassRow = `${RESET}Previous: ${cPrev_ClassRow}${rowSpace}\tCurrent: ${cCurr_ClassRow}\n`;
        const cErrMessageRow = `${MAGENTA}${BOLD}${message}${RESET}\n`;

        if (startPos !== undefined && endPos !== undefined && value !== undefined) {
            // A single character was identified as the error
            if (startPos === endPos) endPos++;

            // Create new colored source, highlighting invalid character
            const prefix = this.source.history[this.index]?.character.substring(0, startPos);
            const target = this.source.history[this.index]?.character.substring(startPos, endPos);
            const suffix = this.source.history[this.index]?.character.substring(endPos);
            const cPrefix = `${WHITE}${prefix}${RESET}`;
            const cTarget = `${BrMAGENTA}${BOLD}${UNDERLINE}${target}${RESET}`;
            const cSuffix = `${WHITE}${suffix}${RESET}`
            const cSourceRow = `${cPrefix}${cTarget}${cSuffix}`;

            // Create an empty line with an arrow pointing at the error
            const pL = ' '.repeat(prefix!.length);
            const tL = '▲'.repeat(target!.length);
            const cArrowRow = `${RESET}${pL}${RED}${BOLD}${tL}${RESET}\n`;

            // Color Error Details
            const cStartPosRow = `${YELLOW}${startPos}${RESET}`;
            const cEndPosRow = `${YELLOW}${endPos}${RESET}`;
            const cPosRow = `${RESET}Start: ${cStartPosRow}${rowSpace}End: ${cEndPosRow}`

            // Develop error details
            errorDetails = [{
                State: cStateRow,
                CharacterClass: cCharClassRow,
                Error: cErrMessageRow,
                Source: cSourceRow,
                '▲-line': cArrowRow,
                Position: cPosRow,
            }];
        } else {
            // Develop error details
            errorDetails = [{
                State: cStateRow,
                CharacterClass: cCharClassRow,
                Error: cErrMessageRow,
            }];
        }
        console.log();
        console.log(Tree(errorDetails, 'Tokenizer Error Log', 'Detailed Information', undefined, true, false));
    }
} // End Class Tokenizer

// SMALL TEST EXAMPLE
(() => {
    // EXAMPLE:
    const debug = true;
    const input = 'price + 4.99 * 100! - (3 * 50%) / 1e58 #ff "test string 123 `#$%`" @ “Roses are Red!”';

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
