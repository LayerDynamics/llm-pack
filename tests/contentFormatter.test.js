const ContentFormatter = require('../src/contentFormatter.js');

test('ContentFormatter aggregates Markdown correctly without compacting', () => {
	const formatter = new ContentFormatter('markdown');
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
*       README.md         *
*******************************

\`\`\`markdown
# Project
\`\`\`
`,
		},
	];
	const aggregated = formatter.aggregate(contents);

	const expected = `# Project Content


*******************************
*       src/index.js         *
*******************************

\`\`\`javascript
console.log("Hello World!");
\`\`\`

*******************************
*       README.md         *
*******************************

\`\`\`markdown
# Project
\`\`\``;

	expect(aggregated).toBe(expected);
});

test('ContentFormatter aggregates Markdown correctly with compacted content', () => {
	const formatter = new ContentFormatter('markdown');
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

	const expected = `# Project Content


*******************************
*       largeFile.js         *
*******************************

\`\`\`javascript
const a = 1;
...
\`\`\`

*Note: The content of this file was truncated due to size constraints.*
`;

	expect(aggregated).toBe(expected);
});

test('ContentFormatter aggregates JSON correctly without compacting', () => {
	const formatter = new ContentFormatter('json');
	const contents = [
		{
			filePath: 'src/index.js',
			formattedContent: {
				filePath: 'src/index.js',
				content: 'console.log("Hello World!");',
			},
		},
		{
			filePath: 'README.md',
			formattedContent: { filePath: 'README.md', content: '# Project' },
		},
	];
	const aggregated = formatter.aggregate(contents);

	const expected = JSON.stringify(
		[
			{ filePath: 'src/index.js', content: 'console.log("Hello World!");' },
			{ filePath: 'README.md', content: '# Project' },
		],
		null,
		2,
	);
	expect(aggregated).toBe(expected);
});

test('ContentFormatter aggregates JSON correctly with compacted content', () => {
	const formatter = new ContentFormatter('json');
	const contents = [
		{
			filePath: 'largeFile.js',
			formattedContent: {
				filePath: 'largeFile.js',
				content: 'const a = 1;\n...',
				compacted: true,
				note: 'Content was truncated due to size constraints.',
			},
		},
	];
	const aggregated = formatter.aggregate(contents);

	const expected = JSON.stringify(
		[
			{
				filePath: 'largeFile.js',
				content: 'const a = 1;\n...',
				compacted: true,
				note: 'Content was truncated due to size constraints.',
			},
		],
		null,
		2,
	);
	expect(aggregated).toBe(expected);
});
