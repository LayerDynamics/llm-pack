const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');
const OutputManager = require('../../../src/output/outputManager');

describe('OutputManager', () => {
  let outputManager;

  const testFiles = [
    {
      fileName: 'test.js',
      content: 'console.log("test");',
    }
  ];

  beforeEach(() => {
    outputManager = new OutputManager({ outputDir: '.test-llm-pack' });
    mockFs({
      '.test-llm-pack': {} // Ensure directory exists in mock filesystem
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  test('should properly format consolidated output', async () => {
    const outputPath = path.join('.test-llm-pack', 'output.md');
    await outputManager.createConsolidatedFile(testFiles, outputPath);

    // Add small delay to ensure file is written
    await new Promise(resolve => setTimeout(resolve, 100));

    const output = fs.readFileSync(outputPath, 'utf8');
    expect(output).toContain('# test.js');
  });

  test('should create output directory if not exists', async () => {
    mockFs({}); // Start with empty filesystem
    await outputManager.initialize();
    expect(fs.existsSync('.test-llm-pack')).toBe(true);
  });

  test('should handle large files correctly', async () => {
    await outputManager.initialize();
    const largeContent = 'A'.repeat(100000);
    const files = [{ fileName: 'large.txt', content: largeContent }];

    const outputPath = path.join('.test-llm-pack', 'output.md');
    await expect(outputManager.createConsolidatedFile(files, outputPath))
      .resolves.toBeUndefined();
  });
});
