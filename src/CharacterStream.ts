// src/CharacterStream.ts

import { inspect, type InspectOptions } from 'node:util';

type CharType = typeof Character.CharType[keyof typeof Character.CharType];
type CharTypeFn = (char: string) => boolean;
type ClassifyFunction = (char: string) => CharType;
type CharSpecType = [CharType, CharTypeFn][] // SigmaType
type Predicate = (token: Character) => boolean;
type Char = string;

// ICharacter
export interface ICharacter {
    value: Char | undefined;
    type: CharType | undefined;
    index: number;
    line: number;
    column: number;
}

const inspectOptions: InspectOptions = {
    showHidden: false,
    depth: 2,
    colors: true,
    customInspect: true,
    showProxy: false,
    maxArrayLength: null,
    maxStringLength: null,
    breakLength: 100,
    compact: true,
    sorted: false,
    getters: false,
    numericSeparator: true,
};

// Character.ts
export class Character implements ICharacter {
    value: Char | undefined;
    type: CharType;
    index: number;
    line: number;
    column: number;

    constructor(char: Partial<ICharacter> & { value?: Char }) {
        this.value = char.value;
        this.type =
            char.type ??
            (char.value === undefined
                ? Character.CharType.Other
                : Character.classify(char.value));
        this.index = char.index ?? 0;
        this.line = char.line ?? 1;
        this.column = char.column ?? 1;
    }

    public toString(): string {
        const inspectOptions: InspectOptions = {
            showHidden: false,
            depth: 2,
            colors: true,
            customInspect: false,
            showProxy: false,
            maxArrayLength: null,
            maxStringLength: null,
            breakLength: 100,
            compact: true,
            sorted: false,
            getters: false,
            numericSeparator: true,
        };

        return inspect({
            value: this.value,
            type: this.type,
            index: this.index,
            line: this.line,
            column: this.column,
        }, inspectOptions);
    }

    public get [Symbol.toStringTag]() {
        return 'Character';
    }

    public [inspect.custom](depth: number, options: any, inspect: any) {
        if (depth < 0) return options.stylize('[Character Object]', 'special');

        const newOptions = Object.assign({}, options, {
            depth: options.depth === null ? null : options.depth - 1,
            colors: true,
            maxArrayLength: null,
            compact: true,
        });

        // Five space padding because that's the size of "Character[##]< ".
        const pad1 = ' '.repeat(3 - String(this.index).length);
        const pad2 = ' '.repeat((this.type.length < 12) ? 12 - this.type.length : 0);
        const type = `${this.type}${pad2}`;
        const padding = ' '.repeat(11);
        const outer = `Character[${pad1}${this.index}] `;
        const innermost = {
            value: this.value,      // 8 + 5
            type: type,             // 8 + 15
            index: this.index,      // 8 + 4
            line: this.line,        // 8 + 4
            column: this.column,    // 8 + 4
        };
        const inner = inspect(innermost, newOptions).replace(/\n/g, `\n${padding}`);
        const result = `${options.stylize(outer, 'special')}< ${inner} >`;
        return result;
    }

    public static CharType = {
        // Structural and Whitespace
        Whitespace: 'Whitespace',
        Newline: 'Newline',
        EOF: 'EOF',

        // Literals and Components
        Digit: 'Digit', // 0-9
        Unicode: 'Unicode',
        Hex: 'Hex', // 0-9a-fA-f  
        Letter: 'Letter',
        Quote: 'Quote',
        Dot: 'Dot',

        // Punctuation and Operators
        LParen: 'LParen',
        RParen: 'RParen',
        LBrace: 'LBrace',
        RBrace: 'RBrace',
        LBracket: 'LBracket',
        RBracket: 'RBracket',
        Comma: 'Comma',
        SemiColon: 'SemiColon',
        Colon: 'Colon',
        Equals: 'Equals',
        Plus: 'Plus',
        Minus: 'Minus',
        Slash: 'Slash',
        Percent: 'Percent',
        Underscore: 'Underscore',
        Operator: 'Operator', // All others

        // Special and Meta Characters
        Hash: 'Hash', // #
        Exponent: 'Exponent', // e | E
        Other: 'Other',
        Error: 'Error',
    } as const;

    public static CharMap = new Map<string, CharType>([
        ['%', this.CharType.Percent],
        ['.', this.CharType.Dot],
        [',', this.CharType.Comma],
        ['/', this.CharType.Slash],
        ['(', this.CharType.LParen],
        [')', this.CharType.RParen],
        ['+', this.CharType.Plus],
        ['-', this.CharType.Minus],
        ['_', this.CharType.Underscore],
        ['#', this.CharType.Hash],
        ['!', this.CharType.Operator],
        ['\\', this.CharType.Operator],
        ['*', this.CharType.Operator],
        ['@', this.CharType.Operator],
        ['$', this.CharType.Operator],
        ['^', this.CharType.Operator],
        ['&', this.CharType.Operator],
        ['{', this.CharType.Operator],
        ['}', this.CharType.Operator],
        ['[', this.CharType.Operator],
        [']', this.CharType.Operator],
        ['|', this.CharType.Operator],
        [':', this.CharType.Operator],
        [';', this.CharType.Operator],
        ['<', this.CharType.Operator],
        ['>', this.CharType.Operator],
        ['?', this.CharType.Operator],
        ['~', this.CharType.Operator],
        ['`', this.CharType.Operator],
        ['=', this.CharType.Operator],
    ]);

