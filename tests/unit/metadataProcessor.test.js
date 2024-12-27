const path = require('path');

// Setup mocks before requiring the module under test
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Create mock implementation for fs
const mockReadFile = jest.fn();
const mockExistsSync = jest.fn(() => true);

jest.mock('fs', () => ({
  promises: {
    readFile: mockReadFile,
  },
  existsSync: mockExistsSync,
}));

// Require the module under test after mocks are setup
const MetadataProcessor = require('../../src/core/metadataProcessor');

describe('MetadataProcessor', () => {
  const processor = new MetadataProcessor('/root');

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockReset();
    mockExistsSync.mockImplementation(() => true);
  });

  test('should enrich files with metadata', async () => {
    mockReadFile.mockResolvedValueOnce('import foo from "bar";');

    const files = ['/root/src/main.js'];
    const enriched = await processor.enrich(files);

    expect(enriched).toHaveLength(1);
    expect(enriched[0]).toMatchObject({
      fileName: 'main.js',
      relativePath: 'src/main.js',
      metadata: {
        description: 'Entry point of the application',
        dependencies: ['bar']
      }
    });
  });

  test('should handle read errors gracefully', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('Read error'));

    const files = ['/root/error.js'];
    const enriched = await processor.enrich(files);

    expect(enriched).toHaveLength(0);
  });

  test('should handle multiple files', async () => {
    mockReadFile
      .mockResolvedValueOnce('import a from "pkg-a";')
      .mockResolvedValueOnce('import b from "pkg-b";');

    const files = ['/root/a.js', '/root/b.js'];
    const enriched = await processor.enrich(files);

    expect(enriched).toHaveLength(2);
    expect(enriched[0].metadata.dependencies).toContain('pkg-a');
    expect(enriched[1].metadata.dependencies).toContain('pkg-b');
  });

  test('should generate descriptions for different file types', async () => {
    mockReadFile.mockResolvedValueOnce('// helper code')
      .mockResolvedValueOnce('# doc')
      .mockResolvedValueOnce('console.log("test")')

      .mockResolvedValueOnce('data');

    const files = [
      '/root/src/helper.js',
      '/root/doc.md',
      '/root/src/utils.js',
      '/root/data.txt'
    ];
    
    const enriched = await processor.enrich(files);
    
    expect(enriched[0].metadata.description).toBe('Contains helper functions');
    expect(enriched[1].metadata.description).toBe('Markdown documentation file');
    expect(enriched[2].metadata.description).toBe('JavaScript utility module');
    expect(enriched[3].metadata.description).toBe('File content');
  });

  test('should handle complex import patterns', async () => {
    mockReadFile.mockResolvedValueOnce(`
      import foo from 'foo';
      import { bar } from "bar";
      import * as baz from 'baz';
    `);

    const files = ['/root/src/complex.js'];
    const enriched = await processor.enrich(files);
    
    expect(enriched[0].metadata.dependencies).toEqual(['foo', 'bar', 'baz']);
  });
});


