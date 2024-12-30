const MetricsCollector = require('./metricsCollector');

class BatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 1000;
    this.metrics = new MetricsCollector();
  }

  createBatches(items) {
    const batches = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }

  async processBatch(batch, processor) {
    const timer = this.metrics.startTimer('batchProcessing');
    const results = await Promise.all(
      batch.map(item => processor(item))
    );
    timer();
    return results;
  }

  async processAll(items, processor) {
    const batches = this.createBatches(items);
    const results = [];

    for (const batch of batches) {
      const batchResults = await this.processBatch(batch, processor);
      results.push(...batchResults);
    }

    return results;
  }
}

module.exports = BatchProcessor;
