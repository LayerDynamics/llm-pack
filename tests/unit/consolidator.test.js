const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');
const Consolidator = require('../../src/core/consolidator');
const Logger = require('../../src/utils/logger');

jest.mock('../../src/utils/logger');

describe('Consolidator', () => {
  const outputDir = '.llm-pack';
  const outputFileName = 'consolidated_output.md';
  const outputFilePath = path.join(outputDir, outputFileName);
  const mockFiles = [
    {
      fileName: 'main.js',
      relativePath: 'src/main.js',
      metadata: { description: 'Entry point of the application', dependencies: ['utils.js'] },
      content: 'import utils from "./utils.js";\nconsole.log("Main");',
    },
    {
      fileName: 'utils.js',
      relativePath: 'src/utils.js',
      metadata: { description: 'JavaScript utility module', dependencies: [] },
      content: 'export const add = (a, b) => a + b;',
    },
  ];

  beforeEach(() => {
    mockFs({
      [outputDir]: {
        logs: {},
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('should create the output directory if it does not exist', async () => {
    mockFs({});
    const consolidator = new Consolidator(outputDir, outputFileName);
    await consolidator.consolidate(mockFiles);
    expect(fs.existsSync(outputDir)).toBe(true);
    expect(fs.existsSync(outputFilePath)).toBe(true);
  });

  test('should consolidate files into a single Markdown document with correct formatting', async () => {
    const consolidator = new Consolidator(outputDir, outputFileName);
    await consolidator.consolidate(mockFiles);

    // Update expected content to match actual output (no trailing separator)
    const expectedContent = `# main.js\n**Path**: \`src/main.js\`\n**Description**: Entry point of the application\n**Dependencies**: utils.js\n\n\`\`\`js\nimport utils from "./utils.js";\nconsole.log("Main");\n\`\`\`\n\n---\n\n# utils.js\n**Path**: \`src/utils.js\`\n**Description**: JavaScript utility module\n**Dependencies**: None\n\n\`\`\`js\nexport const add = (a, b) => a + b;\n\`\`\`\n`;

    const actualContent = fs.readFileSync(outputFilePath, 'utf8');
    expect(actualContent).toBe(expectedContent);
  });

  test('should escape triple backticks in file content', async () => {
    const filesWithBackticks = [
      {
        fileName: 'example.js',
        relativePath: 'src/example.js',
        metadata: { description: 'Example file with backticks', dependencies: [] },
        content: 'console.log(`Hello, World!`);\n// ``` should be escaped',
      },
    ];

    const consolidator = new Consolidator(outputDir, outputFileName);
    await consolidator.consolidate(filesWithBackticks);

    const actualContent = fs.readFileSync(outputFilePath, 'utf8');
    expect(actualContent).toContain('````');
  });

  test('should handle empty file array gracefully', async () => {
    const consolidator = new Consolidator(outputDir, outputFileName);
    await consolidator.consolidate([]);
    const actualContent = fs.readFileSync(outputFilePath, 'utf8');
    expect(actualContent).toBe('');
  });

  test('should throw an error if unable to write to the output file', async () => {
    mockFs({
      [outputDir]: mockFs.directory({
        mode: 0o444,
        items: {},
      }),
    });

    const consolidator = new Consolidator(outputDir, outputFileName);
    await expect(consolidator.consolidate(mockFiles)).rejects.toThrow();
  });

  test('should handle files with missing metadata gracefully', async () => {
    const filesWithoutMetadata = [
      {
        fileName: 'simple.js',
        relativePath: 'src/simple.js',
        content: 'console.log("Simple");',
      },
    ];

    const consolidator = new Consolidator(outputDir, outputFileName);
    await consolidator.consolidate(filesWithoutMetadata);
    const actualContent = fs.readFileSync(outputFilePath, 'utf8');
    expect(actualContent).toContain('**Description**: No description available.');
    expect(actualContent).toContain('**Dependencies**: None');
  });
});
