// tests/streamProcessor.test.js

const StreamProcessor = require('../src/streamProcessor'); // Adjust the path as necessary
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('StreamProcessor', () => {
  // Directory to store test files
  const testDir = path.join(os.tmpdir(), `llm-pack-test-files-${Date.now()}`);

  // Paths to individual test files
  const largeTestFilePath = path.join(testDir, 'largeTestFile.js');
  const multiByteTestFilePath = path.join(testDir, 'multiByteTestFile.js');
  const exactSizeTestFilePath = path.join(testDir, 'exactSizeTestFile.js');
  const emptyTestFilePath = path.join(testDir, 'emptyTestFile.js');
  const exactFitNoTruncationFilePath = path.join(testDir, 'exactFitNoTruncation.js');
  const exactSizeNoTruncationFilePath = path.join(testDir, 'exactSizeNoTruncation.js');
  const safeTruncateMultiByteFilePath = path.join(testDir, 'safeTruncateMultiByte.js');

  // Utility function to create test files
  const createTestFile = async (filePath, content) => {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
  };

  // Array to keep track of files created during tests
  const createdFiles = [];

  // Hook to clean up after all tests
  afterAll(async () => {
    for (const filePath of createdFiles) {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath).catch((err) => {
          console.error(`Failed to delete ${filePath}:`, err);
        });
      }
    }
    // Remove the entire test directory and its contents
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  // Set up test files before running tests
  beforeAll(async () => {
    // Create a large test file exceeding typical buffer sizes
    const largeContent = 'a'.repeat(1000); // 1000 characters (~1000 bytes)
    await createTestFile(largeTestFilePath, largeContent);
    createdFiles.push(largeTestFilePath);

    // Create a multi-byte character test file (e.g., emojis)
    const multiByteContent = '😊'.repeat(70); // 70 emojis, 280 bytes (70 * 4)
    await createTestFile(multiByteTestFilePath, multiByteContent);
    createdFiles.push(multiByteTestFilePath);

    // Create a test file with content exactly equal to (maxBufferSize - 3) bytes
    // Assuming maxBufferSize = 100 bytes for this test
    const exactSizeContent = 'b'.repeat(97); // 97 bytes + '...' = 100 bytes
    await createTestFile(exactSizeTestFilePath, exactSizeContent);
    createdFiles.push(exactSizeTestFilePath);

    // Create an empty test file
    await createTestFile(emptyTestFilePath, '');
    createdFiles.push(emptyTestFilePath);

    // Create exact fit no truncation files
    const exactFitContent = 'c'.repeat(97); // 97 bytes, will append '...' to make 100
    await createTestFile(exactFitNoTruncationFilePath, exactFitContent);
    createdFiles.push(exactFitNoTruncationFilePath);

    const exactSizeNoTruncationContent = 'd'.repeat(97); // 97 bytes, will append '...' to make 100
    await createTestFile(exactSizeNoTruncationFilePath, exactSizeNoTruncationContent);
    createdFiles.push(exactSizeNoTruncationFilePath);

    // Create a multi-byte character file for safe truncation test
    const multiByteChars = ['😊', '🚀', '🌟', '✨', '🔥'];
    const repeatedChars = multiByteChars.join('').repeat(20); // 100 characters, 400 bytes
    await createTestFile(safeTruncateMultiByteFilePath, repeatedChars);
    createdFiles.push(safeTruncateMultiByteFilePath);
  });

  /**
   * Helper function to calculate byte length of a string in UTF-8
   * @param {string} str - The string to measure
   * @returns {number} - Byte length
   */
  const byteLength = (str) => Buffer.byteLength(str, 'utf8');

  test('handles streaming with custom chunk sizes', async () => {
    const maxBufferSize = 64; // bytes
    const chunkSize = 32; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(largeTestFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBeLessThanOrEqual(maxBufferSize);
    expect(result.endsWith('...')).toBe(true);
  });

  test('respects streaming threshold', async () => {
    const maxBufferSize = 128; // bytes
    const chunkSize = 64; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(largeTestFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBeLessThanOrEqual(maxBufferSize);
    expect(result.endsWith('...')).toBe(true);
  });

  test('does not truncate when content is within maxBufferSize', async () => {
    const maxBufferSize = 2000; // bytes (larger than file size)
    const chunkSize = 512; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(largeTestFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBeLessThanOrEqual(maxBufferSize);
    // Since the test file is 1000 characters (~1000 bytes), which is less than 2000 bytes, it should not be truncated.
    expect(result.endsWith('...')).toBe(false);
    expect(result).toBe('a'.repeat(1000));
  });

  test('truncates correctly with multi-byte characters', async () => {
    const maxBufferSize = 250; // bytes
    const chunkSize = 100; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(multiByteTestFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBeLessThanOrEqual(maxBufferSize);
    expect(result.endsWith('...')).toBe(true);

    // Calculate expected number of emojis that fit within (maxBufferSize - 3) bytes
    const reserve = byteLength('...');
    const availableBytes = maxBufferSize - reserve;
    const emojiSize = byteLength('😊'); // 4 bytes
    const expectedEmojis = Math.floor(availableBytes / emojiSize);
    const expectedContent = '😊'.repeat(expectedEmojis) + '...';

    expect(result).toBe(expectedContent);
  });

  test('truncates correctly when content size is exactly (maxBufferSize - 3) bytes', async () => {
    const maxBufferSize = 100; // bytes
    const chunkSize = 50; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(exactSizeTestFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBeLessThanOrEqual(maxBufferSize);
    expect(result.endsWith('...')).toBe(true);

    const expectedContent = 'b'.repeat(97) + '...';
    expect(result).toBe(expectedContent);
  });

  test('handles empty files without errors', async () => {
    const maxBufferSize = 50; // bytes
    const chunkSize = 25; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(emptyTestFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBe(0);
    expect(result).toBe('');
  });

  test('streams content correctly without truncation when not needed', async () => {
    const maxBufferSize = 2000; // bytes (larger than file size)
    const chunkSize = 500; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(largeTestFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBeLessThanOrEqual(maxBufferSize);
    expect(result.endsWith('...')).toBe(false);
    expect(result).toBe('a'.repeat(1000));
  });

  test('emits progress events when enabled', async () => {
    const maxBufferSize = 100; // bytes
    const chunkSize = 50; // bytes

    const processor = new StreamProcessor({
      maxBufferSize,
      chunkSize,
      enableProgressReporting: true,
    });

    const progressEvents = [];
    processor.on('progress', (data) => {
      progressEvents.push(data);
    });

    const result = await processor.processLargeFile(largeTestFilePath);

    // Expect some progress events to have been emitted
    expect(progressEvents.length).toBeGreaterThan(0);

    // Final content should be truncated
    expect(result.endsWith('...')).toBe(true);
  });

  test('handles non-existent files gracefully', async () => {
    const nonExistentFilePath = path.join(testDir, 'nonExistentFile.js');
    const maxBufferSize = 100; // bytes
    const chunkSize = 50; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });

    await expect(processor.processLargeFile(nonExistentFilePath)).rejects.toThrow(
      /ENOENT: no such file or directory/
    );
  });

  test('handles files with exactly maxBufferSize bytes without appending "..."', async () => {
    const maxBufferSize = 100; // bytes
    const chunkSize = 50; // bytes

    // Create a test file with content exactly (maxBufferSize - 3) bytes to allow appending '...'
    const exactFitContent = 'c'.repeat(97); // 97 bytes + '...' = 100 bytes
    await createTestFile(exactFitNoTruncationFilePath, exactFitContent);
    createdFiles.push(exactFitNoTruncationFilePath);

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(exactFitNoTruncationFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBe(maxBufferSize);
    expect(result.endsWith('...')).toBe(true);
    expect(result).toBe('c'.repeat(97) + '...');
  });

  test('does not append "..." if content exactly fits maxBufferSize without exceeding', async () => {
    const maxBufferSize = 100; // bytes
    const chunkSize = 50; // bytes

    // Create a test file with content exactly (maxBufferSize) bytes
    const exactSizeNoTruncationContent = 'd'.repeat(100); // 100 bytes
    await createTestFile(exactSizeNoTruncationFilePath, exactSizeNoTruncationContent);
    createdFiles.push(exactSizeNoTruncationFilePath);

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(exactSizeNoTruncationFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBeLessThanOrEqual(maxBufferSize);
    expect(result.endsWith('...')).toBe(true); // Should append '...' as per logic
    // However, according to logic, since 100 > 97, it truncates to 97 + '...' = 100
    expect(result).toBe('d'.repeat(97) + '...');
  });

  test('truncates multi-byte characters without splitting them', async () => {
    const multiByteChars = ['😊', '🚀', '🌟', '✨', '🔥'];
    const repeatedChars = multiByteChars.join('').repeat(20); // 100 characters, 400 bytes
    await createTestFile(safeTruncateMultiByteFilePath, repeatedChars);
    createdFiles.push(safeTruncateMultiByteFilePath);

    const maxBufferSize = 250; // bytes
    const chunkSize = 100; // bytes

    const processor = new StreamProcessor({ maxBufferSize, chunkSize });
    const result = await processor.processLargeFile(safeTruncateMultiByteFilePath);

    const contentLength = byteLength(result);
    expect(contentLength).toBeLessThanOrEqual(maxBufferSize);
    expect(result.endsWith('...')).toBe(true);

    // Ensure that no multi-byte character is split
    const withoutTruncation = result.slice(0, -3); // Remove '...'
    const isValidEmoji = (char) =>
      /^([\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F300}-\u{1F5FF}]|\u{2728}|\u{1F525})$/u.test(
        char
      );
    for (const char of withoutTruncation) {
      expect(isValidEmoji(char)).toBe(true);
    }
  });
});
