// src/NewLexer.ts

import util from 'util';
import PrettyTree, { Tree } from './PrettyTree.js';

// lexer grammar EnglishTextTokenizer;

export const enum TokenType {
    NEWLINE = 'NEWLINE',
    WHITESPACE = 'WHITESPACE',
    FLOAT = 'FLOAT',
    INTEGER = 'INTEGER',
    IDENTIFIER = 'IDENTIFIER',
    SIGN = 'SIGN',
    OPERATOR = 'OPERATOR',
    DELIMITER = 'DELIMITER',
    CHAR = 'CHAR',
    EOF = 'EOF',
};

export class TokenRule {
    // WHITESPACE and NEWLINE
    static readonly NEWLINE: RegExp = /^('\r\n'|'\r'|'\n')/;
    static readonly WHITESPACE: RegExp = /^[ \t]+/;
    // SIGNS, OPERATORS, AND DELIMITERS
    static readonly DOT: RegExp = /^\./;
    static readonly SIGN: RegExp = /^[+\-%#]/;
    static readonly OPERATOR: RegExp = /^[*/=<>]/;
    static readonly DELIMITER: RegExp = /^[\(\)\[\]{};:?!&|'"`]/;
    // NUMBERS
    static readonly FLOAT: RegExp = /^([+-]?[0-9]+\\.[0-9]*|\\.[0-9]+)/;
    static readonly INTEGER: RegExp = /^([+-]?[0-9]+)/;
    // IDENTIFIER
    static readonly IDENTIFIER: RegExp = /[a-zA-Z]+/;
    // CHARACTERS
    static readonly CHAR: RegExp = /^[.]+/;
}

export const TokenSpec: [TokenType, RegExp][] = [
    [TokenType.NEWLINE, TokenRule.NEWLINE],
    [TokenType.WHITESPACE, TokenRule.WHITESPACE],
    [TokenType.FLOAT, TokenRule.FLOAT],
    [TokenType.INTEGER, TokenRule.INTEGER],
    [TokenType.IDENTIFIER, TokenRule.IDENTIFIER],
    [TokenType.SIGN, TokenRule.SIGN],
    [TokenType.OPERATOR, TokenRule.OPERATOR],
    [TokenType.DELIMITER, TokenRule.DELIMITER],
    [TokenType.CHAR, TokenRule.CHAR],
];

export type Token = {
    type: TokenType,
    value: string,
}

function tokenize(code: string): Token[] {
    const tokens = [];
    let remainingCode = code;

    while (remainingCode.length > 0) {
        let matched = false;
        for (const [tokenType, regex] of TokenSpec) {
            const match = remainingCode.match(regex);

            if (match) {
                const value = match[0];
                tokens.push({ type: tokenType, value });
                remainingCode = remainingCode.substring(value.length);
                matched = true;
                break;
            }
        }

        if (!matched) {
            const unknownChar = remainingCode[0];
            throw new SyntaxError(`Invalid character: ${unknownChar} !`);
        }
    }

    tokens.push({
        type: TokenType.EOF,
        value: '<end>',
    });
    return tokens;
}

// Custom function
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
const input = "price = 4.99 + -100!";
const tokens = tokenize(input);

console.log();
console.log(Tree(tokens, 'Token Stream', 'Token', createTokenTree));


