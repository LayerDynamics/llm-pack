// src/fileProcessor.js

const path = require('path');
const fs = require('fs').promises;
const { Worker } = require('worker_threads');
const StreamProcessor = require('./streamProcessor');
const MemoryManager = require('./memoryManager');
const { EventEmitter } = require('events');

/**
 * Manages efficient file processing with parallel processing and memory optimization
 * @extends EventEmitter
 */
class FileProcessor extends EventEmitter {
  /**
   * Creates a new FileProcessor instance
   * @param {Object} options Configuration options
   * @param {number} [options.maxWorkers=4] Maximum number of worker threads
   * @param {number} [options.chunkSize=1048576] Size of chunks for streaming (1MB)
   * @param {number} [options.streamingThreshold=5242880] File size threshold for streaming (5MB)
   * @param {boolean} [options.useWorkers=true] Whether to use worker threads
   * @param {Object} [options.memoryLimits] Memory usage limits
   * @param {number} [options.memoryLimits.maxHeapUsage] Maximum heap usage in bytes before warning
   * @param {number} [options.memoryLimits.checkInterval] Interval for memory checks in ms
   */
  constructor(options = {}) {
    super();
    this.options = {
      maxWorkers: options.maxWorkers || 4,
      chunkSize: options.chunkSize || 1024 * 1024, // 1MB
      streamingThreshold: options.streamingThreshold || 5 * 1024 * 1024, // 5MB
      useWorkers: options.useWorkers !== false, // Default to true
      memoryLimits: options.memoryLimits || {},
    };

    this.workers = new Map(); // Map of workerId to Worker instance
    this.taskQueue = []; // Queue of pending tasks
    this.activeWorkers = 0; // Number of active workers
    this.memoryManager = new MemoryManager(this.options.memoryLimits);
    this.streamProcessor = new StreamProcessor({
      chunkSize: this.options.chunkSize,
    });

    this.setupMemoryMonitoring();

    if (this.options.useWorkers) {
      this.initializeWorkers().catch((error) => {
        this.emit('error', {
          type: 'worker-initialization-error',
          error,
        });
      });
    }
  }

  /**
   * Sets up memory monitoring and handling
   * @private
   */
  setupMemoryMonitoring() {
    this.memoryManager.on('memory-warning', (stats) => {
      this.emit('memory-warning', stats);
      this.pauseProcessing();
    });

    this.memoryManager.on('memory-critical', (stats) => {
      this.emit('memory-critical', stats);
      this.handleMemoryCritical();
    });

    this.memoryManager.startMonitoring();
  }

  /**
   * Initializes worker threads
   * @private
   * @returns {Promise<void>}
   */
  async initializeWorkers() {
    const workerPath = path.join(__dirname, 'worker.js');
    const workerOptions = {
      chunkSize: this.options.chunkSize,
      streamingThreshold: this.options.streamingThreshold,
      memoryLimits: this.options.memoryLimits,
    };

    for (let i = 0; i < this.options.maxWorkers; i++) {
      try {
        const worker = new Worker(workerPath, {
          workerData: workerOptions,
        });
        this.setupWorkerHandlers(worker, i);
        this.workers.set(i, worker);
      } catch (error) {
        this.emit('error', {
          type: 'worker-initialization-error',
          workerId: i,
          error,
        });
      }
    }
  }

