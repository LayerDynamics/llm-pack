const mockFs = require('mock-fs');
const IgnoreProcessor = require('../../src/core/ignoreProcessor');

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const mockLogger = require('../../src/utils/logger');

describe('IgnoreProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs({
      '/project': {
        '.gitignore': 'node_modules/\n*.log',
        '.llm-pack.ignore': 'dist/\nsecrets/',
        'node_modules': {
          'module.js': 'console.log("module");',
        },
        'dist': {
          'bundle.js': 'console.log("bundle");',
        },
        'secrets': {
          'secret.txt': 'This is a secret.',
        },
        'app.js': 'console.log("app");',
        'error.log': 'This is a log file.',
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('should ignore files and directories based on .gitignore and .llm-pack.ignore', () => {
    const processor = new IgnoreProcessor('/project');

    expect(processor.isIgnored('/project/node_modules/module.js')).toBe(true);
    expect(processor.isIgnored('/project/dist/bundle.js')).toBe(true);
    expect(processor.isIgnored('/project/secrets/secret.txt')).toBe(true);
    expect(processor.isIgnored('/project/error.log')).toBe(true);
    expect(processor.isIgnored('/project/app.js')).toBe(false);
  });

  test('should handle absence of ignore files gracefully', () => {
    mockFs({
      '/empty-project': {
        'app.js': 'console.log("app");',
      },
    });

    const processor = new IgnoreProcessor('/empty-project');
    expect(processor.isIgnored('/empty-project/app.js')).toBe(false);
  });

  test('should ignore based on patterns in ignore files', () => {
    const processor = new IgnoreProcessor('/project');
    expect(processor.isIgnored('/project/temp/file.tmp')).toBe(false);

    mockFs({
      '/project/temp': {
        'file.tmp': 'temporary file',
      },
    });
    processor.loadIgnoreFiles();

    expect(processor.isIgnored('/project/temp/file.tmp')).toBe(false);
  });
});
