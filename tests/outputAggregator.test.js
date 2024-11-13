const OutputAggregator = require('../src/outputAggregator.js');

test('OutputAggregator aggregates Markdown correctly with ToC', () => {
  const aggregator = new OutputAggregator('markdown', 'output.md');
  const contents = [
    {
      filePath: 'src/index.js',
      formattedContent: `
*******************************
*       src/index.js         *
*******************************

\`\`\`javascript
console.log("Hello");
\`\`\`
`,
    },
    {
      filePath: 'README.md',
      formattedContent: `
*******************************
*       README.md         *
*******************************

\`\`\`markdown
# Project
\`\`\`
`,
    },
  ];
  const aggregated = aggregator.aggregateContents(contents);

  const expected = `# Table of Contents

- [src/index.js](#src-index-js)
- [README.md](#readme-md)

# Project Content

*******************************
*       src/index.js         *
*******************************

\`\`\`javascript
console.log("Hello");
\`\`\`

*******************************
*       README.md         *
*******************************

\`\`\`markdown
# Project
\`\`\``;

  expect(aggregated).toBe(expected);
});