  /**
   * Sets up event handlers for a worker
   * @private
   * @param {Worker} worker Worker instance
   * @param {number} workerId Worker identifier
   */
  setupWorkerHandlers(worker, workerId) {
    worker.on('message', (message) => {
      switch (message.type) {
        case 'result':
          this.handleWorkerResult(workerId, message.data);
          break;
        case 'progress':
          this.emit('progress', {
            workerId,
            ...message,
          });
          break;
        case 'memory-warning':
          this.handleWorkerMemoryWarning(workerId, message.stats);
          break;
        case 'error':
          this.handleWorkerError(workerId, message.error);
          break;
        default:
          this.emit('unknown-message', { workerId, message });
      }
    });

    worker.on('error', (error) => {
      this.handleWorkerError(workerId, { message: error.message, stack: error.stack });
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        this.emit('worker-exit', { workerId, code });
        this.restartWorker(workerId);
      }
      this.workers.delete(workerId);
    });
  }

  /**
   * Processes a batch of files
   * @param {Array<string>} files Array of file paths to process
   * @param {Object} options Processing options
   * @param {number} options.maxLines Maximum number of lines to read from each file
   * @returns {Promise<{ results: Array<Object>, errors: Array<Object> }>} Processing results and errors
   */
  async processBatch(files, options = {}) {
    const results = [];
    const errors = [];

    if (this.options.useWorkers && this.workers.size === 0) {
      await this.initializeWorkers();
    }

    const processNext = async () => {
      if (files.length === 0) {
        if (this.activeWorkers === 0) {
          this.emit('batch-complete', { results, errors });
        }
        return;
      }

      const file = files.shift();
      try {
        const result = await this.processFile(file, options);
        results.push(result);
        this.emit('file-processed', { file, success: true });
      } catch (error) {
        errors.push({ file, error });
        this.emit('file-processed', { file, success: false, error });
      }

      processNext();
    };

    const initialBatch = Math.min(this.options.maxWorkers, files.length);
    for (let i = 0; i < initialBatch; i++) {
      processNext();
    }

    return new Promise((resolve) => {
      this.on('batch-complete', () => {
        resolve({ results, errors });
      });
    });
  }

  /**
   * Processes a single file
   * @param {string} filePath Path to the file
   * @param {Object} options Processing options
   * @param {number} options.maxLines Maximum number of lines to read from the file
   * @returns {Promise<Object>} Processing result
   */
  async processFile(filePath, options = {}) {
    const stats = await fs.stat(filePath);

    if (!this.memoryManager.isSafeToProcess(stats.size)) {
      throw new Error('Insufficient memory to process file safely');
    }

    if (this.options.useWorkers) {
      return this.processFileWithWorker(filePath, stats, options);
    } else {
      return this.processFileDirectly(filePath, stats, options);
    }
  }

  /**
   * Processes a file using a worker thread
   * @private
   * @param {string} filePath File path
   * @param {fs.Stats} stats File stats
   * @param {Object} options Processing options
   * @returns {Promise<Object>} Processing result
   */
  processFileWithWorker(filePath, stats, options) {
    return new Promise((resolve, reject) => {
      const availableWorker = this.getAvailableWorker();
      if (!availableWorker) {
        this.taskQueue.push({ filePath, stats, options, resolve, reject });
        return;
      }

      const workerId = this.getWorkerId(availableWorker);
      if (workerId === null) {
        // Should not happen, but handle gracefully
        reject(new Error('Worker ID not found'));
        return;
      }

      this.activeWorkers++;
      availableWorker.postMessage({
        type: 'process-file',
        data: {
          filePath,
          options: {
            maxLines: options.maxLines || 100,
            chunkSize: this.options.chunkSize,
            streamingThreshold: this.options.streamingThreshold,
          },
        },
      });

      const cleanup = () => {
        this.activeWorkers--;
        if (this.taskQueue.length > 0) {
          const nextTask = this.taskQueue.shift();
          this.processFileWithWorker(nextTask.filePath, nextTask.stats, nextTask.options)
            .then(nextTask.resolve)
            .catch(nextTask.reject);
        }
      };

      const messageHandler = (message) => {
        if (message.type === 'result') {
          cleanup();
          resolve({ workerId, ...message.data });
          availableWorker.off('message', messageHandler);
        } else if (message.type === 'error') {
          cleanup();
          reject(new Error(message.error.message));
          availableWorker.off('message', messageHandler);
        }
      };

      availableWorker.on('message', messageHandler);
    });
  }

  /**
   * Retrieves the workerId for a given worker
   * @private
   * @param {Worker} worker Worker instance
   * @returns {number|null} Worker identifier or null if not found
   */
  getWorkerId(worker) {
    for (const [id, w] of this.workers.entries()) {
      if (w === worker) {
        return id;
      }
    }
    return null;
  }

  /**
   * Handles results received from a worker
   * @private
   * @param {number} workerId Worker identifier
   * @param {Object} data Result data from worker
   */
  handleWorkerResult(workerId, data) {
    // Assuming 'data' includes filePath and processedContent
    this.emit('result', { workerId, ...data });
  }

  /**
   * Handles memory warnings from workers
   * @private
   * @param {number} workerId Worker identifier
   * @param {Object} stats Memory stats
   */
  handleWorkerMemoryWarning(workerId, stats) {
    this.emit('worker-memory-warning', { workerId, stats });
    // Potential actions: pause processing, notify user, etc.
  }

  /**
   * Handles errors from workers
   * @private
   * @param {number} workerId Worker identifier
   * @param {Object} error Error details
   */
  handleWorkerError(workerId, error) {
    this.emit('worker-error', { workerId, error });
    // Attempt to restart the worker
    this.restartWorker(workerId);
  }

  /**
   * Handles worker exits
   * @private
   * @param {number} workerId Worker identifier
   * @param {number} code Exit code
   */
  handleWorkerExit(workerId, code) {
    this.emit('worker-exit', { workerId, code });
    this.restartWorker(workerId);
  }

  /**
   * Gets an available worker from the pool
   * @private
   * @returns {Worker|null} Available worker or null if none available
   */
  getAvailableWorker() {
    for (const [workerId, worker] of this.workers) {
      if (worker.listenerCount('message') === 0) {
        console.log(`Available worker found: ${workerId}`);
        return worker;
      }
    }
    return null;
  }

  /**
   * Restarts a worker
   * @private
   * @param {number} workerId Worker identifier
   */
  async restartWorker(workerId) {
    const oldWorker = this.workers.get(workerId);
    if (oldWorker) {
      try {
        await oldWorker.terminate();
      } catch (error) {
        this.emit('error', {
          type: 'worker-termination-error',
          workerId,
          error,
        });
      }
      this.workers.delete(workerId);
    }

    try {
      const workerPath = path.join(__dirname, 'worker.js');
      const workerOptions = {
        chunkSize: this.options.chunkSize,
        streamingThreshold: this.options.streamingThreshold,
        memoryLimits: this.options.memoryLimits,
      };
      const newWorker = new Worker(workerPath, {
        workerData: workerOptions,
      });
      this.setupWorkerHandlers(newWorker, workerId);
      this.workers.set(workerId, newWorker);
    } catch (error) {
      this.emit('error', {
        type: 'worker-restart-error',
        workerId,
        error,
      });
    }
  }

  /**
   * Processes a file directly (without worker)
   * @private
   * @param {string} filePath File path
   * @param {fs.Stats} stats File stats
   * @param {Object} options Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processFileDirectly(filePath, stats, options) {
    let content;
    let compacted = false;

    try {
      if (stats.size > this.options.streamingThreshold) {
        content = await this.streamProcessor.processLargeFile(filePath, options.maxLines || 100);
        compacted = true;
      } else {
        content = await fs.readFile(filePath, 'utf-8');
      }

      return {
        filePath,
        content,
        stats: {
          originalSize: stats.size,
          compacted,
        },
      };
    } catch (error) {
      throw new Error(`Error processing ${filePath}: ${error.message}`);
    }
  }

  /**
   * Handles memory critical situations
   * @private
   */
  async handleMemoryCritical() {
    this.pauseProcessing();
    await this.memoryManager.optimize();
    if (global.gc) {
      global.gc();
    }
    this.resumeProcessing();
  }

  /**
   * Pauses file processing
   * @private
   */
  pauseProcessing() {
    this.paused = true;
    this.workers.forEach((worker) => {
      worker.postMessage({ type: 'pause' });
    });
    this.emit('processing-paused');
  }

  /**
   * Resumes file processing
   * @private
   */
  resumeProcessing() {
    this.paused = false;
    this.workers.forEach((worker) => {
      worker.postMessage({ type: 'resume' });
    });
    this.emit('processing-resumed');
  }

  /**
   * Cleans up resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.memoryManager.stopMonitoring();
    await Promise.all(
      Array.from(this.workers.values()).map(
        (worker) =>
          new Promise((resolve) => {
            worker.postMessage({ type: 'cleanup' });
            worker.on('message', (message) => {
              if (message.type === 'cleaned-up') {
                worker.terminate();
                resolve();
              }
            });
            // Timeout to prevent hanging if worker doesn't respond
            setTimeout(() => {
              worker.terminate();
              resolve();
            }, 5000);
          })
      )
    );
    this.workers.clear();
    this.emit('cleanup-complete');
  }
}

module.exports = FileProcessor;
