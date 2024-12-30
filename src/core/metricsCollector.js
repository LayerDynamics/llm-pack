class MetricsCollector {
  constructor() {
    this.metrics = {
      processing: new Map(),
      timing: new Map(),
      memory: []
    };
  }

  startTimer(operation) {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e6;
      this.recordTiming(operation, duration);
    };
  }

  recordTiming(operation, duration) {
    if (!this.metrics.timing.has(operation)) {
      this.metrics.timing.set(operation, []);
    }
    this.metrics.timing.get(operation).push(duration);
  }

  recordMemoryUsage() {
    this.metrics.memory.push(process.memoryUsage());
  }

  calculateTimings() {
    const timings = {};
    this.metrics.timing.forEach((durations, operation) => {
      timings[operation] = {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations)
      };
    });
    return timings;
  }

  calculateMemoryStats() {
    return this.metrics.memory.length ? {
      peak: Math.max(...this.metrics.memory.map(m => m.heapUsed)),
      average: this.metrics.memory.reduce((a, b) => a + b.heapUsed, 0) / this.metrics.memory.length
    } : {};
  }

  calculateProcessingStats() {
    return {
      operations: this.metrics.processing.size,
      totalItems: Array.from(this.metrics.processing.values()).reduce((a, b) => a + b, 0)
    };
  }

  generateReport() {
    return {
      timings: this.calculateTimings(),
      memory: this.calculateMemoryStats(),
      processing: this.calculateProcessingStats()
    };
  }
}

module.exports = MetricsCollector;
