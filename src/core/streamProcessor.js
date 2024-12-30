const { Transform } = require('stream');
const fs = require('fs');
const path = require('path');
const MetricsCollector = require('./metricsCollector');

class StreamProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 64 * 1024; // 64KB chunks
    this.metrics = new MetricsCollector();
  }

  validatePath(filePath, operation) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error(`File path is required for ${operation}`);
    }
    return filePath;
  }

  createReadStream(filePath) {
    this.validatePath(filePath, 'reading');
    return fs.createReadStream(filePath, {
      highWaterMark: this.chunkSize,
      encoding: 'utf8'
    });
  }

  ensureDirectoryExists(dir) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
        Logger.info(`Directory created at ${dir}`); // Optional: Add logging for directory creation
      }
    } catch (error) {
      if (error.code !== 'EEXIST') {
        Logger.error(`Failed to create directory ${dir}: ${error.message}`);
        throw error;
      }
    }
  }

  createWriteStream(filePath) {
    this.validatePath(filePath, 'writing');
    return fs.createWriteStream(filePath, {
      highWaterMark: this.chunkSize,
      encoding: 'utf8'
    });
  }

  async processFile(inputPath, outputPath, transformer) {
    const readStream = this.createReadStream(inputPath);
    const writeStream = this.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      readStream
        .pipe(transformer)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }
}

module.exports = StreamProcessor;
