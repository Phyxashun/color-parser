// tests/CharacterStream.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CharacterStream, { Character } from '../src/CharacterStream';

describe('CharacterStream', () => {
    let stream: CharacterStream;
    const testString = 'a\nbc';

    beforeEach(() => {
        stream = new CharacterStream(testString);
    });

    afterEach(() => {
        stream = new CharacterStream(testString);
    })

    describe('1. Constructor and Initialization', () => {
        it('1.A. should initialize with the first character of the input string', () => {
            const char = stream.get();
            expect(char).toBeInstanceOf(Character);
            expect(char.value).toBe('a');
            expect(char.index).toBe(0);
            expect(char.line).toBe(1);
            expect(char.column).toBe(1);
            expect(char.type).toBe(Character.CharType.Letter);
        });

        it('1.B. should handle an empty string as input', () => {
            const emptyStream = new CharacterStream('');
            const char = emptyStream.get();
            expect(char.value).toBe(''); // In JS, accessing an index out of bounds is undefined
            expect(emptyStream.isEOF()).toBe(true);
        });

        it('1.C. should normalize the input string using NFC', () => {
            // 'e' + combining acute accent
            const nonNormalized = 'e\u0301';
            // 'é' precomposed character
            const normalized = '\u00E9';
            expect(nonNormalized.length).toBe(2);
            expect(normalized.length).toBe(1);

            const unicodeStream = new CharacterStream(nonNormalized);
            // @ts-expect-error - Accessing private property for testing
            expect(unicodeStream.source).toBe(normalized);
            expect(unicodeStream.get().value).toBe(normalized);
        });
    });

    describe('2. get()', () => {
        it('2.A. get() should return the current character', () => {
            const char = stream.get();
            expect(char.value).toBe('a');
        });
    });

    describe('3. consume() and advance()', () => {

        it('3.A. should advance to the next character on consume()', () => {
            // Initial state: 'a'
            const initialChar = stream.get();
            expect(initialChar.value).toBe('a');
            expect(initialChar.index).toBe(0);
            expect(initialChar.line).toBe(1);
            expect(initialChar.column).toBe(1);

            // First consume
            stream.consume();
            const charAfterConsume = stream.get();
            expect(charAfterConsume.value).toBe('\n');
            expect(charAfterConsume.index).toBe(1);
            expect(charAfterConsume.line).toBe(1); // Line doesn't update until after the newline is processed
            expect(charAfterConsume.column).toBe(2);
        });//*/

        it('3.B. should correctly update line and column for newlines', () => {
            stream.consume(); // at '\n'
            expect(stream.get().value).toBe('\n');

            stream.consume(); // at 'b'
            const charB = stream.get();
            expect(charB.value).toBe('b');
            expect(charB.index).toBe(2);
            expect(charB.line).toBe(2); // Line incremented
            expect(charB.column).toBe(1); // Column reset
        });//*/

        it('3.C. should correctly update column for regular characters', () => {
            stream.consume(); // at '\n'
            stream.consume(); // at 'b'
            stream.consume(); // at 'c'
            const charC = stream.get();
            expect(charC.value).toBe('c');
            expect(charC.index).toBe(3);
            expect(charC.line).toBe(2);
            expect(charC.column).toBe(2); // Column incremented
        });//*/

        it('3.D. should handle history correctly during consumption', () => {
            expect(stream.history.length).toBe(0);

            // consume() is called inside next()
            stream.next(); // now at '\n'
            expect(stream.history.length).toBe(1);
            expect(stream.history[0].value).toBe('a');

            stream.next(); // now at 'b'
            expect(stream.history.length).toBe(2);
            expect(stream.history[1].value).toBe('\n');
        });//*/
    });

    describe('4. isEOF() and EOFChar()', () => {
        it('4.A. isEOF() should be false when not at the end of the stream', () => {
            expect(stream.isEOF()).toBe(false);
        });

        it('4.B. isEOF() should be true when at the end of the stream', () => {
            const shortStream = new CharacterStream('ab');
            shortStream.consume(); // at 'b'
            shortStream.consume(); // at EOF
            expect(shortStream.isEOF()).toBe(true);
        });

        it('4.C. consume() should return an EOF character at the end of the stream', () => {
            stream.consume(); // at '\n'
            stream.consume(); // at 'b'
            stream.consume(); // at 'c'
            stream.consume(); // at EOF

            const eofChar = stream.get();
            expect(stream.isEOF()).toBe(true);
            expect(eofChar.type).toBe(Character.CharType.EOF);
            expect(eofChar.value).toBe('');
            // Position should be the one after the last character
            expect(eofChar.index).toBe(4);
            expect(eofChar.line).toBe(2);
            expect(eofChar.column).toBe(3);
        });
    });

    describe('5. Iterator Protocol (next)', () => {

        it('5.A. should iterate through all characters and signal done', () => {
            // 0. 'a'
            let result = stream.next();
            //expect(resultA.done).toBe(false);
            expect(result.value.value).toBe('a');

            // 1. '\n'
            result = stream.next();
            expect(result.done).toBe(false);
            expect(result.value.value).toBe('\n');

            // 2. 'b'
            result = stream.next();
            expect(result.done).toBe(false);
            expect(result.value.value).toBe('b');

            // 3. 'c'
            result = stream.next();
            expect(result.done).toBe(false);
            expect(result.value.value).toBe('c');

            // 4. EOF
            result = stream.next();
            expect(result.done).toBe(true);
            expect(result.value.type).toBe(Character.CharType.EOF);
        });//*/

        it('5.B. should return done: true for subsequent calls after EOF', () => {
            stream.next();
            stream.next();
            stream.next();
            stream.next(); // at EOF now

            const result1 = stream.next();
            expect(result1.done).toBe(true);

            const result2 = stream.next();
            expect(result2.done).toBe(true);
            expect(result2.value.type).toBe(Character.CharType.EOF);
        });//*/
    });

    describe('6. Iterable Protocol ([Symbol.iterator])', () => {
        it('6.A. should be iterable with a for...of loop', () => {
            const chars: string[] = [];
            for (const char of stream) {
                chars.push(char.value as any);
            }
            expect(chars).toEqual(['a', '\n', 'b', 'c']);
        });

        it('6.B. should be spreadable into an array', () => {
            const charArray = [...stream];
            expect(charArray).toHaveLength(4);
            expect(charArray.map(c => c.value)).toEqual(['a', '\n', 'b', 'c']);
        });

        it('6.C. should reset the stream when a new iteration starts', () => {
            // First iteration
            const firstIteration = [...stream].map(c => c.value);
            expect(firstIteration).toEqual(['a', '\n', 'b', 'c']);

            // Stream should be exhausted
            expect(stream.next().done).toBe(true);

            // Second iteration should work because Symbol.iterator resets it
            const secondIteration = [...stream].map(c => c.value);
            expect(secondIteration).toEqual(['a', '\n', 'b', 'c']);
        });
    });

    describe('7. reset()', () => {
        it('7.A. should reset the stream to its initial state', () => {
            // Modify the stream state
            stream.next();
            stream.next();
            expect(stream.get().value).toBe('b');
            expect(stream.history.length).toBe(2);

            // Reset
            const resetResult = stream.reset();
            expect(resetResult).toBe(stream); // should be chainable

            // Check if it's back to the start
            const char = stream.get();
            expect(char.value).toBe('a');
            expect(char.index).toBe(0);
            expect(char.line).toBe(1);
            expect(char.column).toBe(1);
            expect(stream.history.length).toBe(0);
        });
    });

    describe('8. String and Inspection Methods', () => {
        it('8.A. toString() should return the string representation of the current character', () => {
            const charString = stream.get().toString();
            expect(stream.toString()).toBe(charString);
        });

        it('8.B. inspect.custom() should return a formatted string without errors', () => {
            const inspectString = stream[Symbol.for('nodejs.util.inspect.custom')]();
            expect(typeof inspectString).toBe('string');
            expect(inspectString).toContain('Character Stream');
            expect(inspectString).toBe("Character Stream <\u001b[36mCharacter[  0] \u001b[39m< { value: \u001b[32m'a'\u001b[39m, type: \u001b[32m'Letter      '\u001b[39m, index: \u001b[33m0\u001b[39m, line: \u001b[33m1\u001b[39m, column: \u001b[33m1\u001b[39m } >>");
        });

        it('8.C. inspect.custom() should work correctly after consuming characters', () => {
            stream.consume(); // at '\n'
            const inspectString = stream[Symbol.for('nodejs.util.inspect.custom')]();
            expect(typeof inspectString).toBe('string');
            expect(inspectString).toContain('Character Stream');
            expect(inspectString).toBe("Character Stream <\u001b[36mCharacter[  1] \u001b[39m< { value: \u001b[32m'\\n'\u001b[39m, type: \u001b[32m'Newline     '\u001b[39m, index: \u001b[33m1\u001b[39m, line: \u001b[33m1\u001b[39m, column: \u001b[33m2\u001b[39m } >>");
        });
    });//*/
});