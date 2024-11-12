// tests/ignoreProcessor.test.js
const IgnoreProcessor = require("../src/ignoreProcessor.js");
const fs = require("fs");
const path = require("path");

test("IgnoreProcessor correctly ignores patterns", () => {
	const testDir = path.join(
		process.cwd(),
		"tests",
		"ignoreProcessorTestProject",
	);
	fs.mkdirSync(testDir, { recursive: true });

	const customIgnoreFile = path.join(testDir, "customIgnore.test");
	fs.writeFileSync(customIgnoreFile, "testDir/\n*.spec.js");

	const defaultIgnorePatterns = {
		ignorePatterns: [
			"node_modules/",
			"dist/",
			"coverage/",
			"__tests__/",
			"*.log",
			"*.tmp",
			"*.cache",
		],
	};

	const defaultPatternsPath = path.join(testDir, "defaultIgnorePatterns.json");
	fs.writeFileSync(
		defaultPatternsPath,
		JSON.stringify(defaultIgnorePatterns, null, 2),
	);

	const processor = new IgnoreProcessor(
		[customIgnoreFile],
		defaultPatternsPath,
	);

	expect(processor.isIgnored("node_modules/package.json")).toBe(true);
	expect(processor.isIgnored("dist/bundle.js")).toBe(true);
	expect(processor.isIgnored("testDir/file.js")).toBe(true);
	expect(processor.isIgnored("src/index.js")).toBe(false);
	expect(processor.isIgnored("src/index.spec.js")).toBe(true);

	// Cleanup
	fs.unlinkSync(customIgnoreFile);
	fs.unlinkSync(defaultPatternsPath);
	fs.rmdirSync(testDir);
});
