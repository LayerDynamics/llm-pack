// tests/contentFormatter.test.js

const ContentFormatter = require("../src/contentFormatter.js");

test("ContentFormatter aggregates Markdown correctly", () => {
	const formatter = new ContentFormatter("markdown");
	const contents = [
		'## src/index.js\n\n```js\nconsole.log("Hello World");\n```\n',
		"## README.md\n\n```md\n# Project\n```\n",
	];
	const aggregated = formatter.aggregate(contents);

const expected = `# Project Content

## src/index.js

\`\`\`js
console.log("Hello World");
\`\`\`

## README.md

\`\`\`md
# Project
\`\`\``;
expect(aggregated).toEqual(expected);
});
