
import Tokenizer from './src/Tokenizer.ts';
import { LinkedList } from './src/LinkedList.ts';
import util from 'util';

const options = {
    depth: null,
    colors: true,
    maxArrayLength: null,
};


const code = 'rgba(100, 255, -50, 50% - 10 + 20)';

const tokenizer = new Tokenizer(code);
const tokens = tokenizer.tokenize();

for (const token of tokens) {
    console.log(`Token ${util.inspect(token, options)}`);
}

console.log();

/* class Node<T> {
    public next: Node<T> | null = null;
    public prev: Node<T> | null = null;

    constructor(public data: T) { }
}

interface ILinkedList<T> {
    add(data: T): Node<T>;
    push(data: T): Node<T>;
    pop(node?: Node<T>): void;
    traverse(): T[];
    length(): number;
    search(comparator: (data: T) => boolean): Node<T> | null;
}


class LinkedList<T> implements ILinkedList<T> {
    private head: Node<T> | null = null;

    public push(data: T): Node<T> {
        const node = new Node(data);
        if (!this.head) {
            this.head = node;
        } else {
            const getLast = (node: Node<T>): Node<T> => {
                return node.next ? getLast(node.next) : node;
            };

            const lastNode = getLast(this.head);
            node.prev = lastNode;
            lastNode.next = node;
        }
        return node;
    }

    public add(data: T): Node<T> {
        const node = new Node(data);
        if (!this.head) {
            this.head = node;
        } else {
            this.head.prev = node;
            node.next = this.head;
            this.head = node;
        }
        return node;
    }

    public pop(node: Node<T>): void {
        node = node || this.head;
        if (!node.prev) {
            this.head = node.next;
        } else {
            const prevNode = node.prev;
            prevNode.next = node.next;
        }
    }

    public search(comparator: (data: T) => boolean): Node<T> | null {
        const checkNext = (node: Node<T>): Node<T> | null => {
            if (comparator(node.data)) {
                return node;
            }
            return node.next ? checkNext(node.next) : null;
        };

        return this.head ? checkNext(this.head) : null;
    }

    public traverse(): T[] {
        const array: T[] = [];
        if (!this.head) {
            return array;
        }

        const addToArray = (node: Node<T>): T[] => {
            array.push(node.data);
            return node.next ? addToArray(node.next) : array;
        };
        return addToArray(this.head);
    }

    public length(): number {
        return this.traverse().length;
    }

    public *[Symbol.iterator](): Iterator<T[]> {
        const array: T[] = [];
        if (!this.head) {
            return array;
        }

        const addToArray = (node: Node<T>): T[] => {
            array.push(node.data);
            return node.next ? addToArray(node.next) : array;
        };
        yield addToArray(this.head);
    }
} */

interface Post {
    title: string;
}

const linkedList = new LinkedList();

linkedList.log() // [];

linkedList.append({ title: "Post A" });
linkedList.append({ title: "Post B" });
linkedList.prepend({ title: "Post C" });
linkedList.prepend({ title: "Post D" });

// [{ title : "Post D" }, { title : "Post C" }, { title : "Post A" }, { title : "Post B" }];
console.log();

console.log(util.inspect(linkedList.log()));

console.log();

// Node { data: { title: "Post A" }, prev: Node, next: Node};
//console.log(util.inspect(linkedList.search(({ title }) => title === "Post A")));
console.log();

console.log(util.inspect(linkedList, options));

console.log();

console.log(linkedList);

console.log();