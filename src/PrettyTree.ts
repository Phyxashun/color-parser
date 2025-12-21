// src/PrettyTree.ts

import archy from 'archy';
import Chalk from 'chalk';

export type ArchyNodes = (string | archy.Data)[];

export interface ArchyNode extends archy.Data {
    label: string;
    nodes?: ArchyNodes;
}

// A simple function that does nothing when colors are disabled
const Echo: ((s: string) => string) = (val: string) => val;

class PrettyTree {
    // Private fields to hold the configuration and colors
    private sameLine: boolean;
    private useColor: boolean;
    private primaryLabelColor: typeof Chalk | typeof Echo;
    private secondaryKeyColor: typeof Chalk | typeof Echo;
    private tertiaryColor: typeof Chalk | typeof Echo;
    private structureColor: typeof Chalk | typeof Echo;

    /**
     * Creates an instance of PrettyTree.
     * @param useColor Set to false to disable colors in the output.
     */
    constructor(useColor: boolean = true, sameLine: boolean = false) {
        this.useColor = useColor;
        this.sameLine = sameLine;

        // Set up the color functions based on the constructor argument
        this.primaryLabelColor = this.useColor ? Chalk.greenBright : Echo;
        this.secondaryKeyColor = this.useColor ? Chalk.redBright : Echo;
        this.structureColor = this.useColor ? Chalk.cyan : Echo;
        this.tertiaryColor = this.useColor ? Chalk.blue : Echo;
    }

    /**
     * Renders a hierarchical tree from a data object.
     * @param data The root node of the data to render.
     * @returns A string containing the formatted tree.
     */
    public render(data: ArchyNode & { leaf?: object }): string {
        const colWidths = this.calculateGlobalColumnWidths(data);

        const archyTree: ArchyNode = this.visit(data, colWidths);

        return archy(archyTree)
            .replace(/([├└])─┬ \n[│ ]+├/gm, '$1─┬')
            .replace(/([├└])─┬ \n[│ ]+└/gm, '$1──')
            .replace(/[┬├─└│┐]/g, (char) => this.structureColor(char));
    }

    private calculateGlobalColumnWidths(node: ArchyNode & { leaf?: object }) {
        let maxKey = 0;
        let maxValue = 0;

        const traverse = (n: ArchyNode & { leaf?: object }) => {
            if (n.leaf) {
                Object.entries(n.leaf).forEach(([key, val]) => {
                    maxKey = Math.max(maxKey, key.length + 1); // +1 for colon
                    maxValue = Math.max(maxValue, String(val).length);
                });
            }
            n.nodes?.forEach(child => typeof child !== 'string' && traverse(child));
        };

        traverse(node);
        return { maxKey, maxValue };
    }

    /**
     * Recursively visits each node in the data structure to apply formatting.
     */
    private visit = (node: ArchyNode & { leaf?: object }, widths: { maxKey: number, maxValue: number }): ArchyNode => {
        const newNode = { ...node };
        if (newNode.label) newNode.label = this.primaryLabelColor(newNode.label);

        let nodes: ArchyNodes = [];
        if (newNode.nodes) {
            nodes = newNode.nodes.map(child =>
                typeof child === 'string' ? child : this.visit(child, widths)
            );
        }

        if (newNode.leaf) {
            nodes = nodes.concat(this.formatLeaf(newNode.leaf, widths));
        }

        newNode.nodes = nodes.length > 0 ? nodes : [this.structureColor('(empty)')];
        return newNode;
    };

    /**
     * Formats the key-value pairs of a final "leaf" object.
     */
    private formatLeaf = (obj: object, widths: { maxKey: number, maxValue: number }): ArchyNodes => {
        const keys = Object.keys(obj);
        if (keys.length === 0) return [this.structureColor('(empty)')];

        const formattedParts = keys.map(key => {
            const valStr = String(obj[key as keyof typeof obj]);

            // CRITICAL: Pad raw strings BEFORE applying colors
            const paddedKey = (key + ':').padEnd(widths.maxKey + 2);
            const paddedValue = valStr.padEnd(widths.maxValue);

            return `${this.secondaryKeyColor(paddedKey)}${this.tertiaryColor(paddedValue)}`;
        });

        return this.sameLine
            ? [formattedParts.join(' ')]
            : formattedParts;
    };

    /**
     * A private helper to check if a value is a primitive.
     */
    private static isAtomic(v: any): boolean {
        return v === null || v === undefined || typeof v !== 'object';
    }

    /**
     * Transforms an array into a hierarchical data structure
     * suitable for rendering with pretty-tree.
     *
     * @param data - An array of objects.
     * @param rootLabel - The main title for the root of the tree.
     * @param leafLabel - The title for the leaves of the tree.
     * @returns An ArchyNode object ready to be rendered.
     */
    public static createTreeData = (
        data: any,
        rootLabel: string = 'Data Stream',
        leafLabel: string = 'Data'
    ): ArchyNode => {
        return {
            label: `${rootLabel}`,
            nodes: data.map((item: any, index: number) => ({
                label: `${leafLabel} [${index}]`,
                leaf: item,
            }))
        };
    }

    /**
     * Transforms an array into a hierarchical data structure
     * suitable for rendering with pretty-tree.
     *
     * @param data - An array of objects.
     * @param rootLabel - The main title for the root of the tree.
     * @param leafLabel - The title for the leaves of the tree.
     * @param fn - An optional function to create the tree data.
     * @returns An pretty tree formatted string to output to the console.
     */
    public static tree = (
        data: any,
        rLabel?: string,
        lLabel?: string,
        fn?: (data: any, rootLabel?: string, leafLabel?: string) => ArchyNode,
        color?: boolean,
        sameLine?: boolean,
    ) => {
        fn = fn ?? PrettyTree.createTreeData;
        color = color || true;
        sameLine = sameLine || false;
        // Create a color-enabled PrettyTree Instance
        const prettyTree = new PrettyTree(color, sameLine);
        // Create the tree data required for the render method
        const treeData = fn(data, rLabel, lLabel);
        // Return the pretty tree formatted data
        return prettyTree.render(treeData);
    }
}

export default PrettyTree;
export const Tree = PrettyTree.tree;
export const CreateTreeData = PrettyTree.createTreeData;


