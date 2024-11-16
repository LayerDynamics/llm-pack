const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const fs = require('fs').promises;
const StreamProcessor = require('./streamProcessor');
const ContentFormatter = require('./contentFormatter');
const CodeCompactor = require('./codeCompactor');
const MemoryManager = require('./memoryManager');

/**
 * Worker class for handling file processing in parallel
 */
class FileProcessingWorker {
  /**
   * Creates a new FileProcessingWorker instance
   * @param {Object} options Worker configuration options
   */
  constructor(options = {}) {
    this.memoryManager = new MemoryManager({
      maxHeapUsage: options.maxHeapUsage,
      checkInterval: 1000,
    });

    this.streamProcessor = new StreamProcessor({
      maxBufferSize: options.maxBufferSize,
      chunkSize: this.memoryManager.getRecommendedChunkSize(),
    });

    this.contentFormatter = new ContentFormatter(options.format || 'markdown', {
      theme: options.theme,
      highlightSyntax: options.highlightSyntax,
    });

    this.codeCompactor = options.useCompactor
      ? new CodeCompactor({
          maxLines: options.compactLines,
          contextLines: options.contextLines,
          preserveStructure: true,
          importanceThreshold: options.importanceThreshold,
        })
      : null;

    // Set up memory monitoring
    this.setupMemoryMonitoring();
  }

  /**
   * Sets up memory monitoring and event handlers
   * @private
   */
  setupMemoryMonitoring() {
    this.memoryManager.on('memory-warning', (stats) => {
      parentPort.postMessage({
        type: 'memory-warning',
        stats,
      });
    });

    this.memoryManager.on('memory-critical', (stats) => {
      parentPort.postMessage({
        type: 'memory-critical',
        stats,
      });
    });

    this.memoryManager.startMonitoring();
  }

  /**
   * Processes a single file
   * @param {Object} task File processing task configuration
   * @returns {Promise<Object>} Processing result
   */
  async processFile(task) {
    const { filePath, rootDir, options } = task;

    try {
      // Validate input first
      if (!this.validateInput(filePath, rootDir)) {
        throw new Error('Invalid input parameters');
      }

      // Get file stats and check size
      const stats = await fs.stat(filePath);
      const result = await this.processFileWithStats(filePath, stats, options);

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          filePath,
        },
      };
    }
  }

  /**
   * Validates input parameters
   * @param {string} filePath File path to process
   * @param {string} rootDir Root directory
   * @returns {boolean} Whether input is valid
   * @private
   */
  validateInput(filePath, rootDir) {
    if (!filePath || typeof filePath !== 'string') return false;
    if (!rootDir || typeof rootDir !== 'string') return false;

    const normalizedPath = path.normalize(filePath);
    const absoluteRoot = path.resolve(rootDir);

    // Check for path traversal
    if (!normalizedPath.startsWith(absoluteRoot)) return false;

    // Check for valid characters in path
    if (!filePath.match(/^[a-zA-Z0-9-_./\\]+$/)) return false;

    return true;
  }

  /**
   * Processes a file with known stats
   * @param {string} filePath File path
   * @param {fs.Stats} stats File stats
   * @param {Object} options Processing options
   * @returns {Promise<Object>} Processing result
   * @private
   */
  async processFileWithStats(filePath, stats, options) {
    let content;
    let compacted = false;

    // Check if safe to process
    if (!this.memoryManager.isSafeToProcess(stats.size)) {
      throw new Error('Insufficient memory to process file safely');
    }

    try {
      // Process based on file size
      if (stats.size > options.streamingThreshold) {
        content = await this.streamProcessor.processLargeFile(filePath);
        compacted = true;
      } else {
        content = await fs.readFile(filePath, 'utf-8');
      }

      // Apply compaction if needed
      if (this.codeCompactor && (compacted || stats.size > options.compactionThreshold)) {
        const fileType = path.extname(filePath).slice(1);
        content = this.codeCompactor.compact(content, fileType);
        compacted = true;
      }

      // Format content
      const formattedContent = this.contentFormatter.formatContent(filePath, content, compacted);

      // Report progress
      parentPort.postMessage({
        type: 'progress',
        filePath,
        bytesProcessed: stats.size,
      });

      return {
        filePath,
        formattedContent,
        stats: {
          originalSize: stats.size,
          compacted,
          memoryUsed: this.memoryManager.getStats().heapUsed,
        },
      };
    } catch (error) {
      throw new Error(`Error processing ${filePath}: ${error.message}`);
    }
  }

  /**
   * Cleans up resources used by the worker
   */
  cleanup() {
    this.memoryManager.stopMonitoring();
  }
}

// Set up message handling
const worker = new FileProcessingWorker(workerData);

parentPort.on('message', async (task) => {
  try {
    if (task.type === 'process-file') {
      const result = await worker.processFile(task.data);
      parentPort.postMessage({
        type: 'result',
        data: result,
      });
    } else if (task.type === 'cleanup') {
      worker.cleanup();
      parentPort.postMessage({ type: 'cleaned-up' });
    }
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  parentPort.postMessage({
    type: 'uncaught-error',
    error: {
      message: error.message,
      stack: error.stack,
    },
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  parentPort.postMessage({
    type: 'unhandled-rejection',
    error: {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    },
  });
});