    public static CharSpec = new Map<CharType, CharTypeFn>([
        [this.CharType.Newline, (char) => /[\n\r]+/i.test(char)],
        [this.CharType.Whitespace, (char) => /\s/.test(char)],
        [this.CharType.Letter, (char) => /[a-z]/i.test(char)],
        [this.CharType.Digit, (char) => /[\d]/.test(char)],
        [this.CharType.Quote, (char) => /["'`]/.test(char)],
        [this.CharType.Exponent, (char) => /[e]/i.test(char)],
        [this.CharType.Hex, (char) => /[a-f0-9]/i.test(char)],
        //[this.CharType.Unicode, (char) => /[^\x00-\x7F]/u.test(char)],
    ]);

    public static classify: ClassifyFunction = (char: string): CharType => {
        if (!char) return this.CharType.Other;
        if (Character.CharMap.has(char)) return this.CharMap.get(char) as CharType;
        for (const [charType, fn] of this.CharSpec) {
            if (fn(char)) return charType as CharType;
        }
        return this.CharType.Other;
    };
}

// CharacterStream.ts
/**
 * Invariants:
 * - cursor always points to the next unread source index
 * - character represents the current character
 * - EOF is a real Character emitted once
 * - line increments AFTER a newline is consumed
 */
export default class CharacterStream implements Iterator<Character>, Iterable<Character> {
    // Raw source input string
    private readonly source: string;

    // Current Character created from source string
    private character!: Character;
    private cursor: number = 0;

    // History of Characters created
    #history: Character[] = [];

    constructor(input?: string) {
        this.source = input ? input.normalize('NFC') : '';
        this.init();
    }

    private init() {
        this.cursor = 0;
        this.#history.length = 0;
        if (this.source.length === 0) {
            this.character = new Character({
                value: '',
                type: Character.CharType.EOF,
                index: 0,
                line: 1,
                column: 1,
            });
        } else {
            this.character = new Character({
                value: this.source[this.cursor],
                index: 0,
                line: 1,
                column: 1,
            });
        }
    }

    public toString() {
        return `${this.character}`;
    }

    public [inspect.custom]() {
        return `Character Stream <${inspect(this.character, {
            colors: true,
            customInspect: true,
        })}>`;
    }

    public get(): Character {
        return this.character;
    }

    public get value(): string { return this.character.value as string; }
    public get type(): CharType { return this.character.type; }
    public get index(): number { return this.character.index; }
    public get line(): number { return this.character.line; }
    public get column(): number { return this.character.column; }
    public get history(): Character[] { return this.#history; }

    public next(): IteratorResult<Character> {
        if (this.character.type === Character.CharType.EOF) {
            return { done: true, value: this.character };
        }

        const value = this.consume();

        return {
            done: false,
            value,
        };
    }

    // Save the current source character Character object and advance to next
    public consume(): Character {
        const current = this.character;
        if (current.type !== Character.CharType.EOF) {
            this.#history.push(current);
            this.advance();
        }
        return current;
    }

    // Advance counters and return the next source string character
    private advance(): void {
        const prev = this.character;
        this.cursor++;

        if (this.isAtEnd()) {
            this.character = this.EOFChar();
            return;
        }

        const value = this.source[this.cursor];

        const isNewline =
            prev.value === '\n' || prev.type === Character.CharType.Newline;

        this.character = new Character({
            value,
            index: this.cursor,
            line: isNewline ? prev.line + 1 : prev.line,
            column: isNewline ? 1 : prev.column + 1,
        });
    }

    public reset(): this {
        this.init();
        return this;
    }

    public [Symbol.iterator](): Iterator<Character> {
        this.reset();
        return this;
    }

    // INTERNAL — structural
    private isAtEnd(): boolean {
        return this.cursor >= this.source.length;
    }

    // PUBLIC — semantic
    public isEOF(): boolean {
        return this.character.type === Character.CharType.EOF;
    }

    // EOF is positioned one column past the last character
    public EOFChar(): Character {
        return new Character({
            value: '',
            type: Character.CharType.EOF,
            index: this.cursor,
            line: this.character.line,
            column: this.character.column + 1,
        });
    }
}

// TESTING
/*
const test = () => {
    const inspectOptions: InspectOptions = {
        showHidden: false,
        depth: 2,
        colors: true,
        customInspect: true,
        showProxy: false,
        maxArrayLength: null,
        maxStringLength: null,
        breakLength: 100,
        compact: true,
        sorted: false,
        getters: false,
        numericSeparator: true,
    };

    const str = "This is a very long string that we want to split into multiple lines to make it more readable and fit within a specific display constraint.";
    
    const stream = new CharacterStream(str);
    for (const char of stream) {
        console.log(char); //inspect(char, inspectOptions));
    }
}

test();
//*/