const ErrorHandler = require('../src/errorHandler');

describe('ErrorHandler', () => {
  let handler;
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    handler = new ErrorHandler();
    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
    };
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
    processExitSpy.mockRestore();
  });

  test('handles non-fatal errors correctly', () => {
    const error = new Error('Test error');
    handler.handleError(error, 'test context', false);

    expect(handler.errors.length).toBe(1);
    expect(handler.errors[0].message).toBe('Test error');
    expect(handler.errors[0].context).toBe('test context');
    expect(handler.errors[0].isFatal).toBe(false);
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  test('handles fatal errors correctly', () => {
    const error = new Error('Fatal error');
    handler.handleError(error, 'test context', true);

    expect(handler.errors.length).toBe(1);
    expect(handler.errors[0].isFatal).toBe(true);
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test('handles warnings correctly', () => {
    handler.addWarning('Test warning', 'test context');

    expect(handler.warnings.length).toBe(1);
    expect(handler.warnings[0].message).toBe('Test warning');
    expect(handler.warnings[0].context).toBe('test context');
  });

  test('generates error report correctly', () => {
    handler.handleError(new Error('Error 1'), 'context 1');
    handler.addWarning('Warning 1', 'context 2');

    const report = handler.generateErrorReport();

    expect(report).toContain('# Error Report');
    expect(report).toContain('Error 1');
    expect(report).toContain('Warning 1');
  });

  test('correctly identifies error and warning presence', () => {
    expect(handler.hasErrors()).toBe(false);
    expect(handler.hasWarnings()).toBe(false);

    handler.handleError(new Error('Test error'), 'test');
    expect(handler.hasErrors()).toBe(true);

    handler.addWarning('Test warning', 'test');
    expect(handler.hasWarnings()).toBe(true);
  });

  test('includes stack traces in error report', () => {
    const error = new Error('Test error');
    handler.handleError(error, 'test context');

    const report = handler.generateErrorReport();
    expect(report).toContain('Stack Trace:');
    expect(report).toContain(error.stack);
  });

  test('handles multiple errors and warnings', () => {
    handler.handleError(new Error('Error 1'), 'context 1');
    handler.handleError(new Error('Error 2'), 'context 2');
    handler.addWarning('Warning 1', 'context 3');
    handler.addWarning('Warning 2', 'context 4');

    expect(handler.errors.length).toBe(2);
    expect(handler.warnings.length).toBe(2);

    const report = handler.generateErrorReport();
    expect(report).toContain('Error 1');
    expect(report).toContain('Error 2');
    expect(report).toContain('Warning 1');
    expect(report).toContain('Warning 2');
  });
});
