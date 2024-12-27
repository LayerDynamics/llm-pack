const Logger = require('../utils/logger');

class Sorter {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    if (!strategy || typeof strategy.sort !== 'function') {
      throw new Error('Invalid sorting strategy provided.');
    }
    this.strategy = strategy;
    Logger.info(`Sorting strategy set to ${strategy.constructor.name}`);
  }

  sort(files) {
    if (!this.strategy || typeof this.strategy.sort !== 'function') {
      throw new Error('Sorting strategy is not set or invalid.');
    }
    try {
      const sortedFiles = this.strategy.sort(files);
      Logger.info(`Files sorted using ${this.strategy.constructor.name}`);
      return sortedFiles;
    } catch (error) {
      Logger.error(`Sorter.sort failed: ${error.message}`, error);
      throw new Error('File sorting encountered an error. Check logs for details.');
    }
  }
}

module.exports = Sorter;
