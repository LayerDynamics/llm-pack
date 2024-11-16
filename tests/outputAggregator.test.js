const OutputAggregator = require('../src/outputAggregator');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('OutputAggregator', () => {
  let aggregator;
  let testDir;
  let outputPath;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'output-aggregator-test-'));
    outputPath = path.join(testDir, 'output.md');
    aggregator = new OutputAggregator('markdown', outputPath);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('aggregates Markdown correctly with ToC and content', async () => {
    const contents = [
      {
        filePath: 'src/index.js',
        formattedContent: `*******************************
*       src/index.js         *
*******************************

\`\`\`javascript
console.log("Hello World!");
function test() {
    return 42;
}
\`\`\``,
      },
      {
        filePath: 'README.md',
        formattedContent: `*******************************
*       README.md         *
*******************************

\`\`\`markdown
# Project Title

This is a test.
\`\`\``,
      },
    ];

    const aggregated = aggregator.aggregateContents(contents);

    // Check basic structure
    expect(aggregated).toContain('# Table of Contents');
    expect(aggregated).toContain('[src/index.js]');
    expect(aggregated).toContain('[README.md]');
    expect(aggregated).toContain('# Project Content');

    // Check file saving
    await aggregator.saveOutput(aggregated);
    const savedContent = await fs.readFile(outputPath, 'utf-8');
    expect(savedContent).toBe(aggregated);
  });

  test('aggregates JSON correctly', () => {
    const jsonAggregator = new OutputAggregator('json', path.join(testDir, 'output.json'));
    const contents = [
      {
        filePath: 'src/index.js',
        formattedContent: {
          content: 'console.log("Hello World!");',
          language: 'javascript',
        },
      },
      {
        filePath: 'README.md',
        formattedContent: {
          content: '# Project',
          language: 'markdown',
        },
      },
    ];

    const aggregated = jsonAggregator.aggregateContents(contents);
    const parsed = JSON.parse(aggregated);

    // Verify the structure
    expect(parsed).toHaveLength(2);
    expect(parsed[0].filePath).toBe('src/index.js');
    expect(parsed[0].content).toBe('console.log("Hello World!");');
    expect(parsed[0].language).toBe('javascript');

    expect(parsed[1].filePath).toBe('README.md');
    expect(parsed[1].content).toBe('# Project');
    expect(parsed[1].language).toBe('markdown');
  });

  test('handles empty content array', () => {
    const emptyContents = [];
    const emptyAggregated = aggregator.aggregateContents(emptyContents);
    expect(emptyAggregated).toContain('# Table of Contents');
    expect(emptyAggregated).toContain('# Project Content');
  });

  test('handles file path sanitization correctly', () => {
    const contents = [
      {
        filePath: 'src/main/file.js',
        formattedContent: 'test content',
      },
      {
        filePath: 'src\\windows\\path.js',
        formattedContent: 'test content',
      },
    ];

    const aggregated = aggregator.aggregateContents(contents);
    expect(aggregated).toContain('[src/main/file.js]');
    expect(aggregated).toContain('[src\\windows\\path.js]');
    expect(aggregated).toContain('test content');
  });

  test('preserves code block formatting', () => {
    const contents = [
      {
        filePath: 'test.js',
        formattedContent: `*******************************
*       test.js              *
*******************************

\`\`\`javascript
function test() {
    const x = 1;
    return x + 2;
}
\`\`\``,
      },
    ];

    const aggregated = aggregator.aggregateContents(contents);
    expect(aggregated).toContain('```javascript');
    expect(aggregated).toContain('function test()');
    expect(aggregated).toContain('const x = 1;');
    expect(aggregated).toContain('```');
  });

  test('validates output format', () => {
    expect(() => new OutputAggregator('invalid-format')).toThrow('Unsupported format');
    expect(() => new OutputAggregator('markdown')).not.toThrow();
    expect(() => new OutputAggregator('json')).not.toThrow();
  });

  test('appends correct file extension', () => {
    const mdAggregator = new OutputAggregator('markdown', 'output');
    expect(mdAggregator.outputPath.endsWith('.md')).toBe(true);

    const jsonAggregator = new OutputAggregator('json', 'output');
    expect(jsonAggregator.outputPath.endsWith('.json')).toBe(true);
  });

  test('handles saving to nested directories', async () => {
    const nestedDir = path.join(testDir, 'nested', 'dir');
    await fs.mkdir(nestedDir, { recursive: true });

    const nestedPath = path.join(nestedDir, 'output.md');
    const nestedAggregator = new OutputAggregator('markdown', nestedPath);

    const contents = [
      {
        filePath: 'test.js',
        formattedContent: 'test content',
      },
    ];

    const aggregated = nestedAggregator.aggregateContents(contents);
    await nestedAggregator.saveOutput(aggregated);

    const savedContent = await fs.readFile(nestedPath, 'utf-8');
    expect(savedContent).toBe(aggregated);
  });

  test('handles concurrent saves', async () => {
    const contents = Array.from({ length: 5 }, (_, i) => ({
      filePath: `file${i}.js`,
      formattedContent: `test content ${i}`,
    }));

    const aggregated = aggregator.aggregateContents(contents);

    const saves = Array.from({ length: 3 }, () => aggregator.saveOutput(aggregated));

    await expect(Promise.all(saves)).resolves.not.toThrow();

    const savedContent = await fs.readFile(outputPath, 'utf-8');
    expect(savedContent).toBe(aggregated);
  });

  test('validates content structure', () => {
    const invalidContents = [{}, { filePath: 'test.js' }, { formattedContent: 'content' }];

    invalidContents.forEach((content) => {
      expect(() => aggregator.aggregateContents([content])).toThrow();
    });
  });
});
