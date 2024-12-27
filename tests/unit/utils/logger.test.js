const winston = require('winston');

const mockWinstonLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('winston', () => ({
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn()
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
});
