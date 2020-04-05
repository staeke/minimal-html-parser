const he = require('he');

const RE_END_TAG_OR_SPACE = /[\s>/]/;
const SELF_CLOSING_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
];

type Attributes = {[name: string]: string};

export abstract class Node {
  abstract get innerText(): string

  abstract get textContent(): string
}

export class Element extends Node {
  constructor(public tagName: string,
              public attributes: Attributes,
              public childNodes: Node[] = []) {
    super();
  }

  get innerText(): string {
    if (this.tagName === 'br')
      return '\n';
    return this.childNodes.map(c => c.innerText).join('');
  }

  get textContent(): string {
    return this.childNodes.map(c => c.textContent).join('');
  }
}

export class CharacterData extends Node {
  constructor(public readonly textContent: string) {
    super();
  }

  get innerText(): string {
    // NOTE: We don't replace nbsp (char code 160) and cannot use /\s/
    return this.textContent.replace(/[\r\n\t \f]+/g, ' ');
  }
}

export class Text extends CharacterData {}

export class Comment extends CharacterData {}

export class DocType extends CharacterData {}

export function parseHtml(str: string): Node[] {
  return parseInnerHtml(str, 0)[1];
}

function parseAssert(cond: boolean, message?: string, str?: string, i?: number): asserts cond {
  if (!cond) {
    if (!str || i == null)
      throw new Error(message || 'Assertion error');
    throw new Error(message + ', at ' + toPos(str, i));
  }
}

function toPos(str: string, i: number): string {
  let line = 1;
  let col = 1;
  for (let pos = 0; pos < str.length; pos++, col++) {
    if (pos === i)
      break;
    if (str[pos] === '\r' || str[pos] === '\n') {
      line++;
      col = 0;
    }
  }
  return `${line}:${col}`;
}

function parseInnerHtml(str: string, i: number): [number, Node[]] {
  const nodes: Node[] = [];
  const startIndex = i;
  let textStart = i;
  while (i < str.length) {
    if (str[i] === '<') {
      if (textStart < i) {
        nodes.push(new Text(he.decode(str.substr(textStart, i - textStart))));
      }
      let child;
      [i, child] = parseElLike(str, i);
      if (!child) { // We hit an outer end tag
        parseAssert(startIndex > 0, 'Unexpected end tag at ', str, i);
        return [i, nodes];
      }
      nodes.push(child);
      textStart = i;
    } else {
      i++;
    }
  }
  if (textStart < i) {
    nodes.push(new Text(he.decode(str.substr(textStart, i - textStart))));
  }
  return [i, nodes];
}

function parseElLike(str: string, i: number): [number, Node|null] {
  parseAssert(str[i] === '<');
  if (str[i + 1] === '!') {
    if (str[i + 2] === '-')
      return parseComment(str, i);
    if (str[i + 2] === 'D')
      return parseDoctype(str, i);
  }
  return parseEl(str, i);
}

function parseComment(str: string, i: number): [number, Node] {
  parseAssert(equalsAt(str, i, '<!--'), 'Unexpected element - neither comment nor element', str, i);
  let content;
  [i, content] = parseToken(str, i + 4, '-->', 'comment');
  return [i, new Comment(content)];
}

function parseDoctype(str: string, i: number): [number, Node] {
  parseAssert(equalsAt(str, i, '<!DOCTYPE'), 'Unexpected element - expected <!DOCTYPE', str, i);
  let content;
  [i, content] = parseToken(str, i + 8, '>', 'doctype closing bracket');
  return [i, new DocType(content)];
}

function parseEl(str: string, i: number): [number, Element|null] {
  parseAssert(str[i] === '<');
  if (str[i + 1] === '/')
    return [i, null];

  let el;
  [i, el] = parseStartTag(str, i);
  if (!SELF_CLOSING_TAGS.includes(el.tagName)) {
    [i, el.childNodes] = parseInnerHtml(str, i);
    parseAssert(str[i] === '<' && str[i + 1] === '/', `Couldn't find end tag for "${el.tagName}"`, str, i);
    let endToken;
    [i, endToken] = parseToken(str, i + 2, '>', 'closing bracket');
    parseAssert(endToken === el.tagName, `Unmatching start/end tags: "${el.tagName}"/"${endToken}"`, str, i);
    return [i + 1, el];
  }
  return [i, el];
}

function parseStartTag(str: string, i: number): [number, Element] {
  let attrs = null as Attributes|null;
  let tagName;
  [i, tagName] = parseToken(str, i + 1, RE_END_TAG_OR_SPACE, 'tag');
  i = ignore(str, '/', i);
  while (str[i] !== '>') {
    let attrName, attrValue;
    [i] = parseToken(str, i, /\w/, 'attribute name');
    [i, attrName, attrValue] = parseAttr(str, i);
    if (!attrs)
      attrs = {};
    attrs[attrName] = attrValue;
    [i] = parseToken(str, i, RE_END_TAG_OR_SPACE, 'tag');
    i = ignore(str, '/', i);
  }
  const el = new Element(tagName, attrs || {});
  if (attrs)
    el.attributes = attrs;
  return [i + 1, el];
}

function parseAttr(str: string, i: number): [number, string, string] {
  let attrName, attrValue;
  [i, attrName] = parseToken(str, i, '=', 'attribute name');
  parseAssert(str[i + 1] === '"', 'Expected " at ', str, i);
  [i, attrValue] = parseToken(str, i + 2, '"', 'attribute name');
  return [i + 1, attrName, he.decode(attrValue, {isAttributeValue: true})];
}

function parseToken(str: string, i: number, delimiter: RegExp|string, typeName: string): [number, string] {
  let j = i;
  if (delimiter instanceof RegExp) {
    while (j < str.length && !delimiter.test(str[j])) {
      j++;
    }
  } else if (delimiter.length === 1) {
    while (j < str.length && str[j] !== delimiter) {
      j++;
    }
  } else {
    while (j < str.length && !equalsAt(str, j, delimiter)) {
      j++;
    }
  }

  const token = str.substr(i, j - i);
  parseAssert(j < str.length, `Unfinished ${typeName}: "${token}"`, str, i);
  return [j, token];
}

function ignore(str: string, char: string, i: number): number {
  if (str[i] === char)
    return i + 1;
  return i;
}

function equalsAt(str: string, i: number, find: string): boolean {
  for (let j = 0; j < find.length; j++) {
    if (str[i + j] !== find[j])
      return false;
  }
  return true;
}
