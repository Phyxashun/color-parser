type CharType = typeof Character.CharType[keyof typeof Character.CharType];
type CharTypeFn = (char: string) => boolean;
type ClassifyFunction = (char: string) => CharType;
type CharSpecType = [CharType, CharTypeFn][] // SigmaType
type Predicate = (token: Character) => boolean;
type Char = string;

// ICharacter
export interface ICharacter {
    value: Char | undefined;
    type: CharType | undefined;
    index: number;
    line: number;
    column: number;
}

export {
    CharType,
    CharTypeFn,
    ClassifyFunction,
    CharSpecType,
    Predicate,
    Char,
    ICharacter
};