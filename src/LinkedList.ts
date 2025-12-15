import type { Token } from '../types/TokenizerTypes.ts';

interface IListNode<T extends Token> {
    data: any;
    next: IListNode<T> | null;
    prev: IListNode<T> | null;
}

export class ListNode implements IListNode<Token> {
    data: any;
    next: ListNode | null;
    prev: ListNode | null;

    constructor(data: any) {
        this.data = data;
        this.next = null;
        this.prev = null;
    }
}

export class LinkedList {
    head: ListNode | null;
    tail: ListNode | null;
    size: number;

    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    // add a data to the end of the list (TAIL)
    append(data: any): void {
        const newNode: ListNode = new ListNode(data);
        if (this.tail) {
            this.tail.next = newNode;
            newNode.prev = this.tail;
            this.tail = newNode;
        } else {
            this.head = newNode;
            this.tail = newNode;
        }
        this.size++;
    }

    // add data to the start of the list (HEAD)
    prepend(data: any): void {
        const newNode: ListNode = new ListNode(data);
        if (this.head) {
            this.head.prev = newNode;
            newNode.next = this.head;
            this.head = newNode;
        } else {
            this.head = newNode;
            this.tail = newNode;
        }
        this.size++;
    }

    // insert data at a specific position
    insertAt(data: any, position: number): void {
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
        let currentNode: ListNode = this.head as ListNode;
        let index: number = 0;
        while (index < position) {
            currentNode = currentNode.next as ListNode;
            index++;
        }
        const newNode: ListNode = new ListNode(data);
        newNode.next = currentNode;
        newNode.prev = currentNode.prev;
        (currentNode.prev as ListNode).next = newNode;
        currentNode.prev = newNode;
        this.size++;
    }

    // remove a node at a specific position ad return its data
    removeAt(position: number): any {
        if (position < 0 || position > this.size - 1) {
            throw Error('Position ' + position + ' is not in the list');
        }
        if (position == 0) {
            return this.removeHead();
        }
        if (position == this.size - 1) {
            return this.removeTail();
        }
        let current: ListNode = this.head as ListNode;
        let index: number = 0;
        while (index < position) {
            current = current.next as ListNode;
            index++;
        }
        (current.prev as ListNode).next = current.next;
        (current.next as ListNode).prev = current.prev;
        this.size--;
        return current.data;
    }

    // return node data at a specific position
    getAt(position: number): any {
        if (position < 0 || position >= this.size) {
            throw Error('Position ' + position + ' is not in the list');
        }
        let current = this.head;
        let index = 0;
        while (index < position) {
            current = (current as ListNode).next;
            index++;
        }
        return (current as ListNode).data;
    }

    // return head data
    getHead(): any {
        if (this.size == 0) {
            throw Error('No head in an empty list');
        }
        return (this.head as ListNode).data;
    }

    // return tail data
    getTail(): any {
        if (this.size == 0) {
            throw Error('No tail in an empty list');
        }
        return (this.tail as ListNode).data;
    }

    // remove list head and return its data
    removeHead(): any {
        if (this.size == 0) {
            throw Error('No head in an empty list');
        }
        const data: any = (this.head as ListNode).data;
        this.head = (this.head as ListNode).next;
        if (this.head) {
            this.head.prev = null;
        } else {
            this.tail = null;
        }
        this.size--;
        return data;
    }

    // remove list tail and return its data
    removeTail(): any {
        if (this.size == 0) {
            throw Error('No tail in an empty list');
        }
        const data: any = (this.tail as ListNode).data;
        this.tail = (this.tail as ListNode).prev;
        if (this.tail) {
            this.tail.next = null;
        } else {
            this.head = null;
        }
        this.size--;
        return data;
    }

    // print list content in the console
    log(): void {
        if (this.size == 0) {
            console.log('Empty list');
            return;
        }
        let current: ListNode = this.head as ListNode;
        let result: any[] = [];
        for (let i: number = 0; i < this.size; i++) {
            result.push(current.data);
            if (current.next) {
                current = current.next;
            }
        }
        console.log(result.join(' <-> '));
    }

    public *[Symbol.iterator](): Iterator<ListNode> {
        let current: ListNode = this.head as ListNode;

        for (let i: number = 0; i < this.size; i++) {
            yield current.data;

            if (current.next) {
                current = current.next;
            }
        }
    }
}