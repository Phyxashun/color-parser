/*
ANSI escape codes for console logging are categorized into 
Text Styles, Colors (Foreground and Background), and Cursor 
Controls. In JavaScript, these sequences typically start 
with the escape character \x1b[ (or \033[ in some 
environments) and end with the letter m. 

* 1. Text Styles. 
These codes change the appearance of the text.
    
*           Style           Code        Reset Code
*   ------------------------------------------------
        Reset / Normal	     0              —
        Bold	             1	            22
        Dim / Faint	         2	            22
        Italic	             3	            23
        Underline	         4	            24
        Double Underline	 21	            24
        Blink	             5	            25
        Inverse	             7	            27
        Hidden	             8	            28
        Strikethrough	     9	            29
*   ------------------------------------------------

* 2. Standard 16 Colors.
These are divided into Normal and Bright/Bold versions. 

*       Color	        Foreground  Background  Bright FG   Bright BG
*   --------------------------------------------------------------------
        Black	            30	        40	        90	        100
        Red	                31	        41	        91	        101
        Green	            32	        42	        92	        102
        Yellow	            33	        43	        93	        103
        Blue	            34	        44	        94	        104
        Magenta	            35	        45	        95	        105
        Cyan	            36	        46	        96	        106
        White	            37	        47	        97	        107
*   --------------------------------------------------------------------

* 3. Extended Color Support.
For modern terminals, you can use more than just the basic 16 colors. 

        256 Colors:         \x1b[38;5;{ID}m (Foreground) or 
                            \x1b[48;5;{ID}m (Background), where ID is 0-255.
        TrueColor (RGB):    \x1b[38;2;{r};{g};{b}m (Foreground) or 
                            \x1b[48;2;{r};{g};{b}m (Background).

* 4. Cursor and Screen Control.
These sequences manage the terminal display rather than just text style. 

*           Action	                Code Sequence
*   ------------------------------------------------
        Clear Screen	                \x1b[2J
        Clear Line	                    \x1b[2K
        Move to Home (0,0)	            \x1b[H
        Move Up n Lines	                \x1b[{n}A
        Move Down n Lines	            \x1b[{n}B
        Move Right n Columns	        \x1b[{n}C
        Move Left n Columns	            \x1b[{n}D
        Save Cursor Position	        \x1b[s
        Restore Cursor Position	        \x1b[u
*   ------------------------------------------------

* 5. Usage Tip.
You can combine codes using semicolons. 
For example, Bold Red on Yellow Background would be:

*   \x1b[1;31;43m Your Text \x1b[0m.
*                 ---------
*/
import util from 'util';
import { type ArchyNode, type ArchyNodes, Tree } from './PrettyTree.ts';

const Codes = [
    { Pre: '\x1b[' }, // or octal: '\033['
    { Suf: 'm' },
    { Sep: ',' },

    // BASIC CODES
    { Reset: '0' },
    { Bold: '1' },
    { Dim: '2' },
    { Italic: '3' },
    { Underline: '4' },
    { DoubleUnderline: '21' },
    { Blink: '5' },
    { Inverse: '7' },
    { Hidden: '8' },
    { Strikethrough: '9' },

    // FOREGROUND
    { Black: '30' },
    { Red: '31' },
    { Green: '32' },
    { Yellow: '33' },
    { Blue: '34' },
    { Magenta: '35' },
    { Cyan: '36' },
    { White: '37' },

    // BACKGROUND
    {
        Bg: {
            Black: '40',
            Red: '41',
            Green: '42',
            Yellow: '43',
            Blue: '44',
            Magenta: '45',
            Cyan: '46',
            White: '47',
        }
    },

    // BRIGHT FOREGROUND AND BACKGROUND
    {
        Br: {
            Fg: {
                Black: '90',
                Red: '91',
                Green: '92',
                Yellow: '93',
                Blue: '94',
                Magenta: '95',
                Cyan: '96',
                White: '97',
            },
            Bg: {
                Black: '100',
                Red: '101',
                Green: '102',
                Yellow: '103',
                Blue: '104',
                Magenta: '105',
                Cyan: '106',
                White: '107',
            }
        }
    },

    // EXTENDED COLOR SUPPORT: 256 Colors; where ID is 0-255
    {
        256: {
            Fg: (ID: number) => `38;5;{${ID}}`,
            Bg: (ID: number) => `48;5;{${ID}}`,
        }
    },

    // EXTENDED COLOR SUPPORT: TrueColor (RGB), where r, g, b are 0-255
    {
        True: {
            Fg: (r: number, g: number, b: number) => `38;2;{${r}};{${g}};{${b}}`,
            Bg: (r: number, g: number, b: number) => `48;2;{${r}};{${g}};{${b}}`,
        }
    },

    // SCREEN CONTROL
    {
        Clear: {
            Screen: '2J',
            Line: '2K',
        }
    },

    // CURSOR CONTROL
    {
        Cursor: {
            SavePosition: 's',
            RestorePosition: 'u',
            Move: {
                Home: 'H', // (0, 0)
                Up: (n: number) => `{${n}}A`,
                Down: (n: number) => `{${n}}B`,
                Right: (n: number) => `{${n}}C`,
                Left: (n: number) => `{${n}}D`,
            }
        }
    },
];

/**
 * A custom tree data creation function for the 'Codes' object that preserves
 * the structure needed for PrettyTree to apply colors.
 * @param data The array of code objects.
 * @param rootLabel The label for the root of the tree.
 * @returns An ArchyNode object ready for rendering.
 */
const createAnsiCodesTree = (data: any, rootLabel = 'Ansi Escape Codes') => {
    const processNestedObject = (obj: Object): ArchyNodes => {
        return Object.entries(obj).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                return {
                    label: key,
                    nodes: processNestedObject(value)
                };
            }
            return {
                label: key,
                leaf: {
                    code: typeof value === 'function' ? value.toString() : value
                }
            };
        });
    };
    const topLevelNodes = data.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
            return {
                label: item,
                nodes: processNestedObject(item)
            };
        }
        return {
            label: item,
            leaf: {
                code: typeof item === 'function' ? (item as unknown as string).toString() : item
            }
        };
    });
    return {
        label: rootLabel,
        nodes: topLevelNodes
    };
};


const options = {
    depth: null,
    colors: true,
    maxArrayLength: null,
};

const ansi = createAnsiCodesTree(Codes);

//console.log(util.inspect(Codes, options));

//console.log(util.inspect(ansi, options));

console.log(Tree([ansi], "Ansi Escape Codes", "Codes", createAnsiCodesTree, true, false));

