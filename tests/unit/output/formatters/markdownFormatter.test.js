
const MarkdownFormatter = require('../../../../src/output/formatters/markdownFormatter');

describe('MarkdownFormatter', () => {
  let formatter;

  beforeEach(() => {
    formatter = new MarkdownFormatter();
  });

  test('should format headers correctly', () => {
    const file = { fileName: 'example.js', content: '' };
    const output = formatter.formatFile(file);
    expect(output).toContain('# example.js');
  });

  test('should format code blocks with correct extension', () => {
    const file = { fileName: 'sample.js', content: 'console.log("hello")' };
    const output = formatter.formatFile(file);
    expect(output).toContain('```js');
  });

  test('should handle missing content gracefully', () => {
    const file = { fileName: 'empty.txt' };
    const output = formatter.formatFile(file);
    expect(output).toContain('```txt');
  });
});