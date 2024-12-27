// src/utils/logger.js
const { createLogger, format, transports } = require( 'winston' );
const path = require('path');
const fs = require('fs');

class Logger {
  constructor() {
    if (Logger.instance) {
      return Logger.instance;
    }

    try {
      const logsDir = path.join('.llm-pack', 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      this.logger = createLogger({
        level: 'info',
        format: this.createLogFormat(),
        transports: this.createTransports(logsDir)
      });

      Logger.instance = this;
    } catch (error) {
      throw error;
    }
  }

  createLogFormat() {
    return format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.splat(),
      format.printf(({ timestamp, level, message, stack }) => {
        if (stack) {
          return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
      })
    );
  }

  createTransports(logsDir) {
    return [
      new transports.Console(),
      new transports.File({ 
        filename: path.join(logsDir, 'error.log'), 
        level: 'error' 
      }),
      new transports.File({ 
        filename: path.join(logsDir, 'combined.log') 
      })
    ];
  }

  info(message) {
    this.logger.info(message);
  }

  error(message, error = null) {
    if (error && error.stack) {
      this.logger.error(`${message} - ${error.message}`, { stack: error.stack });
    } else {
      this.logger.error(message);
    }
  }

  warn(message) {
    this.logger.warn(message);
  }

  debug(message) {
    this.logger.debug(message);
  }
}

module.exports = new Logger();
