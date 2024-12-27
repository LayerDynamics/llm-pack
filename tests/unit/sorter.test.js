const Sorter = require('../../src/core/sorter');
const LexicalSort = require('../../src/core/strategies/lexicalSort');

jest.mock('../../src/utils/logger');

describe('Sorter', () => {
  const mockFiles = [
    {
      fileName: 'main.js',
      relativePath: 'src/main.js',
      metadata: { description: 'Entry point of the application', dependencies: [] },
      content: 'console.log("main");',
    },
    {
      fileName: 'README.md',
      relativePath: 'README.md',
      metadata: { description: 'Markdown documentation file', dependencies: [] },
      content: '# Project',
    },
  ];

  test('should sort files lexically by relativePath', () => {
    const lexicalSort = new LexicalSort();

    const sorter = new Sorter(lexicalSort);
    const sortedFiles = sorter.sort([...mockFiles]);
    expect(sortedFiles[0].relativePath).toBe('README.md');
  });

  test('should throw error if strategy is not set', () => {
    const sorter = new Sorter();
    expect(() => sorter.sort(mockFiles)).toThrow('Invalid sorting strategy.');
  });

  test('should allow changing strategy', () => {
    const lexicalSort = new LexicalSort();
    const sorter = new Sorter(lexicalSort);
    sorter.setStrategy(lexicalSort);
    const sortedFiles = sorter.sort([...mockFiles]);
    expect(sortedFiles[0].relativePath).toBe('README.md');
  });
});

