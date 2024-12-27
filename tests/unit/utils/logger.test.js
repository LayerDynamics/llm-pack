// tests/unit/utils/logger.test.js
const path = require('path');
const fs = require('fs');

// Mock fs module
jest.mock('fs');

// Initialize a variable to store the printf callback
let printfCallback;

// Mock winston module at the top level
jest.mock('winston', () => {
	// Create a mock for the logger instance
	const createLogger = jest.fn(() => ({
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
		exceptions: { handle: jest.fn() },
		rejections: { handle: jest.fn() },
	}));

	// Create mocks for format functions
	const formatFn = jest.fn((info) => info);

	const combine = jest.fn(() => formatFn);
	const timestamp = jest.fn(() => formatFn);
	const errors = jest.fn(() => formatFn);
	const splat = jest.fn(() => formatFn);
	const printf = jest.fn((cb) => {
		printfCallback = cb; // Store the callback for testing
		return formatFn;
	});

	const format = { combine, timestamp, errors, splat, printf };

	// Create mocks for transports
	const transports = {
		Console: jest.fn(),
		File: jest.fn(),
	};

	return { createLogger, format, transports };
});

// Import the mocked winston
const winston = require('winston');

describe('Logger', () => {
	beforeEach(() => {
		// Clear all mock calls and instances before each test
		jest.clearAllMocks();

		// By default, assume the logs directory exists
		fs.existsSync.mockReturnValue(true);
		fs.mkdirSync.mockReturnValue(undefined);
	});

	test('should initialize logger with correct format', () => {
		jest.isolateModules(() => {
			require('../../../src/utils/logger');

			expect(winston.format.combine).toHaveBeenCalled();
			expect(winston.format.timestamp).toHaveBeenCalledWith({
				format: 'YYYY-MM-DD HH:mm:ss',
			});
			expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
			expect(winston.format.splat).toHaveBeenCalled();
			expect(winston.format.printf).toHaveBeenCalled();

			// Test the printf format function
			const result = printfCallback({
				timestamp: '2023-01-01',
				level: 'info',
				message: 'test',
				stack: 'error stack',
			});
			expect(result).toBe('2023-01-01 [INFO]: test\nerror stack');
		});
	});

	test('should create logs directory if needed', () => {
		// Simulate that the logs directory does not exist
		fs.existsSync.mockReturnValue(false);

		jest.isolateModules(() => {
			require('../../../src/utils/logger');

			expect(fs.mkdirSync).toHaveBeenCalledWith(
				path.join('.llm-pack', 'logs'),
				{
					recursive: true,
				},
			);
		});
	});

	test('should handle directory creation error', () => {
		// Simulate that the logs directory does not exist
		fs.existsSync.mockReturnValue(false);
		// Mock mkdirSync to throw an error
		fs.mkdirSync.mockImplementation(() => {
			throw new Error('Permission denied');
		});

		jest.isolateModules(() => {
			expect(() => {
				require('../../../src/utils/logger');
			}).toThrow('Permission denied');
		});
	});

	test('should use singleton pattern', () => {
		jest.isolateModules(() => {
			const Logger = require('../../../src/utils/logger').constructor;
			const instance1 = new Logger();
			const instance2 = new Logger();
			expect(instance1).toBe(instance2);
		});
	});

	describe('logging methods', () => {
		let logger;
		let winstonLogger;

		beforeEach(() => {
			jest.isolateModules(() => {
				logger = require('../../../src/utils/logger');
				winstonLogger = winston.createLogger.mock.results[0].value;
			});
		});

		test('should log info messages', () => {
			logger.info('test message');
			expect(winstonLogger.info).toHaveBeenCalledWith('test message');
		});

		test('should log error messages with stack trace', () => {
			const error = new Error('test error');
			logger.error('An error occurred', error);
			expect(winstonLogger.error).toHaveBeenCalledWith(
				'An error occurred - test error',
				{ stack: error.stack },
			);
		});

		test('should log warning messages', () => {
			logger.warn('test warning');
			expect(winstonLogger.warn).toHaveBeenCalledWith('test warning');
		});

		test('should log debug messages', () => {
			logger.debug('test debug');
			expect(winstonLogger.debug).toHaveBeenCalledWith('test debug');
		});
	});
});
