// tests/unit/logger.test.js

const path = require('path');
const fs = require('fs');

// Mock mkdirp
jest.mock('mkdirp', () => ({
    sync: jest.fn()
}));

// Create a factory for mock logger to get fresh instance each time
const mockFormatMessage = (message) => {
    if (message === null) return 'null';
    if (message === undefined) return 'undefined';
    if (typeof message === 'object') return JSON.stringify(message);
    return String(message);
};

const createMockLogger = () => ({
    info: jest.fn(input => mockFormatMessage(input)),
    error: jest.fn((msg, meta) => meta ? { message: msg, meta } : mockFormatMessage(msg)),
    warn: jest.fn(input => mockFormatMessage(input)),
    debug: jest.fn(input => mockFormatMessage(input)),
    log: jest.fn(input => mockFormatMessage(input))
});

let mockLogger;

jest.mock('winston', () => ({
    createLogger: jest.fn().mockImplementation(() => mockLogger),
    format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        printf: jest.fn(),
        errors: jest.fn(),
        splat: jest.fn()
    },
    transports: {
        Console: jest.fn(),
        File: jest.fn()
    }
}));

const mkdirp = require('mkdirp');
const winston = require('winston');
const { Logger } = require('@/utils/logger');

describe('Logger', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete Logger.instance;
        mockLogger = createMockLogger();
        winston.createLogger.mockReturnValue(mockLogger);
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    });

    test('should create logs directory if it does not exist', () => {
        new Logger();
        expect(mkdirp.sync).toHaveBeenCalledWith(
            path.join(process.cwd(), '.llm-pack', 'logs')
        );
    });

    test('should initialize with correct Winston transports', () => {
        new Logger();
        expect(winston.transports.Console).toHaveBeenCalled();
        expect(winston.transports.File).toHaveBeenCalledWith(
            expect.objectContaining({
                filename: expect.stringContaining('error.log'),
                level: 'error'
            })
        );
    });

    test('should format different message types correctly', () => {
        const logger = new Logger();

        const testCases = [
            { input: 'Test info message', expected: 'Test info message' },
            { input: 'Test warn message', expected: 'Test warn message' },
            { input: null, expected: 'null' }, // Changed from null to 'null'
            { input: 123, expected: '123' },  // Already correct
            { input: { key: 'value' }, expected: '{"key":"value"}' } // Already correct
        ];

        testCases.forEach(({ input, expected }) => {
            mockLogger.info.mockClear();
            mockLogger.warn.mockClear();
            mockLogger.error.mockClear();

            logger.info(input);
            expect(mockLogger.info).toHaveBeenCalledWith(expected);

            logger.warn(input);
            expect(mockLogger.warn).toHaveBeenCalledWith(expected);

            logger.error(input);
            expect(mockLogger.error).toHaveBeenCalledWith(expected);
        });
    });

    test('should handle error objects correctly', () => {
        const logger = new Logger();
        const errorObj = new Error('Test error');

        logger.error('Test message', errorObj);
        expect(mockLogger.error).toHaveBeenCalledWith('Test message: Test error', {
            stack: errorObj.stack
        });
    });
});
