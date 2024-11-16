// src/streamProcessor.js
const fs = require('fs');
const readline = require('readline');
const EventEmitter = require('events');
const { Transform } = require('stream');
const MemoryManager = require('./memoryManager');
const ContentNormalizer = require('./contentNormalizer');

/**
 * A transform stream that restricts output size and/or number of lines,
 * and adds a truncation marker within the specified limits.
 * @extends Transform
 */
class SizeAndLineRestrictedStream extends Transform {
  constructor({ maxSize = Infinity, maxLines = Infinity, truncationMarker = '...' } = {}) {
    super({ decodeStrings: false });
    this.maxSize = maxSize;
    this.maxLines = maxLines;
    this.bytesProcessed = 0;
    this.linesProcessed = 0;
    this.truncated = false;
    this.buffer = '';
    this.truncationMarker = truncationMarker;
  }

  _transform(chunk, encoding, callback) {
    try {
      if (this.truncated) {
        callback();
        return;
      }

      const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);

      // Check if adding this chunk would exceed the size limit
      const chunkSize = Buffer.byteLength(str, 'utf8');

      if (this.bytesProcessed + chunkSize > this.maxSize) {
        // Find how much we can safely add
        let safeStr = '';
        let safeSize = 0;

        for (const char of str) {
          const charSize = Buffer.byteLength(char, 'utf8');
          if (this.bytesProcessed + safeSize + charSize > this.maxSize) {
            break;
          }
          safeStr += char;
          safeSize += charSize;
        }

        if (safeStr) {
          this.push(safeStr);
          this.bytesProcessed += safeSize;
        }

        this.truncated = true;
        callback();
        return;
      }

      this.push(str);
      this.bytesProcessed += chunkSize;

      // Handle line counting
      const newLines = (str.match(/\n/g) || []).length;
      this.linesProcessed += newLines;
      if (this.linesProcessed >= this.maxLines) {
        this.truncated = true;
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    if (this.buffer.length > 0 && !this.truncated) {
      const remainingSize = Buffer.byteLength(this.buffer, 'utf8');
      if (this.bytesProcessed + remainingSize <= this.maxSize) {
        this.push(this.buffer);
      } else {
        let safeStr = '';
        let safeSize = 0;

        for (const char of this.buffer) {
          const charSize = Buffer.byteLength(char, 'utf8');
          if (this.bytesProcessed + safeSize + charSize > this.maxSize) {
            break;
          }
          safeStr += char;
          safeSize += charSize;
        }

        if (safeStr) {
          this.push(safeStr);
        }
      }
    }
    callback();
  }
}
/**
 * Processes and streams file content with size and memory constraints.
 * @extends EventEmitter
 */
class StreamProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxBufferSize = options.maxBufferSize || null;
    this.chunkSize = options.chunkSize || null;
    this.enableMemoryMonitoring = options.enableMemoryMonitoring || false;
    this.enableProgressReporting = options.enableProgressReporting || false;

    this.normalizer = new ContentNormalizer({
      normalizeLineEndings: options.normalizeLineEndings !== false,
      normalizeWhitespace: options.normalizeWhitespace !== false,
      removeHtmlTags: options.removeHtmlTags || false,
    });

