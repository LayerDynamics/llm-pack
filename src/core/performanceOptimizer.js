const os = require('os');
const Logger = require('../utils/logger'); // Importing the singleton instance

class PerformanceOptimizer {
  constructor() {
    this.cpuCount = os.cpus().length;
    this.concurrencyLimit = this.cpuCount * 2;
    Logger.info(`PerformanceOptimizer initialized with concurrency limit: ${this.concurrencyLimit}`);
  }

  async runConcurrently(tasks) {
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks must be an array');
    }

    const results = [];
    const executing = new Set();

    for (const task of tasks) {
      if (typeof task !== 'function') {
        continue;
      }

      const p = Promise.resolve().then(() => task()).catch(error => {
        Logger.error(`Task failed: ${error.message}`);
        return undefined;
      });
      results.push(p);

      if (this.concurrencyLimit <= tasks.length) {
        const e = p.then(() => executing.delete(e));
        executing.add(e);
        if (executing.size >= this.concurrencyLimit) {
          await Promise.race(Array.from(executing));
        }
      }
    }

    return Promise.all(results);
  }
}

module.exports = PerformanceOptimizer;
