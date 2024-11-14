// tests/fileScanner.test.js

const FileScanner = require('../src/fileScanner.js');
const IgnoreProcessor = require('../src/ignoreProcessor.js');
const fs = require('fs');
const path = require('path');

describe('FileScanner', () => {
  const testRoot = path.join(process.cwd(), 'tests', 'fileScannerTestProject');

  beforeAll(async () => {
    // Set up a test project directory
    await fs.promises.mkdir(testRoot, { recursive: true });
    await fs.promises.writeFile(path.join(testRoot, 'index.js'), 'console.log("Hello World");');
    await fs.promises.writeFile(path.join(testRoot, 'README.md'), '# Test Project');
    await fs.promises.mkdir(path.join(testRoot, 'node_modules'), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(testRoot, 'node_modules', 'module.js'),
      'module.exports = {};'
    );
    await fs.promises.mkdir(path.join(testRoot, 'src'), { recursive: true });
    await fs.promises.writeFile(path.join(testRoot, 'src', 'app.js'), 'console.log("App");');
    await fs.promises.writeFile(
      path.join(testRoot, 'src', 'app.spec.js'),
      'console.log("App Spec");'
    );

    // Create defaultIgnorePatterns.json
    const defaultIgnorePatterns = {
      ignorePatterns: [
        'node_modules/',
        'dist/',
        'coverage/',
        '__tests__/',
        '*.log',
        '*.tmp',
        '*.cache',
        '**/*.spec.js',
        'defaultIgnorePatterns.json',
      ],
    };

    const defaultPatternsPath = path.join(testRoot, 'defaultIgnorePatterns.json');
    await fs.promises.writeFile(
      defaultPatternsPath,
      JSON.stringify(defaultIgnorePatterns, null, 2)
    );
  });

  afterAll(async () => {
    // Clean up the test project directory
    const filesToDelete = [
      path.join(testRoot, 'index.js'),
      path.join(testRoot, 'README.md'),
      path.join(testRoot, 'node_modules', 'module.js'),
      path.join(testRoot, 'src', 'app.js'),
      path.join(testRoot, 'src', 'app.spec.js'),
      path.join(testRoot, 'defaultIgnorePatterns.json'),
    ];

    for (const filePath of filesToDelete) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err; // Re-throw if it's not a file not found error
        }
        // If the file doesn't exist, continue
      }
    }

    // Remove directories
    const dirsToRemove = [
      path.join(testRoot, 'node_modules'),
      path.join(testRoot, 'src'),
      testRoot,
    ];

    for (const dirPath of dirsToRemove) {
      try {
        await fs.promises.rmdir(dirPath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err; // Re-throw if it's not a directory not found error
        }
        // If the directory doesn't exist, continue
      }
    }
  });

  test('FileScanner scans and filters files correctly', async () => {
    const processor = new IgnoreProcessor([], path.join(testRoot, 'defaultIgnorePatterns.json'));
    const scanner = new FileScanner(testRoot, processor);
    const files = await scanner.scan();

    expect(files).toContain('index.js');
    expect(files).toContain('README.md');
    expect(files).not.toContain('node_modules/module.js');
    expect(files).toContain('src/app.js');
    expect(files).not.toContain('src/app.spec.js');
    expect(files).not.toContain('defaultIgnorePatterns.json');
  });
});
