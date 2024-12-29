// src/core/sorter.js
const Logger = require( '../utils/logger' );

class Sorter {
  constructor(strategy) {
    this.setStrategy(strategy);
  }

  setStrategy(strategy) {
    if (!strategy || typeof strategy.sort !== 'function') {
      throw new Error('Invalid sorting strategy provided');
    }
    this.strategy = strategy;
    Logger.info(`Sorting strategy set to ${strategy.constructor.name}`);
  }

  async sort(files) {
    if (!Array.isArray(files)) {
      throw new Error('Files must be provided as an array');
    }

    if (!this.strategy) {
      throw new Error('Sorting strategy is not set');
    }

    try {
      const sortedFiles = await this.strategy.sort(files);
      Logger.info(`Files sorted using ${this.strategy.constructor.name}`);
      return sortedFiles;
    } catch (error) {
      const errorMessage = `File sorting encountered an error: ${error.message}`;
      Logger.error(errorMessage, error);
      error.message = errorMessage;
      throw error;
    }
  }
}

module.exports = Sorter;
