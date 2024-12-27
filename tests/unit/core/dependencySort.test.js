const DependencySort = require('../../../src/core/strategies/dependencySort');

describe('DependencySort Strategy', () => {
  const files = [
    {
      fileName: 'main.js',
      relativePath: 'src/main.js',
      metadata: { description: 'Entry point', dependencies: ['./utils.js'] }, // Updated dependency
      content: 'import utils from "./utils.js";\nconsole.log("Main");',
    },
    {
      fileName: 'utils.js',
      relativePath: 'src/utils.js',
      metadata: { description: 'Utility functions', dependencies: ['./helper.js'] }, // Updated dependency
      content: 'import helper from "./helper.js";\nexport const add = (a, b) => a + b;',
    },
    {
      fileName: 'helper.js',
      relativePath: 'src/helper.js',
      metadata: { description: 'Helper functions', dependencies: [] },
      content: 'export const multiply = (a, b) => a * b;',
    },
    {
      fileName: 'README.md',
      relativePath: 'README.md',
      metadata: { description: 'Project documentation', dependencies: [] },
      content: '# Project',
    },
  ];

  test('should sort files based on dependencies correctly', () => {
    const dependencySort = new DependencySort();
    const sorted = dependencySort.sort(files);

    const expectedOrder = [
      {
        fileName: 'helper.js',
        relativePath: 'src/helper.js',
        metadata: { description: 'Helper functions', dependencies: [] },
        content: 'export const multiply = (a, b) => a * b;',
      },
      {
        fileName: 'utils.js',
        relativePath: 'src/utils.js',
        metadata: { description: 'Utility functions', dependencies: ['./helper.js'] },
        content: 'import helper from "./helper.js";\nexport const add = (a, b) => a + b;',
      },
      {
        fileName: 'main.js',
        relativePath: 'src/main.js',
        metadata: { description: 'Entry point', dependencies: ['./utils.js'] },
        content: 'import utils from "./utils.js";\nconsole.log("Main");',
      },
      {
        fileName: 'README.md',
        relativePath: 'README.md',
        metadata: { description: 'Project documentation', dependencies: [] },
        content: '# Project',
      },
    ];

    expect(sorted).toEqual(expectedOrder);

  });

  test('should throw an error on circular dependencies', () => {
    const circularFiles = [
      {
        fileName: 'a.js',
        relativePath: 'src/a.js',
        metadata: { description: 'Module A', dependencies: ['./b.js'] }, // Updated dependency
        content: 'import b from "./b.js";',
      },
      {
        fileName: 'b.js',
        relativePath: 'src/b.js',
        metadata: { description: 'Module B', dependencies: ['./a.js'] }, // Updated dependency
        content: 'import a from "./a.js";',
      },
    ];

    const dependencySort = new DependencySort();
    expect(() => dependencySort.sort(circularFiles)).toThrow('Circular dependency detected involving src/a.js');
  });

  test('should ignore non-existent dependencies gracefully', () => {
    const files = [
      {
        fileName: 'app.js',
        relativePath: 'src/app.js',
        metadata: { description: 'App module', dependencies: ['./nonexistent.js'] },
        content: 'import nonExistent from "./nonexistent.js";',
      },
      {
        fileName: 'utils.js',
        relativePath: 'src/utils.js',
        metadata: { description: 'Utility module', dependencies: [] },
        content: 'export const util = () => {};',
      },
    ];

    const dependencySort = new DependencySort();
    const sorted = dependencySort.sort(files);

    // Since the dependency doesn't exist, preserve original order
    expect(sorted[0].relativePath).toBe('src/app.js');
    expect(sorted[1].relativePath).toBe('src/utils.js');
  });

  test('should handle undefined metadata', () => {
    const files = [
      {
        fileName: 'test.js',
        relativePath: 'src/test.js',
        content: 'test'
      }
    ];

    const dependencySort = new DependencySort();
    const sorted = dependencySort.sort(files);
    expect(sorted).toEqual(files);
  });

  test('should handle undefined dependencies', () => {
    const files = [
      {
        fileName: 'test.js',
        relativePath: 'src/test.js',
        metadata: {},
        content: 'test'
      }
    ];

    const dependencySort = new DependencySort();
    const sorted = dependencySort.sort(files);
    expect(sorted).toEqual(files);
  });

  test('should handle file with undefined metadata', () => {
    const files = [
      {
        fileName: 'test.js',
        relativePath: 'src/test.js',
        content: 'test'
      }
    ];

    const dependencySort = new DependencySort();
    const sorted = dependencySort.sort(files);
    expect(sorted).toEqual(files);
  });

  test('should handle null dependencies array', () => {
    const files = [
      {
        fileName: 'app.js',
        relativePath: 'src/app.js',
        metadata: { dependencies: null },
        content: 'test'
      }
    ];

    const dependencySort = new DependencySort();
    const sorted = dependencySort.sort(files);
    expect(sorted).toEqual(files);
  });

  // ...additional test cases...
});
