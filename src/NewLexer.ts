
interface Token {
    type: TokenType;
    value: string;
}

type SpecFn = (char: string) => boolean;
type Spec = [CharClass, SpecFn][]
type TransitionType = Record<State, Partial<Record<CharClass, State>>>;
type AcceptingType = Partial<Record<State, TokenType>>;

enum TokenType {
    WHITESPACE = 'WHITESPACE',
    LETTER = 'LETTER',
    IDENTIFIER = 'IDENTIFIER',
    EOF = 'EOF'
};

enum CharClass {
    Whitespace,
    Letter,
    Word,
    Digit,
    Unknown,
    EOF,
}

const CharSpec: Spec = [
    [CharClass.Whitespace, (char: string) => /\s/.test(char)],
    [CharClass.Letter, (char: string) => /[a-z]/i.test(char)],
    [CharClass.Digit, (char: string) => /\d/.test(char)],
    [CharClass.EOF, (char: string) => /$(?![\r\n])/.test(char)]
]

enum State {
    Start = '<start>',
    Whitespace = '<whitespace>',
    Identifier = '<identifier>',
}

const Transition: TransitionType = {
    [State.Start]: {
        [CharClass.Whitespace]: State.Whitespace,
        [CharClass.Letter]: State.Identifier,
    },

    [State.Whitespace]: {
        [CharClass.Whitespace]: State.Whitespace,
    },

    [State.Identifier]: {
        [CharClass.Letter]: State.Identifier,
    },
}

const Accepting: AcceptingType = {
    [State.Whitespace]: TokenType.WHITESPACE,
    [State.Identifier]: TokenType.IDENTIFIER,
}


const tokenize = (input: string): Token[] => {
    const source: string = input ?? '';
    let cursor: number = 0;
    const tokens: Token[] = [];

    console.log("CURSOR:", cursor);
    console.log("SOURCE.LENGTH:", source.length);

    const isEOF = () => {
        return (cursor >= source.length) ? true : false;
    }

    const classify = (char: string): CharClass | undefined => {
        for (const [charClass, fn] of CharSpec) {
            if (fn(char)) return charClass;
        }
        return undefined;
    }

    while (!isEOF()) {
        let state: State = State.Start;
        const startPos: number = cursor;

        while (true) {
            // At the end of input, break
            if (isEOF()) break;

            // Get the current character
            let char = source[cursor] as string;

            // Get the class of the current character
            const charClass = classify(char);

            // If undefined break
            if (charClass === undefined) break;

            // Get the transition state based on the current character class
            const nextState: any = Transition[state]?.[charClass];

            // If not state, break
            if (nextState === undefined) break;

            // Advance to the next state
            state = nextState;

            // Advance the cursor
            cursor++;
        }

        const endPosition = cursor;
        let type;
        const value = source.slice(startPos, endPosition);

        switch (state) {

            case State.Start:
                if (!isEOF()) continue;
                break;
            case State.Whitespace:
                // If we later want to ignore Whitespace...we just continue.
                // continue;
                type = Accepting[state]!;
                tokens.push({
                    type,
                    value: '<whitespace>',
                });
                break;
            case State.Identifier:
                type = Accepting[state]!;
                tokens.push({
                    type,
                    value
                });
                break;
        }
    }

    tokens.push({ type: TokenType.EOF, value: '<end>' });

    return tokens;
};


const code = 'abcde zyxvw';

const tokens = tokenize(code);

console.log(tokens);