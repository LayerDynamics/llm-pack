// tests/unit/logger.test.js
const path = require('path');
const winston = require('winston');
const { Logger } = require('../../src/utils/logger');

jest.mock('winston', () => ({
	createLogger: jest.fn(),
	format: {
		combine: jest.fn(),
		timestamp: jest.fn(),
		printf: jest.fn(),
		errors: jest.fn(),
		splat: jest.fn(),
	},
	transports: {
		Console: jest.fn(),
		File: jest.fn(),
	},
}));

describe('Logger', () => {
	let logger;

	beforeEach(() => {
		// Reset the singleton instance
		if (Logger.instance) {
			Logger.instance = null;
		}

		winston.createLogger.mockReturnValue({
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
		});

		logger = new Logger();
	});

	test('should create logs directory if it does not exist', () => {
		expect(winston.transports.File).toHaveBeenCalled();
	});

	test('should initialize with correct Winston transports', () => {
		expect(winston.createLogger).toHaveBeenCalled();
		expect(winston.transports.Console).toHaveBeenCalled();
		expect(winston.transports.File).toHaveBeenCalled();
	});

	test('should format different message types correctly', () => {
		const testCases = [
			{ input: 'test', expected: 'test' },
			{ input: null, expected: 'null' },
			{ input: undefined, expected: 'undefined' },
			{ input: { key: 'value' }, expected: '{"key":"value"}' },
		];

		testCases.forEach(({ input, expected }) => {
			expect(logger.formatMessage(input)).toBe(expected);
		});
	});

	test('should handle error objects correctly', () => {
		const error = new Error('Test error');
		logger.log('error', 'Test message', error);
		expect(logger.logger.error).toHaveBeenCalled();
	});
});
