const chalk = require('chalk');

/**
 * @class ErrorHandler
 * @description A class to handle and manage errors and warnings in the application.
 * Provides methods for error tracking, warning management, and report generation.
 * 
 * @property {Array<Object>} errors - Array storing error objects with timestamp, context, message, stack trace, and fatal status
 * @property {Array<Object>} warnings - Array storing warning objects with timestamp, context, and message
 * 
 * @example
 * const errorHandler = new ErrorHandler();
 * try {
 *   // Some code that might throw
 * } catch (error) {
 *   errorHandler.handleError(error, 'MyContext', false);
 * }
 */
class ErrorHandler {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  handleError(error, context, isFatal = false) {
    const errorInfo = {
      timestamp: new Date(),
      context,
      message: error.message,
      stack: error.stack,
      isFatal,
    };

    this.errors.push(errorInfo);

    if (isFatal) {
      console.error(chalk.red(`Fatal Error in ${context}:`));
      console.error(error.message);
      process.exit(1);
    } else {
      console.error(chalk.yellow(`Error in ${context}:`));
      console.error(error.message);
    }
  }

  addWarning(message, context) {
    const warning = {
      timestamp: new Date(),
      context,
      message,
    };

    this.warnings.push(warning);
    console.warn(chalk.yellow(`Warning in ${context}:`));
    console.warn(message);
  }

  generateErrorReport() {
    let report = '# Error Report\n\n';

    if (this.errors.length > 0) {
      report += '## Errors\n\n';
      this.errors.forEach((error) => {
        report += `### ${error.context}\n`;
        report += `- Timestamp: ${error.timestamp}\n`;
        report += `- Message: ${error.message}\n`;
        report += `- Fatal: ${error.isFatal}\n`;
        report += `- Stack Trace:\n\`\`\`\n${error.stack}\n\`\`\`\n\n`;
      });
    }

    if (this.warnings.length > 0) {
      report += '## Warnings\n\n';
      this.warnings.forEach((warning) => {
        report += `### ${warning.context}\n`;
        report += `- Timestamp: ${warning.timestamp}\n`;
        report += `- Message: ${warning.message}\n\n`;
      });
    }

    return report;
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  hasWarnings() {
    return this.warnings.length > 0;
  }
}

module.exports = ErrorHandler;
