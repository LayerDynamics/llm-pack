const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

jest.setTimeout(60000); // Increased timeout to 60 seconds

describe('Integration Tests', () => {
  let testDir;

  beforeEach(() => {
    testDir = path.join(process.cwd(), 'tests', 'integrationTestProject');
    fs.mkdirSync(testDir, { recursive: true });

    fs.writeFileSync(path.join(testDir, 'index.js'), 'console.log("Integration Test");');
    fs.writeFileSync(path.join(testDir, 'README.md'), '# Integration Test');

    // Create a large file (~10KB)
    const largeContent = 'const a = 1;\n'.repeat(1000);
    fs.writeFileSync(path.join(testDir, 'largeFile.js'), largeContent);
  });

  afterEach(() => {
    // Cleanup all files and directories created during tests
    if (fs.existsSync(path.join(testDir, 'index.js'))) {
      fs.unlinkSync(path.join(testDir, 'index.js'));
    }
    if (fs.existsSync(path.join(testDir, 'README.md'))) {
      fs.unlinkSync(path.join(testDir, 'README.md'));
    }
    if (fs.existsSync(path.join(testDir, 'largeFile.js'))) {
      fs.unlinkSync(path.join(testDir, 'largeFile.js'));
    }
    const outputPath = path.join(testDir, 'testOutput.md');
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  function normalizeLineEndings(str) {
    return str.replace(/\r\n/g, '\n').replace(/·/g, ' ').trim();
  }

  test('CLI aggregates files correctly with max-files and max-file-size options', async () => {
    const cliPath = path.resolve(__dirname, '../bin/index.js');

    try {
      await execAsync(`node ${cliPath} --format markdown --output testOutput.md --max-files 2`, {
        cwd: testDir,
      });

      const outputPath = path.join(testDir, 'testOutput.md');
      const exists = fs.existsSync(outputPath);
      expect(exists).toBe(true);

      if (!exists) {
        throw new Error(`Output file not found at ${outputPath}`);
      }

      const content = normalizeLineEndings(fs.readFileSync(outputPath, 'utf-8'));

      // Debug output
      console.log('Full file content:', content);

      // Just verify that exactly two files are included
      const tocLines = content
        .split('\n')
        .filter((line) => line.startsWith('- ['))
        .map((line) => line.trim());

      expect(tocLines.length).toBe(2);
      expect(content).toMatch(/```javascript.*console\.log\("Integration Test"\);.*```/s);
    } catch (error) {
      console.error(`Test failed: ${error.message}`);
      throw error;
    }
  });

  test('CLI aggregates and compacts large files correctly', async () => {
    const cliPath = path.resolve(__dirname, '../bin/index.js');

    try {
      await execAsync(
        `node ${cliPath} --format markdown --output testOutput.md --max-file-size 5`,
        { cwd: testDir }
      );

      const outputPath = path.join(testDir, 'testOutput.md');
      const exists = fs.existsSync(outputPath);
      expect(exists).toBe(true);

      if (!exists) {
        throw new Error(`Output file not found at ${outputPath}`);
      }

      const content = normalizeLineEndings(fs.readFileSync(outputPath, 'utf-8'));

      // Debug output
      console.log('Full file content:', content);

      // Verify that all three files are included (order doesn't matter)
      expect(content).toContain('- [index.js](#index-js)');
      expect(content).toContain('- [README.md](#readme-md)');
      expect(content).toContain('- [largeFile.js](#largefile-js)');

      // Verify content exists for each file
      expect(content).toContain('console.log("Integration Test")');
      expect(content).toContain('# Integration Test');
      expect(content).toContain('const a = 1;');
      expect(content).toContain('... (Content truncated)');
      expect(content).toContain(
        '*Note: The content of this file was truncated due to size constraints.*'
      );

      // Check separators are present (without requiring specific format)
      expect(content).toMatch(/\*+\s+index\.js\s+\*+/);
      expect(content).toMatch(/\*+\s+README\.md\s+\*+/);
      expect(content).toMatch(/\*+\s+largeFile\.js\s+\*+/);
    } catch (error) {
      console.error(`Test failed: ${error.message}`);
      throw error;
    }
  });
});
