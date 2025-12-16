// index.ts

import Tokenizer, { DiagnosticError, formatDiagnostic } from './src/Tokenizer.ts';
import util from 'util';

const options = {
    depth: null,
    colors: true,
    maxArrayLength: null,
};

//const code = 'rgba(100, 255, -50, 50% - 10 + 20)';

//const code = '#ffffff';

//const code = 'rgba(100 200 255 / 50%)'

const code = "Hello 'TypeScript', and hello world!";

const tokenizer = new Tokenizer(code);
const tokens = tokenizer.tokens;

for (const token of tokens) {
    console.log(util.inspect(token, options));
}