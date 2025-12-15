
import Tokenizer from './src/Tokenizer.ts';
import util from 'util';

const options = {
    depth: null,
    colors: true,
    maxArrayLength: null,
};

/**
//const code = 'rgba(100, 255, -50, 50% - 10 + 20)';
const code = '#12345678';

const tokenizer = new Tokenizer(code);
const tokens = tokenizer.tokenize();

for (const token of tokens) {
    console.log(`Token ${util.inspect(token, options)}`);
}
//*/


class Node<T> {
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
}

interface Post {
    title: string;
}

const linkedList = new LinkedList<Post>();

linkedList.traverse() // [];

linkedList.push({ title: "Post A" });
linkedList.push({ title: "Post B" });
linkedList.add({ title: "Post C" });
linkedList.add({ title: "Post D" });

// [{ title : "Post D" }, { title : "Post C" }, { title : "Post A" }, { title : "Post B" }];
console.log(util.inspect(linkedList.traverse()));
console.log();

// Node { data: { title: "Post A" }, prev: Node, next: Node};
console.log(util.inspect(linkedList.search(({ title }) => title === "Post A")));
console.log();

console.log(util.inspect(linkedList, options));
console.log(linkedList);

/*
export class Node {
    data : any;
    next : Node | null;
    prev : Node | null;
    constructor(data : any) {
        this.data = data;
        this.next = null;
        this.prev = null;
    }
}

export class LinkedList {
    head : Node | null;
    tail : Node | null;
    size : number;
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    // add a data to the end of the list (TAIL)
    append(data : any) : void {
        const newNode : Node = new Node(data);
        if (this.tail) {
            this.tail.next = newNode;
            newNode.prev = this.tail;
            this.tail = newNode;
        } else {
            this.head = newNode;
            this.tail = newNode;
        }
        this.size ++;
    }

    // add data to the start of the list (HEAD)
    prepend(data : any) : void {
        const newNode : Node = new Node(data);
        if (this.head) {
            this.head.prev = newNode;
            newNode.next = this.head;
            this.head = newNode;
        } else {
            this.head = newNode;
            this.tail = newNode;
        }
        this.size ++;
    }

    // insert data at a specific position
    insertAt(data : any, position : number) : void {
        if (position < 0 || position > this.size - 1) {
            throw Error('Position ' + position + ' is not in the list');
        }
        if (position == 0) {
            this.prepend(data);
            return;
        }
        if (position == this.size) {
            this.append(data);
            return;
        }
        let currentNode : Node = this.head as Node;
        let index : number = 0;
        while (index < position) {
            currentNode = currentNode.next as Node;
            index ++;
        }
        const newNode : Node = new Node(data);
        newNode.next = currentNode;
        newNode.prev = currentNode.prev;
        (currentNode.prev as Node).next = newNode;
        currentNode.prev = newNode;
        this.size ++;
    }

    // remove a node at a specific position ad return its data
    removeAt(position : number) : any {
        if (position < 0 || position > this.size - 1) {
            throw Error('Position ' + position + ' is not in the list');
        }
        if (position == 0) {
            return this.removeHead();
        }
        if (position == this.size - 1) {
            return this.removeTail();
        } 
        let current : Node = this.head as Node;
        let index : number = 0;
        while (index < position) {
            current = current.next as Node;
            index ++;
        }
        (current.prev as Node).next = current.next;
        (current.next as Node).prev = current.prev;
        this.size --;
        return current.data;
    }

    // return node data at a specific position
    getAt(position : number) : any {
        if (position < 0 || position >= this.size) {
            throw Error('Position ' + position + ' is not in the list');
        }
        let current = this.head;
        let index = 0;
        while (index < position) {
            current = (current as Node).next;
            index ++;
        }
        return (current as Node).data;
    }

    // return head data
    getHead() : any {
        if (this.size == 0) {
            throw Error('No head in an empty list');
        }
        return (this.head as Node).data;
    }

    // return tail data
    getTail() : any {
        if (this.size == 0) {
            throw Error('No tail in an empty list');
        }
        return (this.tail as Node).data;
    }

    // remove list head and return its data
    removeHead() : any {
        if (this.size == 0) {
            throw Error('No head in an empty list');
        }
        const data : any = (this.head as Node).data; 
        this.head = (this.head as Node).next;
        if (this.head) {
            this.head.prev = null;
        } else {
            this.tail = null;
        }
        this.size --; 
        return data;  
    }

    // remove list tail and return its data
    removeTail() : any {
        if (this.size == 0) {
            throw Error('No tail in an empty list');
        }
        const data : any = (this.tail as Node).data; 
        this.tail = (this.tail as Node).prev;
        if (this.tail) {
            this.tail.next = null;
        } else {
            this.head = null;
        }
        this.size --;
        return data;
    }

    // print list content in the console
    log() : void {
        if (this.size == 0) {
            console.log('Empty list');
            return;
        }
        let current : Node = this.head as Node;
        let result : any[] = [];
        for (let i : number = 0; i < this.size; i ++) {
            result.push(current.data);
            if (current.next) {
                current = current.next;
            }
        }
        console.log(result.join(' <-> '));
    }
}
 */