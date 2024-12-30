// src/core/fileScanner.js
const fs = require( 'fs' ).promises;
const path = require('path');
const IgnoreProcessor = require('./ignoreProcessor');
const PerformanceOptimizer = require('./performanceOptimizer');
const Logger = require('../utils/logger'); // Importing the singleton instance

class FileScanner {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.ignoreProcessor = new IgnoreProcessor(rootDir);
    this.optimizer = new PerformanceOptimizer();
  }

  async scan() {
    Logger.info(`Starting file scan in directory: ${this.rootDir}`);
    try {
      const files = [];
      await this._scanDirectory(this.rootDir, files);
      
      if (files.length === 0) {
        Logger.warn('No files found. Check if directory is empty or all files are ignored.');
      } else {
        Logger.info(`File scan completed. Found ${files.length} files.`);
      }
      
      return files;
    } catch (error) {
      Logger.error('File scan failed:', error);
      throw error;
    }
  }

  async _scanDirectory(dir, files) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      // Process in smaller batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const tasks = batch.map(entry => async () => {
          const fullPath = path.join(dir, entry.name);

          if (this.ignoreProcessor.isIgnored(fullPath)) {
            Logger.debug(`Ignored: ${fullPath}`);
            return;
          }

          if (entry.isDirectory()) {
            try {
              await fs.access(fullPath);
              await this._scanDirectory(fullPath, files);
            } catch (error) {
              Logger.error(`Error scanning directory ${fullPath}: ${error.message}`);
            }
          } else if (entry.isFile()) {
            try {
              await fs.access(fullPath);
              files.push(fullPath);
              Logger.debug(`Found file: ${fullPath}`);
            } catch (error) {
              Logger.error(`Error scanning directory ${dir}: ${error.message}`);
            }
          }
        });

        await this.optimizer.runConcurrently(tasks);
      }
    } catch (error) {
      Logger.error(`Error scanning directory ${dir}:`, error);
      throw error;
    }
  }
}

module.exports = FileScanner;
