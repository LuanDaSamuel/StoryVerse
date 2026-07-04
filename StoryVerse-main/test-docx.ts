import * as htmlDocx from 'html-docx-js/dist/html-docx';
const doc = (htmlDocx as any).asBlob("<h1>Test</h1>");
console.log(doc);
