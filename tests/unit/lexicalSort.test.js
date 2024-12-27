const LexicalSort = require('../../src/core/strategies/lexicalSort');

describe('LexicalSort Strategy', () => {
  const unsortedFiles = [
    { relativePath: 'src/utils.js' },

    { relativePath: 'README.md' },
    { relativePath: 'src/main.js' }
  ];

  test('should sort files lexically by relativePath', () => {
    const lexicalSort = new LexicalSort();
    const sortedFiles = lexicalSort.sort([...unsortedFiles]);
    expect(sortedFiles[0].relativePath).toBe('README.md');
    expect(sortedFiles[1].relativePath).toBe('src/main.js');
    expect(sortedFiles[2].relativePath).toBe('src/utils.js');
  });

  test('should handle empty array', () => {
    const lexicalSort = new LexicalSort();
    const sortedFiles = lexicalSort.sort([]);
    expect(sortedFiles).toEqual([]);
  });

  test('should handle duplicate paths', () => {
    const duplicates = [
      { relativePath: 'src/utils.js' },
      { relativePath: 'src/utils.js' }
    ];
    const lexicalSort = new LexicalSort();
    const sortedFiles = lexicalSort.sort([...duplicates]);
    expect(sortedFiles).toEqual(duplicates);
  });
});

