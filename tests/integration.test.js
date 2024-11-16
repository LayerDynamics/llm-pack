const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const os = require('os');

const execAsync = util.promisify(exec);
const ContentNormalizer = require('../src/contentNormalizer'); // Correctly reference ContentNormalizer

jest.setTimeout(60000); // 60 second timeout

describe('Integration Tests', () => {
  let testDir;
  let originalCwd;
  let normalizer; // Declare ContentNormalizer instance

  beforeEach(async () => {
    // Initialize ContentNormalizer with default options
    normalizer = new ContentNormalizer();

    // Store original working directory
    originalCwd = process.cwd();

    // Create test directory with a safe, unique name
    const timestamp = Date.now();
    testDir = path.join(os.tmpdir(), `llm-pack-test-${timestamp}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create test files
    await fs.writeFile(path.join(testDir, 'index.js'), 'console.log("Integration Test");');
    await fs.writeFile(path.join(testDir, 'README.md'), '# Integration Test');

    // Create large file
    const lines = Array.from({ length: 1000 }, (_, i) => `const a_${i} = ${i};`);
    await fs.writeFile(path.join(testDir, 'largeFile.js'), lines.join('\n'));

    // Create config directory and file
    const configDir = path.join(testDir, 'config');
    await fs.mkdir(configDir, { recursive: true });

    const configContent = {
      output: {
        format: 'markdown',
        path: './llm-pack-output.md',
        createDirectory: true,
      },
      limits: {
        maxFileSize: 1024,
        maxFiles: null,
        maxTotalSize: null,
      },
      processing: {
        batchSize: 100,
        streamingThreshold: 512,
        compactLargeFiles: true,
      },
      extensions: {
        include: ['.js', '.jsx', '.ts', '.tsx', '.md', '.json'],
        exclude: ['.min.js', '.map'],
      },
      ignore: {
        customPatterns: [],
        extendGitignore: true,
        defaultIgnores: true,
      },
    };

    await fs.writeFile(
      path.join(configDir, 'llm-pack.config.json'),
      JSON.stringify(configContent, null, 2)
    );

    // Change to test directory
    process.chdir(testDir);

    // Debug log
    console.log('Test setup complete:', {
      testDir,
      files: await fs.readdir(testDir),
      configFiles: await fs.readdir(configDir),
    });
  });

  afterEach(async () => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: Could not clean up test directory: ${error.message}`);
    }
  });

  async function runCLI(args) {
    const cliPath = path.resolve(__dirname, '../bin/index.js');
    const command = `node "${cliPath}" ${args}`;

    console.log('Executing CLI command:', command);
    console.log('Current working directory:', process.cwd());

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: testDir,
        timeout: 30000,
        env: {
          ...process.env,
          NO_COLOR: '1',
          DEBUG: 'true',
        },
      });

      console.log('CLI Output:', stdout);
      if (stderr) console.error('CLI Errors:', stderr);

      return { stdout, stderr };
    } catch (error) {
      console.error('CLI Execution Error:', {
        message: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
      });
      throw error;
    }
  }

  async function verifyFileExists(filePath) {
    try {
      await fs.access(filePath);
      const stats = await fs.stat(filePath);
      console.log('File verification:', {
        path: filePath,
        exists: true,
        size: stats.size,
        isFile: stats.isFile(),
      });
      return true;
    } catch (error) {
      console.error('File verification failed:', {
        path: filePath,
        error: error.message,
        code: error.code,
      });
      return false;
    }
  }

  // Helper function to extract code blocks from markdown
  function extractCodeContent(markdown) {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      codeBlocks.push(match[1].trim());
    }

    return codeBlocks;
  }

  test('CLI aggregates and compacts large files correctly', async () => {
    // Define paths relative to test directory
    const outputFileName = 'testOutput.md';
    const outputPath = path.join(testDir, outputFileName);
    const configPath = path.join('config', 'llm-pack.config.json');

    try {
      // First verify test directory contents
      const dirContents = await fs.readdir(testDir);
      console.log('Test directory contents:', dirContents);

      // Run CLI with explicit output path
      await runCLI(
        `--format markdown --output "${outputFileName}" --max-file-size 5 --use-compactor --compact-lines 50 --context-lines 2 --config "${configPath}"`
      );

      // Verify file exists
      const fileExists = await verifyFileExists(outputPath);
      expect(fileExists).toBe(true);

      // If file exists, verify content
      if (fileExists) {
        const content = await fs.readFile(outputPath, 'utf-8');
        const normalizedContent = normalizer.normalize(content); // Use ContentNormalizer
        console.log('Normalized Content:', normalizedContent); // Debugging log
        const codeBlocks = extractCodeContent(normalizedContent); // Use updated helper function

        console.log('Extracted Code Blocks:', codeBlocks); // Debugging log

        // Verify content structure
        expect(normalizedContent).toMatch(/index\.js/);
        expect(normalizedContent).toMatch(/README\.md/);
        expect(normalizedContent).toMatch(/largeFile\.js/);
        expect(normalizedContent).toMatch(/Content truncated/);

        // Additional assertions can be added here as needed
        // For example, verify specific code blocks
        expect(codeBlocks.length).toBeGreaterThan(0);
        expect(codeBlocks).toContain('console.log("Integration Test");');
      }
    } catch (error) {
      console.error('Test execution failed:', {
        error: error.message,
        stack: error.stack,
        testDir,
        outputPath,
      });
      throw error;
    }
  });
});
