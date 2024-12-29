// src/utils/logger.js

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

class Logger {
	constructor() {
		if (Logger.instance) {
			return Logger.instance;
		}

		const logsDir = path.join(process.cwd(), '.llm-pack', 'logs');

		try {
			// Ensure logs directory exists
			if (!fs.existsSync(logsDir)) {
				try {
					mkdirp.sync(logsDir);
				} catch (err) {
					throw new Error(`Failed to create logs directory: ${err.message}`);
				}
			}
		} catch (error) {
			throw new Error(`Failed to create logs directory: ${error.message}`);
		}

		this.logger = this.initializeLogger(logsDir);
		Logger.instance = this;
	}

	initializeLogger(logsDir) {
		const formatMessage = (message) => {
			if (message === null) return 'null';
			if (message === undefined) return 'undefined';
			if (typeof message === 'object') return JSON.stringify(message);
			return String(message);
		};

		return createLogger({
			level: process.env.LOG_LEVEL || 'info',
			format: format.combine(
				format.timestamp(),
				format.errors({ stack: true }),
				format.splat(),
				format.printf(({ level, message, timestamp, stack }) => {
					const msg = `${timestamp} [${level.toUpperCase()}]: ${formatMessage(
						message,
					)}`;
					return stack ? `${msg}\n${stack}` : msg;
				}),
			),
			transports: [
				new transports.Console(),
				new transports.File({
					filename: path.join(logsDir, 'error.log'),
					level: 'error',
				}),
				new transports.File({
					filename: path.join(logsDir, 'combined.log'),
				}),
			],
		});
	}

	formatMessage(message) {
		if (message === null) return 'null';
		if (message === undefined) return 'undefined';
		if (typeof message === 'object') return JSON.stringify(message);
		return String(message);
	}

	log(level, message, error = null) {
		if (error instanceof Error) {
			this.logger[level](`${message}: ${error.message}`, {
				stack: error.stack,
			});
		} else {
			this.logger[level](this.formatMessage(message));
		}
	}

	info(message) {
		this.log('info', message);
	}

	error(message, error = null) {
		this.log('error', message, error);
	}

	warn(message) {
		this.log('warn', message);
	}

	debug(message) {
		this.log('debug', message);
	}
}

// Create and export singleton instance
const instance = new Logger();
module.exports = instance;

// Also export the Logger class for testing purposes
module.exports.Logger = Logger;
