
const PerformanceOptimizer = require('../../src/core/performanceOptimizer');
const Logger = require('../../src/utils/logger');

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('PerformanceOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    optimizer = new PerformanceOptimizer();
  });

  test('should initialize with correct concurrency limit', () => {
    const cpuCount = require('os').cpus().length;
    expect(optimizer.concurrencyLimit).toBe(cpuCount * 2);
    expect(Logger.info).toHaveBeenCalledWith(`PerformanceOptimizer initialized with concurrency limit: ${cpuCount * 2}`);
  });

  test('should throw error if tasks is not an array', async () => {
    await expect(optimizer.runConcurrently(null)).rejects.toThrow('Tasks must be an array');
  });

  test('should execute all tasks', async () => {
    const task1 = jest.fn().mockResolvedValue('task1');
    const task2 = jest.fn().mockResolvedValue('task2');
    const tasks = [task1, task2];

    const results = await optimizer.runConcurrently(tasks);

    expect(task1).toHaveBeenCalled();
    expect(task2).toHaveBeenCalled();
    expect(results).toEqual(['task1', 'task2']);
  });

  test('should respect concurrency limit', async () => {
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

  test('should handle failed tasks without breaking execution', async () => {
    const successTask = jest.fn().mockResolvedValue('success');
    const failTask = jest.fn().mockRejectedValue(new Error('Task failed'));

    const tasks = [successTask, failTask, successTask];
    const results = await optimizer.runConcurrently(tasks);

    expect(results).toHaveLength(3);
    expect(results[0]).toBe('success');
    expect(results[1]).toBeUndefined();
    expect(results[2]).toBe('success');
  });

  test('should handle rejected tasks without affecting other tasks', async () => {
    const successfulTask = jest.fn().mockResolvedValue('success');
    const failingTask = jest.fn().mockRejectedValue(new Error('Task failed'));

    const tasks = [
      successfulTask,
      failingTask,
      successfulTask
    ];

    const results = await optimizer.runConcurrently(tasks);

    expect(successfulTask).toHaveBeenCalledTimes(2);
    expect(failingTask).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith('Task failed: Task failed');
    expect(results).toEqual(['success', undefined, 'success']);
  });

  test('should skip non-function tasks', async () => {
    const validTask = jest.fn().mockResolvedValue('valid');
    const invalidTask = 'invalid task';

    const tasks = [
      validTask,
      invalidTask,
      validTask
    ];

    const results = await optimizer.runConcurrently(tasks);

    expect(validTask).toHaveBeenCalledTimes(2);
    expect(Logger.error).not.toHaveBeenCalled();
    expect(results).toEqual(['valid', 'valid']);
  });
});
