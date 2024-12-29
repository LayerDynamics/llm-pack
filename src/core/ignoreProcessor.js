// src/core/ignoreProcessor.js
const fs = require('fs');
const path = require('path');
const ignore = require('ignore');
const Logger = require('../utils/logger'); // Importing the singleton instance

class IgnoreProcessor {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.ig = ignore();
    this.loadIgnoreFiles();
    this.ig.add(['.gitignore', '.llm-pack.ignore']); // Now explicitly ignoring configuration files
  }

  loadIgnoreFiles() {
    const ignoreFiles = ['.gitignore', '.llm-pack.ignore'];
    ignoreFiles.forEach((file) => {
      const filePath = path.join(this.rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'))
          .join('\n');
        this.ig.add(content);
        Logger.info(`Loaded ignore patterns from ${file}`);
      }
    });
  }

  isIgnored(filePath) {
    const relativePath = path.relative(this.rootDir, filePath)
      .split(path.sep)
      .join('/'); // Normalize path separators
    return this.ig.ignores(relativePath);
  }
}

module.exports = IgnoreProcessor;

