
import Tokenizer from './src/Tokenizer.ts';

import util from 'util';

const options = {
    depth: null,
    colors: true,
    maxArrayLength: null,
};


const code = 'rgba(100, 255, -50, 50% - 10 + 20)';

const tokenizer = new Tokenizer(code);
const tokens = tokenizer.tokenize();
//console.log(util.inspect(tokens, options));

for (const token of tokens) {
    console.log(`Token ${util.inspect(token, options)}`);
}

console.log();




/*
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

console.log(); */