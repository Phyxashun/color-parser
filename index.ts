
import Tokenizer, { DiagnosticError, formatDiagnostic } from './src/DFATokenizer.ts';
import util from 'util';

const options = {
    depth: null,
    colors: true,
    maxArrayLength: null,
};

//const code = 'rgba(100, 255, -50, 50% - 10 + 20)';

//const code = '#ffffff';

const code = 'rgba(100 200 255 / 50%)'

const tokenizer = new Tokenizer(code);

try {
    const tokens = tokenizer.tokenize();

    for (const token of tokens) {
        console.log(`Token ${util.inspect(token, options)}`);
    }

} catch (err) {
    if (err instanceof DiagnosticError) {
        console.log();
        console.error(formatDiagnostic(err));
    } else {
        throw err;
    }
}