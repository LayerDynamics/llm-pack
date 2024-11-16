const EventEmitter = require('events');

/**
 * Manages memory usage and monitoring for the application.
 * Provides memory statistics, alerts, and optimization strategies.
 */
class MemoryManager extends EventEmitter {
  /**
   * Creates a new MemoryManager instance
   * @param {Object} options Memory management options
   * @param {number} options.maxHeapUsage Maximum heap usage in bytes before warning (default 80% of max)
   * @param {number} options.checkInterval Interval for memory checks in ms (default 1000)
   * @param {number} options.gcThreshold Threshold for suggesting garbage collection (default 75% of max)
   */
  constructor(options = {}) {
    super();
    const v8 = require('v8');
    const heapStatistics = v8.getHeapStatistics();
    this.options = {
      maxHeapUsage: options.maxHeapUsage || heapStatistics.heap_size_limit * 0.8,
      checkInterval: options.checkInterval || 1000,
      gcThreshold: options.gcThreshold || heapStatistics.heap_size_limit * 0.75,
    };

    this.stats = {
      current: 0,
      peak: 0,
      collections: 0,
      warnings: 0,
    };

    this.monitoringInterval = null;
  }

  /**
   * Starts memory monitoring
   * @returns {void}
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemory();
    }, this.options.checkInterval);

    // Monitor garbage collection if possible
    if (global.gc) {
      const originalGc = global.gc;
      global.gc = (...args) => {
        this.stats.collections++;
        originalGc.apply(global, args);
      };
    }
  }

  /**
   * Stops memory monitoring
   * @returns {void}
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Checks current memory usage and emits events if thresholds are exceeded
   * @private
   */
  checkMemory() {
    const usage = process.memoryUsage();
    this.stats.current = usage.heapUsed;
    this.stats.peak = Math.max(this.stats.peak, usage.heapUsed);

    // Check if we're approaching memory limits
    if (usage.heapUsed > this.options.maxHeapUsage) {
      this.stats.warnings++;
      this.emit('memory-critical', {
        used: usage.heapUsed,
        max: this.options.maxHeapUsage,
        rss: usage.rss,
      });
    } else if (usage.heapUsed > this.options.gcThreshold) {
      this.emit('memory-warning', {
        used: usage.heapUsed,
        threshold: this.options.gcThreshold,
      });
      // Suggest garbage collection if available
      if (global.gc) {
        this.emit('suggest-gc');
      }
    }

    // Emit regular stats update
    this.emit('stats-update', this.getStats());
  }

  /**
   * Gets current memory statistics
   * @returns {Object} Memory statistics
   */
  getStats() {
    const usage = process.memoryUsage();
    return {
      ...this.stats,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers,
    };
  }

  /**
   * Attempts to optimize memory usage
   * @returns {Promise<void>}
   */
  async optimize() {
    if (global.gc) {
      global.gc();
    }

    // Wait for next tick to allow GC to complete
    await new Promise((resolve) => setImmediate(resolve));

    this.emit('memory-optimized', this.getStats());
  }

  /**
   * Estimates memory requirements for a given file size
   * @param {number} fileSize Size of file in bytes
   * @returns {Object} Memory requirement estimation
   */
  estimateMemoryRequirement(fileSize) {
    // Estimate based on file size and processing overhead
    const estimated = {
      minimum: fileSize * 1.5, // Basic processing overhead
      recommended: fileSize * 2, // Comfortable processing room
      peak: fileSize * 2.5, // Potential peak usage
    };

    return estimated;
  }

  /**
   * Checks if processing a file of given size is safe
   * @param {number} fileSize Size of file in bytes
   * @returns {boolean} Whether processing is safe
   */
  isSafeToProcess(fileSize) {
    const { heapUsed, heapTotal } = process.memoryUsage();
    const available = heapTotal - heapUsed;
    const required = this.estimateMemoryRequirement(fileSize).recommended;

    return available >= required;
  }

  /**
   * Gets recommended chunk size for streaming based on current memory conditions
   * @returns {number} Recommended chunk size in bytes
   */
  getRecommendedChunkSize() {
    const { heapUsed, heapTotal } = process.memoryUsage();
    const available = heapTotal - heapUsed;

    // Base chunk size on available memory, with a reasonable minimum
    return Math.max(
      64 * 1024, // 64KB minimum
      Math.floor(available * 0.1) // 10% of available memory
    );
  }
}

module.exports = MemoryManager;
