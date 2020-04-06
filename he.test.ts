import {htmlDecode} from './he';

test('simple named entities', () => {
  const res = htmlDecode('&aring;&auml;&ouml;');
  expect(res).toBe('åäö');
});

test('simple numbered entities', () => {
  const res = htmlDecode('&aring;&auml;&ouml;');
  expect(res).toBe('åäö');
});
