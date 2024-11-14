const chalk = require('chalk');

/**
 * A class for tracking and displaying progress of file processing operations.
 * @class
 * @param {Object} estimates - Initial estimates for the processing operation
 * @param {number} estimates.totalFiles - Total number of files to be processed
 * @param {number} estimates.totalSize - Total size of files to be processed in KB
 * @property {number} totalFiles - Total number of files to process
 * @property {number} totalSize - Total size to process in KB
 * @property {number} processedFiles - Number of files processed
 * @property {number} processedSize - Amount of data processed in KB
 * @property {number} startTime - Timestamp when processing started
 * @property {number} lastUpdateTime - Timestamp of last progress update
 * @property {number} updateInterval - Interval between progress updates in milliseconds
 */
class ProgressTracker {
  constructor(estimates) {
    this.totalFiles = estimates.totalFiles;
    this.totalSize = estimates.totalSize;
    this.processedFiles = 0;
    this.processedSize = 0;
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.updateInterval = 1000; // Update every second
  }

  /**
   * Updates the progress tracker with the size of the recently processed file.
   * @param {number} fileSize - Size of the processed file in bytes.
   */
  updateProgress(fileSize) {
    this.processedFiles++;
    this.processedSize += fileSize / 1024; // Convert to KB

    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime >= this.updateInterval) {
      this.displayProgress();
      this.lastUpdateTime = currentTime;
    }
  }

  /**
   * Displays the current progress in the console.
   */
  displayProgress() {
    const fileProgress = (this.processedFiles / this.totalFiles) * 100;
    const sizeProgress = (this.processedSize / this.totalSize) * 100;
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    const estimatedTotalTime = (elapsedTime * this.totalFiles) / this.processedFiles;
    const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);

    console.clear();
    console.log(chalk.blue('Processing Progress:'));
    console.log(`Files: ${this.processedFiles}/${this.totalFiles} (${fileProgress.toFixed(1)}%)`);
    console.log(
      `Size: ${Math.round(this.processedSize)}KB/${Math.round(this.totalSize)}KB (${sizeProgress.toFixed(1)}%)`
    );
    console.log(`Time Elapsed: ${Math.round(elapsedTime)}s`);
    console.log(`Estimated Time Remaining: ${Math.round(remainingTime)}s`);
  }

  /**
   * Marks the progress as complete and logs the final statistics.
   */
  complete() {
    const totalTime = (Date.now() - this.startTime) / 1000;
    console.log(chalk.green('\nProcessing Complete:'));
    console.log(`Total Files Processed: ${this.processedFiles}`);
    console.log(`Total Size Processed: ${Math.round(this.processedSize)}KB`);
    console.log(`Total Time: ${totalTime.toFixed(1)}s`);
  }
}

module.exports = ProgressTracker;
