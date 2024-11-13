const ContentSizeManager = require('../src/contentSizeManager');
const fs = require('fs').promises;
const path = require('path');

describe('ContentSizeManager', () => {
  let manager;
  const testDir = path.join(__dirname, 'testProject');

  beforeEach(async () => {
    manager = new ContentSizeManager(1000, 10, ['.js', '.md']);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('estimates project size correctly', async () => {
    await fs.writeFile(path.join(testDir, 'test.js'), 'console.log("test");');
    const estimate = await manager.estimateProjectSize(testDir);
    expect(estimate.totalFiles).toBe(1);
    expect(estimate.totalSize).toBeGreaterThan(0);
  });

  test('handles file size constraints correctly', () => {
    const result = manager.shouldProcessFile('test.js', 1024 * 500); // 500KB
    expect(result.shouldProcess).toBe(true);
    expect(result.shouldCompact).toBe(false);
  });

  test('enforces max file size with compacting', () => {
    const result = manager.shouldProcessFile('large.js', 1024 * 2000); // 2MB
    expect(result.shouldProcess).toBe(true);
    expect(result.shouldCompact).toBe(true);
    expect(result.reason).toBe('File exceeds size limit, will be compacted');
  });

  test('respects file extension restrictions', () => {
    const result = manager.shouldProcessFile('test.cpp', 1024); // 1KB
    expect(result.shouldProcess).toBe(false);
    expect(result.reason).toBe('Unsupported file extension');
  });

  test('enforces max files limit', async () => {
    // Create 11 small files (exceeding the 10 file limit)
    for (let i = 0; i < 11; i++) {
      const result = manager.shouldProcessFile(`test${i}.js`, 1024);
      if (i < 10) {
        expect(result.shouldProcess).toBe(true);
      } else {
        expect(result.shouldProcess).toBe(false);
        expect(result.reason).toBe('Maximum file limit reached');
      }
    }
  });

  test('tracks file statistics correctly', () => {
    manager.updateStats(1024 * 100, false); // 100KB processed
    manager.updateStats(1024 * 200, true); // 200KB skipped

    const stats = manager.getStats();
    expect(stats.totalFiles).toBe(1);
    expect(stats.skippedFiles).toBe(1);
    expect(stats.totalSize).toBe(100);
    expect(stats.skippedSize).toBe(200);
  });

  test('handles empty directories', async () => {
    const estimate = await manager.estimateProjectSize(testDir);
    expect(estimate.totalFiles).toBe(0);
    expect(estimate.totalSize).toBe(0);
    expect(estimate.estimatedProcessingTime).toBe(0);
  });

  test('estimates processing time correctly', async () => {
    // Create a 5MB file
    const content = Buffer.alloc(5 * 1024 * 1024).fill('a');
    await fs.writeFile(path.join(testDir, 'large.js'), content);

    const estimate = await manager.estimateProjectSize(testDir);
    expect(estimate.estimatedProcessingTime).toBe(5); // 5 seconds for 5MB
  });
});
