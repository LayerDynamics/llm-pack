const Sorter = require('../../src/core/sorter');
const LexicalSort = require('../../src/core/strategies/lexicalSort');
const DependencySort = require('../../src/core/strategies/dependencySort');
const Logger = require('../../src/utils/logger');

jest.mock('../../src/utils/logger');

describe('Sorter', () => {
  const mockFiles = [
    {
      fileName: 'main.js',
      relativePath: 'src/main.js',
      metadata: { description: 'Entry point', dependencies: [] },
      content: 'console.log("main");',
    },
    {
      fileName: 'README.md',
      relativePath: 'README.md',
      metadata: { description: 'Documentation', dependencies: [] },
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
    expect(() => sorter.sort(mockFiles)).toThrow('Sorting strategy is not set or invalid.');
  });

  test('should allow changing strategy', () => {
    const lexicalSort = new LexicalSort();
    const sorter = new Sorter(lexicalSort);
    sorter.setStrategy(lexicalSort);
    const sortedFiles = sorter.sort([...mockFiles]);
    expect(sortedFiles[0].relativePath).toBe('README.md');
  });

  test('should sort files lexically by relativePath using LexicalSort strategy', () => {
    const lexicalSort = new LexicalSort();
    const sorter = new Sorter(lexicalSort);
    const sorted = sorter.sort([...mockFiles]);
    expect(sorted[0].relativePath).toBe('README.md');
  });

  test('should sort files based on dependencies using DependencySort strategy', () => {
    const dependencySort = new DependencySort();
    const sorter = new Sorter(dependencySort);
    const sorted = sorter.sort([...mockFiles]);
    // Since both files have no dependencies, order should be preserved
    expect(sorted[0].relativePath).toBe('src/main.js');
  });

  test('should throw error when setting an invalid strategy', () => {
    const sorter = new Sorter();
    expect(() => sorter.setStrategy(null)).toThrow('Invalid sorting strategy provided.');
  });

  test('should handle sorting with an empty file list', () => {
    const lexicalSort = new LexicalSort();
    const sorter = new Sorter(lexicalSort);

    const sortedFiles = sorter.sort([]);
    expect(sortedFiles).toEqual([]);
  });
});

