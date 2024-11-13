const ProgressTracker = require('../src/progressTracker');

describe('ProgressTracker', () => {
  let tracker;
  let consoleSpy;

  beforeEach(() => {
    tracker = new ProgressTracker({
      totalFiles: 100,
      totalSize: 1000, // 1000KB
    });
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'clear').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('initializes with correct values', () => {
    expect(tracker.totalFiles).toBe(100);
    expect(tracker.totalSize).toBe(1000);
    expect(tracker.processedFiles).toBe(0);
    expect(tracker.processedSize).toBe(0);
  });

  test('updates progress correctly', () => {
    tracker.updateProgress(1024); // 1KB
    expect(tracker.processedFiles).toBe(1);
    expect(tracker.processedSize).toBe(1);
  });

  test('displays progress at intervals', () => {
    jest.useFakeTimers();

    // First update
    tracker.updateProgress(1024);
    jest.advanceTimersByTime(500);

    // Second update after interval
    tracker.updateProgress(1024);
    jest.advanceTimersByTime(1000);

    // Force display
    tracker.displayProgress();

    expect(consoleSpy).toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('calculates completion percentage correctly', () => {
    tracker.updateProgress(102400); // 100KB
    const progress = (tracker.processedSize / tracker.totalSize) * 100;
    expect(progress).toBe(10); // 10% complete
  });

  test('estimates remaining time accurately', () => {
    jest.useFakeTimers();

    // Process 25% of files
    for (let i = 0; i < 25; i++) {
      tracker.updateProgress(1024);
    }

    jest.advanceTimersByTime(5000); // 5 seconds elapsed

    // Force display
    tracker.displayProgress();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Processing Progress:'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Files: 25/100'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Estimated Time Remaining:'));

    jest.useRealTimers();
  });

  test('handles completion correctly', () => {
    tracker.complete();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Processing Complete'));
  });
});
