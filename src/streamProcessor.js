const fs = require('fs');
const readline = require('readline');

/**
 * Class representing a stream processor for handling large files efficiently.
 */

/**
 * Creates a new StreamProcessor.
 * @param {number} [maxBufferSize=1024 * 1024] - The maximum buffer size in bytes.
 */

/**
 * Processes a large file and reads up to a maximum number of lines.
 * @param {string} filePath - The path to the file to process.
 * @param {number} [maxLines=100] - The maximum number of lines to read from the file.
 * @returns {Promise<string>} A promise that resolves with the content read from the file.
 */

/**
 * Estimates the total number of lines in a file.
 * @param {string} filePath - The path to the file.
 * @returns {Promise<number>} A promise that resolves with the estimated line count.
 */
class StreamProcessor {
  constructor(maxBufferSize = 1024 * 1024) {
    // 1MB default buffer
    this.maxBufferSize = maxBufferSize;
    this.buffer = [];
  }

  async processLargeFile(filePath, maxLines = 100) {
    return new Promise((resolve, reject) => {
      const lines = [];
      const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        if (lines.length < maxLines) {
          lines.push(line);
        } else {
          rl.close();
        }
      });

      rl.on('close', () => {
        let content = lines.join('\n');
        if (lines.length >= maxLines) {
          content += '\n... (Content truncated)';
        }
        resolve(content);
      });

      rl.on('error', (error) => {
        reject(error);
      });
    });
  }

  async estimateLineCount(filePath) {
    return new Promise((resolve, reject) => {
      let lineCount = 0;
      const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity,
      });

      rl.on('line', () => {
        lineCount++;
      });

      rl.on('close', () => {
        resolve(lineCount);
      });

      rl.on('error', (error) => {
        reject(error);
      });
    });
  }
}

module.exports = StreamProcessor;
