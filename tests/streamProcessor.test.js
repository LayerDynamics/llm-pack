const StreamProcessor = require('../src/streamProcessor');
const fs = require('fs');
const path = require('path');

describe('StreamProcessor', () => {
  let processor;
  let testFilePath;

  beforeEach(() => {
    processor = new StreamProcessor();
    testFilePath = path.join(__dirname, 'testFile.txt');
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('processes large file correctly', async () => {
    // Create a test file with more than 100 lines
    const content = Array.from({ length: 150 }, (_, i) => `Line ${i + 1}`).join('\n');
    fs.writeFileSync(testFilePath, content);

    const result = await processor.processLargeFile(testFilePath, 100);

    expect(result).toContain('Line 1');
    expect(result).toContain('Line 100');
    expect(result).toContain('... (Content truncated)');
    expect(result).not.toContain('Line 101');
  });

  test('estimates line count correctly', async () => {
    const lineCount = 50;
    const content = Array.from({ length: lineCount }, (_, i) => `Line ${i + 1}`).join('\n');
    fs.writeFileSync(testFilePath, content);

    const count = await processor.estimateLineCount(testFilePath);
    expect(count).toBe(lineCount);
  });

  test('handles empty files', async () => {
    fs.writeFileSync(testFilePath, '');

    const result = await processor.processLargeFile(testFilePath);
    expect(result).toBe('');

    const count = await processor.estimateLineCount(testFilePath);
    expect(count).toBe(0);
  });

  test('handles file read errors gracefully', async () => {
    const nonExistentFile = 'nonexistent.txt';

    await expect(processor.processLargeFile(nonExistentFile)).rejects.toThrow();

    await expect(processor.estimateLineCount(nonExistentFile)).rejects.toThrow();
  });
});
