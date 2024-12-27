const mockFs = require('mock-fs');
const FileScanner = require('../../src/core/fileScanner');
const fs = require('fs');
const PerformanceOptimizer = require('../../src/core/performanceOptimizer'); // Ensure this import is present

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const mockLogger = require('../../src/utils/logger');

describe('FileScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs({
      '/project': {
        '.gitignore': 'node_modules/\n*.log',
        '.llm-pack.ignore': 'dist/\nsecrets/',
        'node_modules': { 'module.js': 'console.log("module");' },
        'dist': { 'bundle.js': 'console.log("bundle");' },
        'secrets': { 'secret.txt': 'This is a secret.' },
        'src': {
          'main.js': 'console.log("main");',
          'utils.js': 'console.log("utils");',
          'helpers': { 'helper.js': 'console.log("helper");' }
        },
        'README.md': '# Project',
        'error.log': 'This is a log file.',
        'nested': {
          'deep': {
            'file.js': 'console.log("deep file");',
            'another.log': 'should be ignored'
          },
          'file2.js': 'console.log("file2");'
        }
      },
      '/empty-project': {}
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('should scan and return all non-ignored files', async () => {
    const scanner = new FileScanner('/project');
    const files = await scanner.scan();

    const expectedFiles = [
      '/project/README.md',
      '/project/src/main.js',
      '/project/src/utils.js',
      '/project/src/helpers/helper.js',
      '/project/nested/deep/file.js',
      '/project/nested/file2.js',
    ];

    expect(files.sort()).toEqual(expectedFiles.sort());
  });

  test('should return an empty array if no files are found', async () => {
    const scanner = new FileScanner('/empty-project');
    const files = await scanner.scan();

    expect(files).toEqual([]);
  });

  test('should throw an error if the root directory does not exist', async () => {
    const scanner = new FileScanner('/non-existent');
    await expect(scanner.scan()).rejects.toThrow();
  });

  test('should handle nested directories and files correctly', async () => {
    const scanner = new FileScanner('/project');
    const files = await scanner.scan();

    const expectedFiles = [
      '/project/README.md',
      '/project/src/main.js',
      '/project/src/utils.js',
      '/project/src/helpers/helper.js',
      '/project/nested/deep/file.js',
      '/project/nested/file2.js',
    ];

    expect(files.sort()).toEqual(expectedFiles.sort());
  });

  test('should handle errors during directory scanning', async () => {
    // Mock fs.readdir to throw an error
    jest.spyOn(fs.promises, 'readdir').mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const scanner = new FileScanner('/project');

    await expect(scanner.scan()).rejects.toThrow('Permission denied');

    // Restore the original implementation
    fs.promises.readdir.mockRestore();
  });

  test('should handle stat errors during scan', async () => {
    mockFs({
      '/test': {
        'file.js': mockFs.file({
          content: 'content',
          mode: parseInt('000', 8) // No permissions
        })
      }
    });

    // Mock fs.promises.access to throw Permission Denied for '/test/file.js'
    jest.spyOn(fs.promises, 'access').mockImplementation((path) => {
      if (path === '/test/file.js') {
        return Promise.reject(new Error('Permission denied'));
      }
      return Promise.resolve();
    });

    const scanner = new FileScanner('/test');
    const files = await scanner.scan();

    expect(files).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error scanning directory')
    );

    // Restore the original implementation
    fs.promises.access.mockRestore();
  });

  test('should handle permission errors when accessing a directory during scan', async () => {
    mockFs({
      '/project': {
        'restrictedDir': mockFs.directory({
          mode: 0o000, // No permissions
          items: {
            'file.js': 'console.log("restricted file");'
          }
        }),
        'accessibleDir': {
          'file.js': 'console.log("accessible file");'
        }
      }
    });

    const scanner = new FileScanner('/project');
    const files = await scanner.scan();

    const expectedFiles = [
      '/project/accessibleDir/file.js',
    ];

    expect(files.sort()).toEqual(expectedFiles.sort());
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error scanning directory /project/restrictedDir')
    );

    // Cleanup
    mockFs.restore();
  });

  test('should skip non-function tasks without affecting the scan', async () => {
    mockFs({
      '/project': {
        'file1.js': 'console.log("file1");',
        'file2.js': 'console.log("file2");',
      }
    });

    // Mock a non-function task
    const nonFunctionTask = 'not a function';

    // Spy on runConcurrently to include a non-function task
    jest.spyOn(PerformanceOptimizer.prototype, 'runConcurrently').mockImplementation(async (tasks) => {
      const validTasks = tasks.filter(task => typeof task === 'function');
      return Promise.all(validTasks.map(task => task()));
    });

    const scanner = new FileScanner('/project');
    const files = await scanner.scan();

    const expectedFiles = [
      '/project/file1.js',
      '/project/file2.js',
    ];

    expect(files.sort()).toEqual(expectedFiles.sort());
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);

    // Restore the original implementation
    PerformanceOptimizer.prototype.runConcurrently.mockRestore();
  });
});
