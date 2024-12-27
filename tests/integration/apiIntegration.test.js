
const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');
const LlmPackAPI = require('../../src/api/api');
const Logger = require('../../src/utils/logger');

// Mock the logger to prevent actual logging during tests
jest.mock('../../src/utils/logger');

describe('LlmPackAPI Integration', () => {
  const rootDir = '/project';
  const configFileName = '.llm-pack.config.json';
  const outputDir = '.llm-pack';
  const outputFileName = 'consolidated_output.md';
  const configPath = path.join(rootDir, configFileName);

  beforeEach(() => {
    mockFs({
      '/project': {
        '.gitignore': `
          node_modules/
          *.log
        `,
        '.llm-pack.ignore': `
          dist/
        `,
        'src': {
          'main.js': 'import utils from "./utils.js";\nconsole.log("Main");',
          'utils.js': 'export const add = (a, b) => a + b;',
          'ignored.log': 'Should be ignored due to .gitignore',
        },
        'dist': {
          'bundle.js': 'console.log("bundle");',
        },
        'README.md': '# LLM-Pack Project',
        // Example user config
        '.llm-pack.config.json': JSON.stringify({
          sortingStrategy: 'lexical',
          metadata: {
            enrichDescriptions: false,
          },
          output: {
            dir: outputDir,
            fileName: outputFileName,
          },
        }),
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('should run the full process (scan, enrich, sort, consolidate) without errors', async () => {
    const llmPackAPI = new LlmPackAPI(rootDir);
    await llmPackAPI.runAll();

    // Check that the output file is created
    const consolidatedPath = path.join(rootDir, outputDir, outputFileName);
    expect(fs.existsSync(consolidatedPath)).toBe(true);

    // Validate partial content of the consolidated file
    const consolidatedContent = fs.readFileSync(consolidatedPath, 'utf8');
    expect(consolidatedContent).toContain('# main.js');
    expect(consolidatedContent).toContain('# utils.js');
    expect(consolidatedContent).toContain('# README.md'); // included because it's not ignored
    expect(consolidatedContent).not.toContain('ignored.log'); // ignored due to .gitignore
    expect(consolidatedContent).not.toContain('bundle.js'); // ignored due to .llm-pack.ignore
  });

  test('should allow overriding config programmatically', async () => {
    // Provide a custom config override
    const overrideConfig = {
      sortingStrategy: 'lexical',
      output: {
        dir: '.custom-pack',
        fileName: 'my_output.md',
      },
    };

    const llmPackAPI = new LlmPackAPI(rootDir, overrideConfig);
    await llmPackAPI.runAll();

    // Check that the output file is created in the overridden path
    const customOutputPath = path.join(rootDir, '.custom-pack', 'my_output.md');
    expect(fs.existsSync(customOutputPath)).toBe(true);
  });
});
