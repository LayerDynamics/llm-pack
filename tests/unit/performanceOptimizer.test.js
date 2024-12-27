const PerformanceOptimizer = require('../../src/core/performanceOptimizer');

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const mockLogger = require('../../src/utils/logger');

describe('PerformanceOptimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with correct concurrency limit', () => {
    const optimizer = new PerformanceOptimizer();
    const cpuCount = require('os').cpus().length;
    expect(optimizer.concurrencyLimit).toBe(cpuCount * 2);
    expect(mockLogger.info).toHaveBeenCalledWith(`PerformanceOptimizer initialized with concurrency limit: ${cpuCount * 2}`);
  });

  test('should throw error if tasks is not an array', async () => {
    const optimizer = new PerformanceOptimizer();
    await expect(optimizer.runConcurrently(null)).rejects.toThrow('Tasks must be an array');
  });

  test('should execute all tasks', async () => {
    const optimizer = new PerformanceOptimizer();
    const task1 = jest.fn().mockResolvedValue('task1');
    const task2 = jest.fn().mockResolvedValue('task2');
    const tasks = [task1, task2];

    const results = await optimizer.runConcurrently(tasks);

    expect(task1).toHaveBeenCalled();
    expect(task2).toHaveBeenCalled();
    expect(results).toEqual(['task1', 'task2']);
  });

  test('should respect concurrency limit', async () => {
    const optimizer = new PerformanceOptimizer();
    const task = jest.fn().mockImplementation(() =>
      new Promise(res => setTimeout(res, 50))
    );

    // Create tasks that will be pending
    const tasks = Array(optimizer.concurrencyLimit + 1)
      .fill(null)
      .map(() => () => task());

    // Start running tasks
    const promise = optimizer.runConcurrently(tasks);

    // Wait for initial batch to start
    await new Promise(res => setTimeout(res, 25));

    // Verify initial batch size
    const currentCalls = task.mock.calls.length;
    expect(currentCalls).toBeLessThanOrEqual(optimizer.concurrencyLimit);

    // Wait for all tasks to complete
    await promise;

    // Verify all tasks completed
    expect(task).toHaveBeenCalledTimes(optimizer.concurrencyLimit + 1);
  });
});
