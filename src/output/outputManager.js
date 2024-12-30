const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const MarkdownFormatter = require('./formatters/markdownFormatter');
const HeaderFormatter = require('./formatters/headerFormatter');

class OutputManager {
  constructor(options = {}) {
    this.outputDir = options.outputDir || '.llm-pack';
    this.markdownFormatter = new MarkdownFormatter();
    this.headerFormatter = new HeaderFormatter();
  }

  async initialize() {
    await this.ensureOutputDirectory();
  }

  async ensureOutputDirectory() {
    try {
      await fs.promises.mkdir(this.outputDir, { recursive: true });
      Logger.info(`Output directory ensured at ${this.outputDir}`);
    } catch (error) {
      Logger.error(`Error creating output directory: ${error.message}`);
      throw error;
    }
  }

  async createConsolidatedFile(files, outputPath) {
    Logger.info(`Creating consolidated file at ${outputPath}`);
    
    // Ensure the directory exists
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    let stream;
    try {
      stream = fs.createWriteStream(outputPath, { 
        encoding: 'utf8',
        flags: 'w'
      });

      for (const file of files) {
        if (!file) continue;
        const formatted = this.markdownFormatter.formatFile(file);
        await this.writeToStream(stream, formatted);
      }

      // Close the stream properly
      await new Promise((resolve, reject) => {
        stream.end(err => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      if (stream) {
        stream.destroy();
      }
      throw error;
    }
  }

  async writeToStream(stream, content) {
    return new Promise((resolve, reject) => {
      const canContinue = stream.write(content);
      if (!canContinue) {
        stream.once('drain', resolve);
      } else {
        resolve();
      }
    });
  }
}

module.exports = OutputManager;
