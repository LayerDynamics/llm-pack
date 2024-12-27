const fs = require('fs');
const path = require('path');
const { Writable } = require('stream');
const Logger = require('../utils/logger');

class Consolidator {
  constructor(outputDir = '.llm-pack', outputFileName = 'consolidated_output.md') {
    this.outputDir = path.join(outputDir);
    this.outputFilePath = path.join(this.outputDir, outputFileName);
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      Logger.info(`Created output directory at ${this.outputDir}`);
    } else {
      Logger.info(`Output directory exists at ${this.outputDir}`);
    }
  }

  async consolidate(files) {
    Logger.info(`Starting consolidation of ${files.length} files into ${this.outputFilePath}`);

    // Ensure the output directory exists
    this.ensureOutputDirectory();

    const writeStream = fs.createWriteStream(this.outputFilePath, { encoding: 'utf8' });

    return new Promise((resolve, reject) => {
      writeStream.on('error', (error) => {
        Logger.error(`Error writing to consolidated file: ${error.message}`);
        reject(error);
      });

      writeStream.on('finish', () => {
        Logger.info(`Consolidation completed. Output file created at ${this.outputFilePath}`);
        resolve();
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const header = this.formatHeader(file);
        const content = this.formatContent(file);

        writeStream.write(header);
        writeStream.write(content);

        // Only add separator between files, not after the last one
        if (i < files.length - 1) {
          writeStream.write('\n---\n\n');
        }
        Logger.debug(`Consolidated file: ${file.relativePath}`);
      }

      writeStream.end();
    });
  }

  formatHeader(file) {
    const { fileName, relativePath, metadata = { description: '', dependencies: [] } } = file;
    const description = metadata.description || 'No description available.';
    const dependencies = (metadata.dependencies && metadata.dependencies.length > 0)
      ? metadata.dependencies.join(', ')
      : 'None';

    return `# ${fileName}\n**Path**: \`${relativePath}\`\n**Description**: ${description}\n**Dependencies**: ${dependencies}\n\n`;
  }

  formatContent(file) {
    const ext = path.extname(file.fileName).substring(1) || 'plaintext';
    const content = file.content.replace(/```/g, '````');

    return `\`\`\`${ext}\n${content}\n\`\`\`\n`;  // Remove extra newline
  }
}

module.exports = Consolidator;
