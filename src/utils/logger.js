const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.resolve('llm-pack', 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const winstonLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`
    )
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join('llm-pack', 'logs', 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join('llm-pack', 'logs', 'combined.log') }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join('llm-pack', 'logs', 'exceptions.log') }),
  ],
});

module.exports = {
  info: (message) => winstonLogger.info(message),
  error: (message) => winstonLogger.error(message),
  warn: (message) => winstonLogger.warn(message),
  debug: (message) => winstonLogger.debug(message),
};
