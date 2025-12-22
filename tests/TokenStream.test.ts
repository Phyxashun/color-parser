import { describe, it, expect } from 'vitest';
import { CharStream, CharType } from '../src/TokenStream.ts'; // adjust path as needed

describe('CharStream Iterator', () => {
    it('iterates over simple ASCII string', () => {
        const stream = new CharStream('abc');
        const tokens = [];

        let result = stream.next();
        while (result.value.class !== CharType.EOF) {
            tokens.push(result.value.value);
            result = stream.next();
        }

        expect(tokens).toEqual(['a', 'b', 'c']);
        expect(result.value.class).toBe(CharType.EOF);
    });

    it('peek() does not advance the stream', () => {
        const stream = new CharStream('xy');
        const firstPeek = stream.peek();
        expect(firstPeek.value).toBe('x');

        const firstNext = stream.next().value;
        expect(firstNext.value).toBe('x');

        const secondPeek = stream.peek();
        expect(secondPeek.value).toBe('y');
    });

    it('consume() is equivalent to next().value', () => {
        const stream = new CharStream('pq');
        const c1 = stream.consume();
        const n1 = stream.next().value;
        expect(c1.value).toBe('p');
        expect(n1.value).toBe('q');
    });

    it('rewind() rolls back one token', () => {
        const stream = new CharStream('123');
        const t1 = stream.next().value;
        const t2 = stream.next().value;

        expect(t1.value).toBe('1');
        expect(t2.value).toBe('2');

        const rewound = stream.rewind();
        expect(rewound!.value).toBe('2');

        const nextAfterRewind = stream.next().value;
        expect(nextAfterRewind.value).toBe('2');
    });

    it('handles Unicode characters correctly', () => {
        const stream = new CharStream('a😊世');
        const chars = [];
        let token = stream.next().value;

        while (token.class !== CharType.EOF) {
            chars.push(token.value);
            token = stream.next().value;
        }

        expect(chars).toEqual(['a', '😊', '世']);
    });

    it('returns correct line/column for multi-line input', () => {
        const stream = new CharStream('A\nB\nC');
        const positions: { line: number; column: number }[] = [];

        let token = stream.next().value;
        while (token.class !== CharType.EOF) {
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
        while (t.class !== CharType.EOF) {
            tokens.push({ character: t.value, class: t.class, line: t.line, column: t.column });
            t = stream.next().value;
        }

        expect(tokens).toEqual([
            { character: 'A', class: CharType.Letter, line: 1, column: 1 },
            { character: '\n', class: CharType.Newline, line: 1, column: 2 },
            { character: 'B', class: CharType.Letter, line: 2, column: 1 },
        ]);
    });
});
