import {Comment, Element, parseHtml} from './parser';

test('basic test', () => {
    const dom = parseHtml('<b>Hello</b>');
    expect(dom[0]).toBeInstanceOf(Element);
    expect((dom[0] as Element).tagName).toBe('b');
    expect((dom[0] as Element).innerText).toBe('Hello');
});

test('Test with comment', () => {
    const dom = parseHtml('<!--ABC-->');
    expect(dom[0]).toBeInstanceOf(Comment);
    expect((dom[0] as Comment).innerText).toBe('ABC');
});

test('Test complex innerText', () => {
    const dom = parseHtml('<div> A \n<br>B</div>');
    expect(dom[0]).toBeInstanceOf(Element);
    expect((dom[0] as Element).innerText).toBe(' A \nB');
});

test('Test parse attributes', () => {
    const dom = parseHtml('<div style="color: black" id="x"></div>');
    expect(dom[0]).toBeInstanceOf(Element);
    expect((dom[0] as Element).attributes).toEqual({style: 'color: black', id: 'x'});
});