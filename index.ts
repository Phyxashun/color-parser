
// index.ts

import CharacterStream from './src/CharacterStream.ts';
import { inspect } from 'node:util';

console.log();

const inspectOptions = {
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

const strs = [
    'rgba(100, 255, -50, 50% - 10 + 20)',
    '#ffffff',
    'rgba(100 200 255 / 50%)',
    'Hello "TypeScript", and hello world!',
];

const streams = new Map<string, CharacterStream>()

for (const str of strs) {
    streams.set(str, new CharacterStream(str));
}

for (const str of strs) {
    const stream = streams.get(str) as CharacterStream;

    console.log(`1. RAW STRING [${str}]:\t${str}\n`);
    for (const char of stream) {
        console.log(inspect(char, inspectOptions));
    }
    console.log('\n');
}

for (const index in strs) {
    const stream = streams.get(strs[index]) as CharacterStream;

    console.log(`2. RAW STRING [${index}]:\t${strs[index]}\n`);
    for (const char of stream) {
        console.log(inspect(char, inspectOptions));
    }
    console.log('\n');
}