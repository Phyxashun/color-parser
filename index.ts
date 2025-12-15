import Tokenizer from './src/Tokenizer.ts';
import util from 'util';

const options = {
    depth: null,
    colors: true,
    maxArrayLength: null,
};

//const code = 'rgba(100, 255, -50, 50% - 10 + 20)';
const code = '#12345';

const tokenizer = new Tokenizer(code);
const tokens = tokenizer.tokenize();

for (const token of tokens) {
    console.log(`Token ${util.inspect(token, options)}`);
}