const { Transform } = require('stream');
const path = require('path');
const Logger = require('../utils/logger');
const StreamProcessor = require('./streamProcessor');
const BatchProcessor = require('./batchProcessor');
const MetricsCollector = require('./metricsCollector');

class FileProcessor {
  constructor(options = {}) {
    this.streamProcessor = new StreamProcessor(options);
    this.batchProcessor = new BatchProcessor(options);
    this.metrics = new MetricsCollector();
    this.outputDir = options.outputDir || '.llm-pack';
  }

  generateOutputPath(file) {
    if (file.outputPath) return file.outputPath;
    const relativePath = file.relativePath || path.basename(file.path);
    return path.join(this.outputDir, relativePath);
  }

  async processFiles(files) {
    if (!Array.isArray(files)) {
      throw new Error('Files must be provided as an array');
    }

    const timer = this.metrics.startTimer('totalProcessing');

    try {
      const results = await this.batchProcessor.processAll(
        files,
        file => this.processFile(file)
      );

      timer();
      return {
        results: results.filter(result => result !== null),
        metrics: this.metrics.generateReport()
      };
    } catch (error) {
      Logger.error('Error processing files:', error);
      throw error;
    }
  }

  async processFile(file) {
    if (!file || typeof file.path !== 'string') {
      Logger.warn('Invalid file entry, skipping');
      return null;
    }

    try {
      const outputPath = this.generateOutputPath(file);
      const transformer = this.createTransformer();
      await this.streamProcessor.processFile(file.path, outputPath, transformer);
      return { ...file, outputPath };
    } catch (error) {
      Logger.error(`Error processing file ${file.path}:`, error);
      return null;
    }
  }

  createTransformer() {
    return new Transform({
      objectMode: true,
      transform: (chunk, encoding, callback) => {
        try {
          const processed = this.processChunk(chunk);
          callback(null, processed);
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  processChunk(chunk) {
    if (!chunk) return '';
    return chunk.toString();
  }
}

module.exports = FileProcessor;
