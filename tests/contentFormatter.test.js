const ContentFormatter = require('../src/contentFormatter');
const ContentNormalizer = require('../src/contentNormalizer');

describe('ContentFormatter', () => {
  let formatter;
  let normalizer;

  beforeEach(() => {
    normalizer = new ContentNormalizer({
      normalizeLineEndings: true,
      normalizeWhitespace: true,
      removeHtmlTags: false,
    });
    formatter = new ContentFormatter('markdown', {
      theme: 'github',
      highlightSyntax: true,
      normalizer,
    });
  });

  test('should aggregate Markdown correctly without compacting', () => {
    const contents = [
      {
        filePath: 'src/index.js',
        formattedContent: `
*******************************
*       src/index.js         *
*******************************

\`\`\`javascript
console.log("Hello World!");
\`\`\`
`,
      },
      {
        filePath: 'README.md',
        formattedContent: `
*******************************
*       README.md           *
*******************************

\`\`\`markdown
# Project
\`\`\`
`,
      },
    ];
    const aggregated = formatter.aggregate(contents);

    expect(aggregated).toContain('# Table of Contents');
    expect(aggregated).toContain('- [src/index.js](#src-index-js)');
    expect(aggregated).toContain('- [README.md](#readme-md)');
    expect(aggregated).toContain('# Project Content');
    expect(aggregated).toContain('console.log("Hello World!");');
    expect(aggregated).toContain('# Project');
  });

  test('should aggregate Markdown correctly with compacted content', () => {
    const contents = [
      {
        filePath: 'largeFile.js',
        formattedContent: `
*******************************
*       largeFile.js         *
*******************************

\`\`\`javascript
const a = 1;
...
\`\`\`

*Note: The content of this file was truncated due to size constraints.*
`,
      },
    ];
    const aggregated = formatter.aggregate(contents);

    expect(aggregated).toContain('- [largeFile.js](#largefile-js)');
    expect(aggregated).toContain('const a = 1;');
    expect(aggregated).toContain(
      '*Note: The content of this file was truncated due to size constraints.*'
    );
  });

  test('should aggregate JSON correctly without compacting', () => {
    formatter = new ContentFormatter('json', { normalizer });
    const contents = [
      {
        filePath: 'src/index.js',
        formattedContent: {
          filePath: 'src/index.js',
          content: 'console.log("Hello World!");',
          language: 'javascript',
        },
      },
      {
        filePath: 'README.md',
        formattedContent: {
          filePath: 'README.md',
          content: '# Project',
          language: 'markdown',
        },
      },
    ];
    const aggregated = formatter.aggregate(contents);

    const expected = JSON.stringify(
      [
        {
          filePath: 'src/index.js',
          content: 'console.log("Hello World!");',
          language: 'javascript',
        },
        {
          filePath: 'README.md',
          content: '# Project',
          language: 'markdown',
        },
      ],
      null,
      2
    );
    expect(aggregated).toBe(expected);
  });

  test('should handle syntax highlighting with normalized content', () => {
    const code = '  console.log("Hello  World!");  ';
    const formatted = formatter.formatContent('index.js', code);

    expect(formatted).toContain('console.log("Hello World!")');
    expect(formatted).not.toContain('  Hello  World!  '); // Extra spaces should be normalized
  });

  test('should create valid anchor IDs from file paths', () => {
    const filePaths = [
      'path/to/file.js',
      'path\\to\\file.js',
      'file with spaces.js',
      '../path/file.js',
      './path/file.js',
    ];

    filePaths.forEach((filePath) => {
      const anchorId = formatter.createAnchorId(filePath);
      expect(anchorId).toMatch(/^[a-z0-9-]+$/); // Should only contain lowercase letters, numbers, and hyphens
      expect(anchorId).not.toContain('.'); // Should not contain dots
      expect(anchorId).not.toContain('/'); // Should not contain slashes
      expect(anchorId).not.toContain('\\'); // Should not contain backslashes
    });
  });

  test('should handle theme changes correctly', () => {
    expect(() => formatter.setTheme('monokai')).not.toThrow();
    expect(() => formatter.setTheme('invalid-theme')).toThrow(
      "Theme 'invalid-theme' is not supported"
    );
    expect(formatter.options.theme).toBe('monokai');
  });

  test('should normalize code content before highlighting', () => {
    const code = '  function   test()   {\n\r   console.log("test");  \n}  ';
    const formatted = formatter.formatContent('test.js', code);

    // Should have normalized whitespace but preserved essential formatting
    expect(formatted).toContain('function test() {');
    expect(formatted).toContain('console.log("test");');
    expect(formatted).toContain('}');
    // Check normalized code content only
    const codeBlock = formatted.match(/```javascript\n([\s\S]*?)```/)[1];
    expect(codeBlock).not.toContain('   '); // Should not have multiple spaces
  });

  test('should preserve code structure in normalized content', () => {
    const code = `
      class   Test   {
         constructor()   {
            this.value   =   42;
         }
      }
    `;
    const formatted = formatter.formatContent('test.js', code);

    expect(formatted).toContain('class Test {');
    expect(formatted).toContain('constructor() {');
    expect(formatted).toContain('this.value = 42;');
    expect(formatted).toContain('}');
  });
});
