const winston = require('winston');
const path = require('path');

const mockWinstonLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  add: jest.fn()
};

jest.mock('winston', () => ({
  format: {
    combine: jest.fn(() => jest.fn()),
    timestamp: jest.fn(() => jest.fn()),
    printf: jest.fn(() => jest.fn()),
    simple: jest.fn(() => jest.fn())
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  },
  createLogger: jest.fn(() => mockWinstonLogger)
}));

describe('Logger', () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      logger = require('../../../src/utils/logger');
    });
  });

  test('should log info messages', () => {
    logger.info('test message');
    expect(mockWinstonLogger.info).toHaveBeenCalledWith('test message');
  });

  test('should log error messages', () => {
    logger.error('test error');
    expect(mockWinstonLogger.error).toHaveBeenCalledWith('test error');
  });

  test('should log warn messages', () => {
    logger.warn('test warning');
    expect(mockWinstonLogger.warn).toHaveBeenCalledWith('test warning');
  });

  test('should log debug messages', () => {
    logger.debug('test debug');
    expect(mockWinstonLogger.debug).toHaveBeenCalledWith('test debug');
  });

  test('should handle logger initialization errors', () => {
    const errorMsg = 'Failed to initialize logger';
    winston.createLogger.mockImplementationOnce(() => {
      throw new Error(errorMsg);
    });

    jest.isolateModules(() => {
      expect(() => require('../../../src/utils/logger')).toThrow(errorMsg);
    });
  });

  test('should create log directory if it does not exist', () => {
    // Reset all modules first
    jest.resetModules();

    const mockFsImpl = {
      existsSync: jest.fn(() => false),
      mkdirSync: jest.fn(),
    };

    // Mock fs module
    jest.doMock('fs', () => mockFsImpl);

    // Mock path module to ensure consistent path resolution
    jest.doMock('path', () => ({
      ...jest.requireActual('path'),
      join: (...args) => args.join('/'),
      resolve: (...args) => args.join('/')
    }));

    // Import and initialize logger
    jest.isolateModules(() => {
      require('../../../src/utils/logger');
      expect(mockFsImpl.existsSync).toHaveBeenCalledWith('.llm-pack/logs');
      expect(mockFsImpl.mkdirSync).toHaveBeenCalledWith('.llm-pack/logs', { recursive: true });
    });
  });

  test('should throw an error if creating log directory fails', () => {
    // Reset all modules first
    jest.resetModules();

    const errorMsg = 'Failed to create log directory';
    const mockFsImpl = {
      existsSync: jest.fn(() => false),
      mkdirSync: jest.fn(() => { throw new Error(errorMsg); }),
    };

    // Mock fs module
    jest.doMock('fs', () => mockFsImpl);

    // Mock path module to ensure consistent path resolution
    jest.doMock('path', () => ({
      ...jest.requireActual('path'),
      join: (...args) => args.join('/'),
      resolve: (...args) => args.join('/')
    }));

    // Expect logger initialization to throw an error
    jest.isolateModules(() => {
      expect(() => require('../../../src/utils/logger')).toThrow(errorMsg);
      expect(mockFsImpl.existsSync).toHaveBeenCalledWith('.llm-pack/logs');
      expect(mockFsImpl.mkdirSync).toHaveBeenCalledWith('.llm-pack/logs', { recursive: true });
    });
  });
});

