// src/performance/benchmark.js
/**
 * A class for measuring and reporting performance metrics in Node.js applications.
 * Tracks execution time and memory usage for named operations.
 * 
 * @class PerformanceBenchmark
 * @example
 * const benchmark = new PerformanceBenchmark();
 * 
 * // Start measuring a metric
 * benchmark.startMetric('operation');
 * 
 * // Your code here
 * 
 * // End measuring and record results
 * benchmark.endMetric('operation');
 * 
 * // Generate markdown report
 * const report = benchmark.generateReport();
 */
class PerformanceBenchmark {
  constructor() {
    this.metrics = new Map();
    this.ongoing = new Map();
  }

  /**
   * Starts timing a metric.
   * @param {string} name - Metric name
   */
  startMetric(name) {
    this.ongoing.set(name, {
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage(),
    });
  }

  /**
   * Ends timing for a metric and records results.
   * @param {string} name - Metric name
   */
  endMetric(name) {
    const start = this.ongoing.get(name);
    if (!start) {
      throw new Error(`No started metric named ${name}`);
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const metric = {
      duration: Number(endTime - start.startTime) / 1e6, // Convert to ms
      memoryDelta: {
        heapUsed: endMemory.heapUsed - start.startMemory.heapUsed,
        external: endMemory.external - start.startMemory.external,
        rss: endMemory.rss - start.startMemory.rss,
      },
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(metric);
    this.ongoing.delete(name);
  }

  /**
   * Generates a performance report.
   * @returns {string} Formatted performance report
   */
  generateReport() {
    let report = '# Performance Report\n\n';

    for (const [name, metrics] of this.metrics.entries()) {
      report += `## ${name}\n\n`;

      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      const maxDuration = Math.max(...metrics.map((m) => m.duration));
      const minDuration = Math.min(...metrics.map((m) => m.duration));

      report += `- Average Duration: ${avgDuration.toFixed(2)}ms\n`;
      report += `- Max Duration: ${maxDuration.toFixed(2)}ms\n`;
      report += `- Min Duration: ${minDuration.toFixed(2)}ms\n\n`;

      // Memory statistics
      const avgMemory = {
        heapUsed: metrics.reduce((sum, m) => sum + m.memoryDelta.heapUsed, 0) / metrics.length,
        external: metrics.reduce((sum, m) => sum + m.memoryDelta.external, 0) / metrics.length,
        rss: metrics.reduce((sum, m) => sum + m.memoryDelta.rss, 0) / metrics.length,
      };

      report += '### Memory Usage\n\n';
      report += `- Heap Used: ${(avgMemory.heapUsed / 1024 / 1024).toFixed(2)}MB\n`;
      report += `- External: ${(avgMemory.external / 1024 / 1024).toFixed(2)}MB\n`;
      report += `- RSS: ${(avgMemory.rss / 1024 / 1024).toFixed(2)}MB\n\n`;
    }

    return report;
  }
}

module.exports = { PerformanceBenchmark };
