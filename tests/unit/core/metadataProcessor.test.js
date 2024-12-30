
const path = require('path');
const mockFs = require('mock-fs');
const fs = require('fs');
const MetadataProcessor = require('../../../src/core/metadataProcessor');

describe('MetadataProcessor', () => {
  let processor;
  const rootDir = '/test/root';

  beforeEach(() => {
    mockFs({
      '/test/root/file1.js': 'import something from "dep1";',
      '/test/root/file2.md': '# Documentation',
    });
    processor = new MetadataProcessor(rootDir);
  });

  afterEach(() => {
    mockFs.restore();
  });

  test('should enrich files with metadata and content', async () => {
    const files = [
      path.join(rootDir, 'file1.js'),
      path.join(rootDir, 'file2.md'),
    ];
    const enriched = await processor.enrich(files);
    expect(enriched).toHaveLength(2);

    const jsFile = enriched.find((f) => f.fileName === 'file1.js');
    expect(jsFile.metadata.dependencies).toContain('dep1');
    expect(jsFile.content).toContain('import something');
  });

  test('should detect relationships (placeholder)', async () => {
    const files = [ path.join(rootDir, 'file1.js') ];
    const enriched = await processor.enrich(files);
    expect(enriched[0].metadata.relationships).toEqual([]);
  });
});