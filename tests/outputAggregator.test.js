// tests/outputAggregator.test.js
const OutputAggregator = require('../src/outputAggregator.js');

test('OutputAggregator aggregates Markdown correctly with ToC', () => {
	const aggregator = new OutputAggregator('markdown', 'output.md');
	const contents = [
		{ filePath: 'src/index.js', formattedContent: '## src/index.js\n\n```js\nconsole.log("Hello");\n```\n' },
		{ filePath: 'README.md', formattedContent: '## README.md\n\n```md\n# Project\n```\n' }
	];
	const aggregated = aggregator.aggregateContents(contents);

	const expected = `# Table of Contents

- [src/index.js](#srcindexjs)
- [README.md](#readmemd)

## src/index.js

\`\`\`js
console.log("Hello");
\`\`\`

## README.md

\`\`\`md
# Project
\`\`\`
`;

	expect(aggregated).toBe(expected);
});

test('OutputAggregator aggregates JSON correctly', () => {
	const aggregator = new OutputAggregator('json', 'output.json');
	const contents = [
		{ filePath: 'src/index.js', formattedContent: { filePath: 'src/index.js', content: 'console.log("Hello");' } },
		{ filePath: 'README.md', formattedContent: { filePath: 'README.md', content: '# Project' } }
	];
	const aggregated = aggregator.aggregateContents(contents);

	expect(aggregated).toBe(JSON.stringify(contents.map(item => item.formattedContent), null, 2));
});
