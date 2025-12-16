// tests/Tokenizer.test.ts

import { describe, it, expect } from 'vitest';
import Tokenizer, { TokenType, type Token } from '../src/Tokenizer.ts';

/**
 * Helper function to simplify test assertions.
 * We often only care about the token's type and value, not its exact position.
 * This makes the test suite much cleaner and easier to read.
 */
const simplifyTokens = (tokens: Token[]) => {
    return tokens.map(({ type, value }) => ({ type, value }));
};

describe('DfaTokenizer', () => {
    describe('Basic Inputs', () => {
        it('should return only an EOF token for an empty string', () => {
            const tokenizer = new Tokenizer('');
            const tokens = simplifyTokens(tokenizer.tokens);
            expect(tokens).toEqual([{ type: TokenType.EOF, value: '<end>' }]);
        });

        it('should tokenize a string with only whitespace', () => {
            const tokenizer = new Tokenizer(' \t\n ');
            const tokens = simplifyTokens(tokenizer.tokens);
            expect(tokens).toEqual([
                { type: TokenType.WHITESPACE, value: ' \t\n ' },
                { type: TokenType.EOF, value: '<end>' },
            ]);
        });
    });

    describe('Identifiers and Keywords', () => {
        it('should tokenize a single identifier', () => {
            const tokens = simplifyTokens(new Tokenizer('Hello').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'Hello' });
        });

        it('should tokenize multiple identifiers separated by spaces', () => {
            const tokens = simplifyTokens(new Tokenizer('Hello World').tokens);
            expect(tokens).toEqual([
                { type: TokenType.IDENTIFIER, value: 'Hello' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.IDENTIFIER, value: 'World' },
                { type: TokenType.EOF, value: '<end>' },
            ]);
        });

        it('should tokenize identifiers containing numbers', () => {
            const tokens = simplifyTokens(new Tokenizer('h1 and Section2').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'h1' });
            expect(tokens[2]).toEqual({ type: TokenType.IDENTIFIER, value: 'Section2' });
        });
    });

    describe('String Literals', () => {
        it('should tokenize a single-quoted string', () => {
            const tokens = simplifyTokens(new Tokenizer("'hello world'").tokens);
            expect(tokens[0]).toEqual({ type: TokenType.STRING, value: 'hello world' });
        });

        it('should tokenize a double-quoted string', () => {
            const tokens = simplifyTokens(new Tokenizer('"hello world"').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.STRING, value: 'hello world' });
        });

        it('should handle escaped quotes within a string', () => {
            const tokens = simplifyTokens(new Tokenizer("'I\\'m a string.'").tokens);
            expect(tokens[0]).toEqual({ type: TokenType.STRING, value: "I'm a string." });
        });

        it('should handle escaped backslashes within a string', () => {
            const tokens = simplifyTokens(new Tokenizer('"C:\\\\path\\\\to\\\\file"').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.STRING, value: 'C:\\path\\to\\file' });
        });

        it('should tokenize an empty string literal', () => {
            const tokens = simplifyTokens(new Tokenizer("''").tokens);
            expect(tokens[0]).toEqual({ type: TokenType.STRING, value: '' });
        });

        it('should throw a DiagnosticError for an unterminated string', () => {
            // Vitest's `toThrow` expects a function that will execute the throwing code.
            expect(() => {
                new Tokenizer("'This string is not closed");
            }).toThrow('Unterminated string literal');
        });
    });

    describe('Numeric Literals', () => {
        it('should tokenize an integer', () => {
            const tokens = simplifyTokens(new Tokenizer('123').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '123' });
        });

        it('should tokenize a number with a decimal part', () => {
            const tokens = simplifyTokens(new Tokenizer('123.45').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '123.45' });
        });

        it('should tokenize a number starting with a decimal', () => {
            const tokens = simplifyTokens(new Tokenizer('.5').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '.5' });
        });

        it('should tokenize a percentage', () => {
            const tokens = simplifyTokens(new Tokenizer('99.9%').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.PERCENT, value: '99.9' });
        });

        it('should tokenize a dimension with units', () => {
            const tokens = simplifyTokens(new Tokenizer('12px').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.DIMENSION, value: '12px' });
        });

        it('should tokenize scientific notation (e-notation)', () => {
            const tokens = simplifyTokens(new Tokenizer('1.2e5').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '1.2e5' });
        });

        it('should tokenize scientific notation with a positive exponent', () => {
            const tokens = simplifyTokens(new Tokenizer('1.2e+5').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '1.2e+5' });
        });

        it('should tokenize scientific notation with a negative exponent', () => {
            const tokens = simplifyTokens(new Tokenizer('314.15e-2').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '314.15e-2' });
        });
    });

    describe('Hex Values', () => {
        it('should tokenize a 3-digit hex value', () => {
            const tokens = simplifyTokens(new Tokenizer('#fff').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.HEXVALUE, value: '#fff' });
        });

        it('should tokenize a 6-digit hex value', () => {
            const tokens = simplifyTokens(new Tokenizer('#aabbcc').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.HEXVALUE, value: '#aabbcc' });
        });

        it('should tokenize an 8-digit hex value (with alpha)', () => {
            const tokens = simplifyTokens(new Tokenizer('#aabbccdd').tokens);
            expect(tokens[0]).toEqual({ type: TokenType.HEXVALUE, value: '#aabbccdd' });
        });
    });

    describe('Operators and Delimiters', () => {
        it('should tokenize all specific single-character tokens', () => {
            const tokens = simplifyTokens(new Tokenizer('+-*/(),').tokens);
            expect(tokens).toEqual([
                { type: TokenType.PLUS, value: '+' },
                { type: TokenType.MINUS, value: '-' },
                { type: TokenType.STAR, value: '*' },
                { type: TokenType.SLASH, value: '/' },
                { type: TokenType.LPAREN, value: '(' },
                { type: TokenType.RPAREN, value: ')' },
                { type: TokenType.COMMA, value: ',' },
                { type: TokenType.EOF, value: '<end>' },
            ]);
        });

        it('should tokenize unknown punctuation as DELIMITER', () => {
            const tokens = simplifyTokens(new Tokenizer('!@&?').tokens);
            expect(tokens).toEqual([
                { type: TokenType.DELIMITER, value: '!' },
                { type: TokenType.DELIMITER, value: '@' },
                { type: TokenType.DELIMITER, value: '&' },
                { type: TokenType.DELIMITER, value: '?' },
                { type: TokenType.EOF, value: '<end>' },
            ]);
        });
    });

    describe('Complex and Mixed Inputs', () => {
        it('should correctly tokenize the user test case', () => {
            const code = "Hello 'TypeScript', and hello world!";
            const tokens = simplifyTokens(new Tokenizer(code).tokens);
            expect(tokens).toEqual([
                { type: TokenType.IDENTIFIER, value: 'Hello' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.STRING, value: 'TypeScript' },
                { type: TokenType.COMMA, value: ',' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.IDENTIFIER, value: 'and' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.IDENTIFIER, value: 'hello' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.IDENTIFIER, value: 'world' },
                { type: TokenType.DELIMITER, value: '!' },
                { type: TokenType.EOF, value: '<end>' },
            ]);
        });

        it('should tokenize a simple mathematical expression', () => {
            const code = '10 * (5 - 2)';
            const tokens = simplifyTokens(new Tokenizer(code).tokens);
            expect(tokens).toEqual([
                { type: TokenType.NUMBER, value: '10' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.STAR, value: '*' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.LPAREN, value: '(' },
                { type: TokenType.NUMBER, value: '5' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.MINUS, value: '-' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.NUMBER, value: '2' },
                { type: TokenType.RPAREN, value: ')' },
                { type: TokenType.EOF, value: '<end>' },
            ]);
        });

        it('should tokenize a CSS function call', () => {
            const code = 'rgb(255, 100, 0)';
            const tokens = simplifyTokens(new Tokenizer(code).tokens);
            expect(tokens).toEqual([
                { type: TokenType.IDENTIFIER, value: 'rgb' },
                { type: TokenType.LPAREN, value: '(' },
                { type: TokenType.NUMBER, value: '255' },
                { type: TokenType.COMMA, value: ',' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.NUMBER, value: '100' },
                { type: TokenType.COMMA, value: ',' },
                { type: TokenType.WHITESPACE, value: ' ' },
                { type: TokenType.NUMBER, value: '0' },
                { type: TokenType.RPAREN, value: ')' },
                { type: TokenType.EOF, value: '<end>' },
            ]);
        });
    });

    describe('Position Tracking', () => {
        it('should correctly track line and column numbers across newlines', () => {
            const code = 'h1\n  color';
            const tokenizer = new Tokenizer(code);
            const tokens = tokenizer.tokens; // Get the full tokens this time

            const h1Token = tokens.find((t) => t.value === 'h1')!;
            const whitespaceToken = tokens.find((t) => t.type === TokenType.WHITESPACE)!;
            const colorToken = tokens.find((t) => t.value === 'color')!;

            // Check start and end of 'h1'
            expect(h1Token.start).toEqual({ index: 0, line: 1, column: 1 });
            expect(h1Token.end).toEqual({ index: 2, line: 1, column: 3 });

            // Check start and end of the whitespace block '\n  '
            expect(whitespaceToken.start).toEqual({ index: 2, line: 1, column: 3 });
            expect(whitespaceToken.end).toEqual({ index: 5, line: 2, column: 3 });

            // Check start and end of 'color' on the new line
            expect(colorToken.start).toEqual({ index: 5, line: 2, column: 3 });
            expect(colorToken.end).toEqual({ index: 10, line: 2, column: 8 });
        });
    });
});