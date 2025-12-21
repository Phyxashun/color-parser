import { describe, it, expect } from 'vitest';
import { CharStream, CharClass } from '../src/TokenStream.ts'; // adjust path as needed

describe('CharStream Iterator', () => {
    it('iterates over simple ASCII string', () => {
        const stream = new CharStream('abc');
        const tokens = [];

        let result = stream.next();
        while (result.value.class !== CharClass.EOF) {
            tokens.push(result.value.character);
            result = stream.next();
        }

        expect(tokens).toEqual(['a', 'b', 'c']);
        expect(result.value.class).toBe(CharClass.EOF);
    });

    it('peek() does not advance the stream', () => {
        const stream = new CharStream('xy');
        const firstPeek = stream.peek();
        expect(firstPeek.character).toBe('x');

        const firstNext = stream.next().value;
        expect(firstNext.character).toBe('x');

        const secondPeek = stream.peek();
        expect(secondPeek.character).toBe('y');
    });

    it('consume() is equivalent to next().value', () => {
        const stream = new CharStream('pq');
        const c1 = stream.consume();
        const n1 = stream.next().value;
        expect(c1.character).toBe('p');
        expect(n1.character).toBe('q');
    });

    it('rewind() rolls back one token', () => {
        const stream = new CharStream('123');
        const t1 = stream.next().value;
        const t2 = stream.next().value;

        expect(t1.character).toBe('1');
        expect(t2.character).toBe('2');

        const rewound = stream.rewind();
        expect(rewound!.character).toBe('2');

        const nextAfterRewind = stream.next().value;
        expect(nextAfterRewind.character).toBe('2');
    });

    it('handles Unicode characters correctly', () => {
        const stream = new CharStream('a😊世');
        const chars = [];
        let token = stream.next().value;

        while (token.class !== CharClass.EOF) {
            chars.push(token.character);
            token = stream.next().value;
        }

        expect(chars).toEqual(['a', '😊', '世']);
    });

    it('returns correct line/column for multi-line input', () => {
        const stream = new CharStream('A\nB\nC');
        const positions: { line: number; column: number }[] = [];

        let token = stream.next().value;
        while (token.class !== CharClass.EOF) {
            positions.push({ line: token.line, column: token.column });
            token = stream.next().value;
        }

        expect(positions).toEqual([
            { line: 1, column: 1 }, // 'A'
            { line: 1, column: 2 }, // '\n'
            { line: 2, column: 1 }, // 'B'
            { line: 2, column: 2 }, // '\n'
            { line: 3, column: 1 }, // 'C'
        ]);
    });

    it('returns correct line/column with newline tokens', () => {
        const stream = new CharStream('A\nB');
        const tokens = [];

        let t = stream.next().value;
        while (t.class !== CharClass.EOF) {
            tokens.push({ character: t.character, class: t.class, line: t.line, column: t.column });
            t = stream.next().value;
        }

        expect(tokens).toEqual([
            { character: 'A', class: CharClass.Letter, line: 1, column: 1 },
            { character: '\n', class: CharClass.Newline, line: 1, column: 2 },
            { character: 'B', class: CharClass.Letter, line: 2, column: 1 },
        ]);
    });
});
