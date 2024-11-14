const path = require('path');
const fs = require('fs').promises;

/**
 * Manages content size and file limitations for a project.
 * @class
 * @classdesc Handles file processing decisions based on size limits, file count limits, and allowed extensions.
 * Provides functionality to estimate project size and track statistics of processed files.
 *
 * @param {?number} maxSize - Maximum allowed size per file in KB. Null means no limit.
 * @param {?number} maxFiles - Maximum number of files to process. Null means no limit.
 * @param {string[]} extensions - Array of allowed file extensions (e.g., ['.js', '.txt'])
 *
 * @property {number} currentSize - Current total size of processed files in KB
 * @property {number} fileCount - Current count of processed files
 * @property {Set<string>} allowedExtensions - Set of allowed file extensions
 * @property {Object} stats - Statistics tracking object
 * @property {number} stats.totalFiles - Total number of processed files
 * @property {number} stats.totalSize - Total size of processed files in KB
 * @property {number} stats.skippedFiles - Number of files skipped
 * @property {number} stats.skippedSize - Total size of skipped files in KB
 */
class ContentSizeManager {
  constructor(maxSize = null, maxFiles = null, extensions = []) {
    this.maxSize = maxSize;
    this.maxFiles = maxFiles;
    this.currentSize = 0;
    this.fileCount = 0;
    this.allowedExtensions = new Set(extensions);
    this.stats = {
      totalFiles: 0,
      totalSize: 0,
      skippedFiles: 0,
      skippedSize: 0,
    };
  }

  async estimateProjectSize(rootDir, ignoreProcessor) {
    const estimate = {
      totalFiles: 0,
      totalSize: 0,
      estimatedProcessingTime: 0,
    };

    async function traverseDirectory(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(rootDir, fullPath);

        if (ignoreProcessor && ignoreProcessor.isIgnored(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await traverseDirectory(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          estimate.totalFiles++;
          estimate.totalSize += stats.size;
        }
      }
    }

    await traverseDirectory(rootDir);
    estimate.estimatedProcessingTime = Math.ceil(estimate.totalSize / (1024 * 1024));
    estimate.totalSize = Math.ceil(estimate.totalSize / 1024); // Convert to KB

    return estimate;
  }

  shouldProcessFile(filePath, fileSize) {
    const fileSizeKB = fileSize / 1024;
    const ext = path.extname(filePath);

    const result = {
      shouldProcess: true,
      shouldCompact: false,
      reason: null,
    };

    if (this.allowedExtensions.size > 0 && !this.allowedExtensions.has(ext)) {
      result.shouldProcess = false;
      result.reason = 'Unsupported file extension';
      return result;
    }

    if (this.maxFiles !== null && this.fileCount >= this.maxFiles) {
      result.shouldProcess = false;
      result.reason = 'Maximum file limit reached';
      return result;
    }

    if (this.maxSize !== null && fileSizeKB > this.maxSize) {
      result.shouldProcess = true;
      result.shouldCompact = true;
      result.reason = 'File exceeds size limit, will be compacted';
    }

    if (result.shouldProcess) {
      this.fileCount++;
      this.currentSize += fileSizeKB;
    }

    return result;
  }

  updateStats(fileSize, skipped) {
    const fileSizeKB = fileSize / 1024;
    if (skipped) {
      this.stats.skippedFiles++;
      this.stats.skippedSize += fileSizeKB;
    } else {
      this.stats.totalFiles++;
      this.stats.totalSize += fileSizeKB;
    }
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = ContentSizeManager;
