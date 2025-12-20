import { BOLD, BrGREEN, CYAN, MAGENTA, RED, RESET, WHITE, YELLOW } from './AnsiCodes.ts';
import Banner from './Banner';
import type { Token } from './Lexer.ts'
import { Tree } from './PrettyTree.ts';

export default class TokenReport {
    private readonly maxLength: number;
    private readonly maxSourceLength: number;
    private readonly title: string;
    private readonly source: string;
    private readonly tokens: Token[];
    private readonly errorCount: number;

    // Colors
    private titleColor: string = CYAN;
    private barColor: string = WHITE;
    private headingColor: string = BrGREEN;
    private arrowColor: string = MAGENTA + BOLD;
    private dataColor: string = YELLOW + BOLD;
    private errorColor: string = RED + BOLD;

    // Small Pieces
    private tabs: string = `\t\t`;
    private rightArrow: string = `${this.arrowColor}►\t\t${RESET}`;
    private leftArrow: string = `${this.arrowColor}\t\t◄${RESET}`;
    private first: string = '';
    private second: string | undefined = undefined;

    // Padding
    private rTitlePadding: number = 0;
    private lTitlePadding: number = 0;
    private totalTitleLength: number = 0;

    // Larger Report Pieces
    private bar: string = '';
    private longBar: string = '';
    private leftTitle: string = '';
    private rightTitle: string = '';
    private centerTitle: string = '';
    private errorHeading: string = '';
    private errorRedCount: string = '';
    private sourceStringHeading = '';
    private sourceStringFirst = '';
    private sourceStringSecond = '';
    private sourceLengthHeading = '';
    private sourceLength = '';

    // Building Report
    private barRow = '';
    private longBarRow = '';
    private titleRow = '';
    private errorRow = '';
    private sourceStringHeadingRow = '';
    private sourceStringFirstRow = '';
    private sourceStringSecondRow = '';
    private sourceLengthHeadingRow = '';
    private sourceLengthRow = '';
    private treeRow: string | undefined = undefined;
    private banner: Banner | undefined = undefined;

    constructor(
        maxLength: number,
        title: string,
        source: string,
        tokens: Token[],
        errorCount: number
    ) {

        this.maxLength = maxLength ?? 100;
        this.maxSourceLength = this.maxLength / 2;
        this.title = title ?? '';
        this.source = source ?? '';
        this.tokens = tokens ?? [];
        this.errorCount = errorCount ?? 0;
        this.init();
    }

    private init() {
        // Make sure source string does not exceed max width
        const [result1, result2] = this.splitString(this.source, this.maxSourceLength);
        this.first = result1 ?? '';
        this.second = result2 ?? '';

        // Calculate Padding
        this.rTitlePadding = Math.ceil((this.maxLength - this.title.length) / 2);
        const remainder = this.rTitlePadding % 2;
        this.lTitlePadding = (remainder === 0) ? this.rTitlePadding : this.rTitlePadding + remainder;
        this.totalTitleLength = this.lTitlePadding + this.title.length + this.rTitlePadding;
        if (this.totalTitleLength > this.maxLength) {
            const targetLength = this.totalTitleLength - this.maxLength;
            this.rTitlePadding -= targetLength;
        }

        // Larger Report Pieces
        this.bar = '═'.repeat(this.maxLength);
        this.longBar = '█'.repeat(this.maxLength)
        this.leftTitle = '█'.repeat(this.lTitlePadding);
        this.rightTitle = '█'.repeat(this.rTitlePadding);

        this.centerTitle = `${this.titleColor}${this.title}${RESET}`;
        this.errorHeading = `${this.headingColor}Error Count:\t${RESET}`;
        this.errorRedCount = `${this.errorColor}${this.errorCount}${RESET}`;
        this.sourceStringHeading = `${this.headingColor}${BOLD}Input String:${RESET}`;
        this.sourceStringFirst = `${this.dataColor}${this.first}${RESET}`;
        this.sourceStringSecond = this.second ? `${this.dataColor}${this.second}${RESET}` : '';
        this.sourceLengthHeading = `${this.headingColor}${BOLD}Input Length:${RESET}`;
        this.sourceLength = `${this.dataColor}${this.source.length}${RESET}`;

        // Building Report
        this.barRow = `${this.barColor}${this.bar}${RESET}`;
        this.longBarRow = `${this.barColor}${this.longBar}${RESET}`;
        this.titleRow = `${this.leftTitle}${this.centerTitle}${this.rightTitle}`;
        this.errorRow = `${this.errorHeading}${this.errorRedCount}`;
        this.sourceStringHeadingRow = `${this.sourceStringHeading}\n`;
        this.sourceStringFirstRow = `${this.tabs}${this.rightArrow}${this.sourceStringFirst}${this.leftArrow}`;
        this.sourceStringSecondRow = this.second ? `${this.tabs}${this.rightArrow}${this.sourceStringSecond}${this.leftArrow}` : '';
        this.sourceLengthHeadingRow = `${this.sourceLengthHeading}\n`;
        this.sourceLengthRow = `${this.tabs}${this.sourceLength}`;

        this.treeRow = Tree(this.tokens, 'Token Tree', 'Token', this.createTokenTree);
        this.banner = new Banner(this.maxLength, ' COMPLETED TOKENIZATION!!! ');
    }

    private createTokenTree = (tokens: Token[], rootLabel: string = 'Token Tree') => {
        return {
            label: rootLabel,
            nodes: tokens.map((token, index) => ({
                label: `Token [${index}] (${token.type})`,
                leaf: token
            }))
        };
    }

    private splitString(str: string, maxLength?: number): string[] {
        maxLength = maxLength ?? 50;
        if (str.length <= maxLength) return [str];
        const midpoint = Math.ceil(str.length / 2);
        if (midpoint > 45) return [str];
        const first = str.substring(0, midpoint);
        const second = str.substring(midpoint);
        return [first, second];
    }

    public show() {
        console.log(`\n${this.barRow}`);
        console.log(`${this.longBarRow}`);
        console.log(`${this.titleRow}`);
        console.log(`${this.longBarRow}`);
        console.log(`${this.barRow}`);
        console.log(`${this.errorRow}`);
        console.log(`${this.sourceStringHeadingRow}`);
        console.log(`${this.sourceStringFirstRow}`);
        console.log((this.second) ? `${this.sourceStringSecondRow}\n` : `\n`);
        console.log(`${this.barRow}`);
        console.log(`${this.sourceLengthHeadingRow}`);
        console.log(`${this.sourceLengthRow}\n`);
        console.log(`${this.barRow}\n`);
        console.log(`${this.treeRow}`);
        console.log(`${this.barRow}`);
        if (this.banner) this.banner.show();
    }
}