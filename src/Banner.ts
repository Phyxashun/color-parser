import { GREEN, RESET, YELLOW } from "./AnsiCodes";

export default class Banner {
    private readonly maxLength: number;
    private readonly title: string;

    // Color Scheme
    private titleColor: string = YELLOW;
    private frameColor: string = GREEN;

    // Banner Border Pieces
    private readonly tlc = `${this.frameColor}╔${RESET}`;
    private readonly trc = `${this.frameColor}╗${RESET}`;
    private readonly blc = `${this.frameColor}╚${RESET}`;
    private readonly brc = `${this.frameColor}╝${RESET}`;
    private readonly h = `${this.frameColor}═${RESET}`;
    private readonly v = `${this.frameColor}║${RESET}`;
    private readonly s = `${this.frameColor}█${RESET}`;

    // Lengths
    private framePieceLength: number = 0;
    private barLength: number = 0;

    // Padding
    private rTitlePadding: number = 0;
    private lTitlePadding: number = 0;
    private totalTitleLength: number = 0;

    // Inner Banner
    private colorTitle: string = '';
    private bar: string = '';
    private space: string = '';
    private lTitle: string = '';
    private rTitle: string = '';

    // Banner Rows
    private topRow: string = '';
    private spaceRow: string = '';
    private titleRow: string = '';
    private bottomRow: string = '';

    constructor(maxLength: number, title?: string) {
        this.maxLength = maxLength ?? 100;
        this.title = title ?? '';

        this.init();
    }

    private init() {
        // Set Lengths
        this.framePieceLength = 2;
        this.barLength = this.maxLength - this.framePieceLength;

        // Set Padding
        this.rTitlePadding = Math.ceil((this.maxLength - this.title.length) / 2);
        const remainder = this.rTitlePadding % 2;
        this.lTitlePadding = (remainder === 0) ? this.rTitlePadding : this.rTitlePadding + remainder;
        this.totalTitleLength = this.lTitlePadding + this.title.length + this.rTitlePadding + this.framePieceLength;
        if (this.totalTitleLength > this.maxLength) {
            this.rTitlePadding = this.rTitlePadding - (this.totalTitleLength - this.maxLength);
        }

        // Build Outer Banner
        this.colorTitle = `${this.titleColor}${this.title}${RESET}`;
        this.bar = this.h.repeat(this.barLength);
        this.space = this.s.repeat(this.barLength);
        this.lTitle = this.s.repeat(this.lTitlePadding);
        this.rTitle = this.s.repeat(this.rTitlePadding);

        // Build Inner Banner
        this.topRow = `${this.tlc}${this.bar}${this.trc}`;
        this.spaceRow = `${this.v}${this.space}${this.v}`;
        this.titleRow = `${this.v}${this.lTitle}${this.colorTitle}${this.rTitle}${this.v}`;
        this.bottomRow = `${this.blc}${this.bar}${this.brc}`;
    }

    // Display the Banner to the Console
    public show() {
        console.log(`${this.topRow}`);
        console.log(`${this.spaceRow}`);
        console.log(`${this.titleRow}`);
        console.log(`${this.spaceRow}`);
        console.log(`${this.bottomRow}\n`);
    }
}