    if (this.enableMemoryMonitoring) {
      this.memoryManager = new MemoryManager({
        maxHeapUsage: options.maxHeapUsage,
        checkInterval: options.memoryCheckInterval,
      });
      this.memoryManager.startMonitoring();
    }
  }

  getChunkSize() {
    if (this.chunkSize !== null) return this.chunkSize;
    const availableMemory = process.memoryUsage().heapTotal;
    return Math.max(64 * 1024, Math.floor(availableMemory * 0.001));
  }

  /**
   * Streams content with size and/or line restrictions.
   * @private
   * @param {string} filePath - Path to the file.
   * @param {number|null} maxLines - Maximum lines to read (optional).
   * @returns {Promise<string>} Processed content.
   */
  async streamContent(filePath, maxLines = null) {
    return new Promise((resolve, reject) => {
      let content = '';
      let linesProcessed = 0;

      const readStream = fs.createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: this.getChunkSize(),
      });

      const truncationMarker = '...';
      const markerSize = Buffer.byteLength(truncationMarker, 'utf8');
      const maxContentSize = this.maxBufferSize ? this.maxBufferSize - markerSize : Infinity;

      const restrictor = new SizeAndLineRestrictedStream({
        maxSize: maxContentSize,
        maxLines: maxLines || Infinity,
        truncationMarker: truncationMarker,
      });

      restrictor.on('data', (chunk) => {
        const str = String(chunk);
        content += str;

        if (this.enableProgressReporting) {
          linesProcessed += (str.match(/\n/g) || []).length;
          this.emit('progress', {
            linesRead: linesProcessed,
            bufferSize: Buffer.byteLength(content, 'utf8'),
            maxLines,
          });
        }
      });

      restrictor.on('end', () => {
        let finalContent = content;

        // Add truncation marker if we hit the size limit
        if (restrictor.truncated || Buffer.byteLength(content, 'utf8') >= maxContentSize) {
          finalContent += truncationMarker;
        }

        // Normalize and verify final size
        let normalizedContent = this.normalizer.normalize(finalContent);

        // Final size check and adjustment if needed
        if (this.maxBufferSize) {
          while (
            Buffer.byteLength(normalizedContent, 'utf8') > this.maxBufferSize &&
            normalizedContent.length > markerSize
          ) {
            normalizedContent = normalizedContent.slice(0, -(markerSize + 1)) + truncationMarker;
          }
        }

        resolve(normalizedContent);
      });

      restrictor.on('error', reject);
      readStream.on('error', reject);

      readStream.pipe(restrictor);
    });
  }

  /**
   * Processes a large file, optionally truncating content based on maxBufferSize and maxLines,
   * and normalizing the content.
   * @async
   * @param {string} filePath - The path to the file to be processed.
   * @param {number|null} [maxLines=null] - Maximum number of lines to process.
   * @param {Object} [options={}] - Processing options.
   * @param {boolean} [options.normalizeContent=true] - Whether to normalize the content.
   * @returns {Promise<string>} The processed content, potentially truncated if exceeding maxBufferSize or maxLines.
   * @throws {Error} If file operations fail.
   */
  async processLargeFile(filePath, maxLines = null, options = {}) {
    const stats = await fs.promises.stat(filePath);
    const truncationMarker = '...';
    const markerSize = Buffer.byteLength(truncationMarker, 'utf8');

    // Calculate limits up front
    const maxContentSize = this.maxBufferSize ? this.maxBufferSize - markerSize : Infinity;

    if (this.maxBufferSize && stats.size > this.maxBufferSize) {
      return this.streamContent(filePath, maxLines);
    }

    // Read the content
    const content = await fs.promises.readFile(filePath, 'utf8');
    let processedContent =
      options.normalizeContent !== false ? this.normalizer.normalize(content) : content;

    // Handle line limits first
    if (maxLines !== null) {
      const lines = processedContent.split('\n');
      if (lines.length > maxLines) {
        processedContent = lines.slice(0, maxLines).join('\n') + '\n...';
      }
    }

    // Handle size limits with exact byte counting
    if (this.maxBufferSize) {
      const contentSize = Buffer.byteLength(processedContent, 'utf8');

      // If we're at or over the content size limit, we need to truncate
      if (contentSize >= maxContentSize) {
        let truncated = '';
        let byteCount = 0;

        // Process content character by character
        for (const char of processedContent) {
          const charSize = Buffer.byteLength(char, 'utf8');
          // Break if adding this character would exceed our max content size
          if (byteCount + charSize > maxContentSize) {
            break;
          }
          truncated += char;
          byteCount += charSize;
        }

        // Always add the truncation marker here
        processedContent = truncated + truncationMarker;

        // Verify the final size
        const finalSize = Buffer.byteLength(processedContent, 'utf8');
        if (finalSize !== this.maxBufferSize) {
          // If we're still over, adjust by removing characters until we fit
          while (Buffer.byteLength(processedContent, 'utf8') > this.maxBufferSize) {
            truncated = truncated.slice(0, -1);
            processedContent = truncated + truncationMarker;
          }
        }
      }
    }

    return processedContent;
  }
  /**
   * Processes file with a line limit.
   * @private
   * @param {string} filePath - Path to the file.
   * @param {number} maxLines - Maximum lines to read.
   * @returns {Promise<string>} Processed content.
   */
  async processWithLineLimit(filePath, maxLines) {
    return new Promise((resolve, reject) => {
      const lines = [];
      let lineCount = 0;

      const readInterface = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
      });

      readInterface.on('line', (line) => {
        if (lineCount >= maxLines) {
          readInterface.close();
          return;
        }

        const normalizedLine = this.normalizer.normalize(line);
        lines.push(normalizedLine);
        lineCount++;

        if (this.enableProgressReporting) {
          this.emit('progress', {
            linesRead: lineCount,
            bufferSize: Buffer.byteLength(lines.join('\n'), 'utf-8'),
            maxLines,
          });
        }
      });

      readInterface.on('close', () => {
        let result = lines.join('\n');
        if (lineCount >= maxLines) {
          result += '\n...';
        }
        resolve(result);
      });

      readInterface.on('error', reject);
    });
  }

  /**
   * Updates normalization options.
   * @param {Object} options - New normalization options.
   */
  setNormalizationOptions(options) {
    this.normalizer = new ContentNormalizer(options);
  }

  /**
   * Cleans up resources.
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.memoryManager) {
      this.memoryManager.stopMonitoring();
    }
    this.removeAllListeners();
  }
}

module.exports = StreamProcessor;
