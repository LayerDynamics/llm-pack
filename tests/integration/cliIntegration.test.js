const path = require('path');
const fs = require('fs');
const os = require('os');
const { mkdtempSync, writeFileSync, mkdirSync, rmdirSync } = fs;
const execa = require('execa');

describe('CLI Integration', () => {
  const cliPath = path.join(__dirname, '../../src/cli/cli.js');
  let rootDir;

  beforeEach(() => {
    // Create a temporary directory
    rootDir = mkdtempSync(path.join(os.tmpdir(), 'llm-pack-test-'));

    // Set up the project structure within the temporary directory
    mkdirSync(path.join(rootDir, 'src'));
    mkdirSync(path.join(rootDir, 'src', 'cli'));
    mkdirSync(path.join(rootDir, 'src', 'gui'));
    mkdirSync(path.join(rootDir, 'tests'));
    mkdirSync(path.join(rootDir, '.llm-pack'));

    writeFileSync(path.join(rootDir, '.gitignore'), `
      node_modules/
      *.log
    `);

    writeFileSync(path.join(rootDir, 'src', 'main.js'), 'console.log("Main");');
    writeFileSync(path.join(rootDir, 'src', 'utils.js'), 'console.log("Utils");');
    writeFileSync(path.join(rootDir, 'README.md'), '# LLM-Pack Project');
  });

  afterEach(() => {
    // Remove the temporary directory and its contents
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  test('should run the entire pipeline with "llm-pack run"', async () => {
    try {
      // Use execa to run the CLI in a subprocess
      const { stdout } = await execa('node', [cliPath, 'run', '--root', rootDir]);

      expect(stdout).toContain('Pipeline execution complete.');

      // Check if .llm-pack/consolidated_output.md was created
      const outputFilePath = path.join(rootDir, '.llm-pack', 'consolidated_output.md');
      expect(fs.existsSync(outputFilePath)).toBe(true);
    } catch (error) {
      // If the CLI exits with a non-zero code, fail the test
      console.error(error.stdout);
      throw error;
    }
  });
});
