// src/core/metadataProcessor.js
const fs = require( 'fs' ).promises;
const path = require('path');
const Logger = require('../utils/logger');

class MetadataProcessor {
  constructor(rootDir) {
    this.rootDir = rootDir;
  }

  async enrich(files) {
    Logger.info(`Starting metadata enrichment for ${files.length} files.`);
    const enrichedFiles = [];

    const tasks = files.map(async (filePath) => {
      try {
        const relativePath = path.relative(this.rootDir, filePath);
        const fileName = path.basename(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        const metadata = this.extractMetadata(content, filePath);
        enrichedFiles.push({
          fileName,
          relativePath,
          metadata,
          content,
        });
        Logger.debug(`Enriched metadata for ${relativePath}`);
      } catch (error) {
        Logger.error(`Error enriching metadata for ${filePath}: ${error.message}`);
      }
    });

    await Promise.all(tasks);
    Logger.info(`Metadata enrichment completed.`);
    return enrichedFiles;
  }

  extractMetadata(content, filePath) {
    const metadata = {
      description: this.generateDescription(filePath),
      dependencies: this.extractDependencies(content, filePath),
    };
    return metadata;
  }

  generateDescription(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath, ext);

    switch (ext) {
      case '.js':
        if (fileName.toLowerCase().includes('main')) {
          return 'Entry point of the application';
        }
        if (fileName.toLowerCase().includes('helper')) {
          return 'Contains helper functions';
        }
        return 'JavaScript utility module';
      case '.md':
        return 'Markdown documentation file';
      default:
        return 'File content';
    }
  }

  extractDependencies(content, filePath) {
    const dependencies = [];

    const importRegex = /import\s+.*\s+from\s+['"](.*)['"];?/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }
}

module.exports = MetadataProcessor;

