// tests/integration.test.js

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

jest.setTimeout(30000); // Increased timeout to 30 seconds to accommodate longer runs

test("CLI aggregates files correctly", (done) => {
	const testDir = path.join(process.cwd(), "tests", "integrationTestProject");
	fs.mkdirSync(testDir, { recursive: true });
	fs.writeFileSync(
		path.join(testDir, "index.js"),
		'console.log("Integration Test");',
	);
	fs.writeFileSync(path.join(testDir, "README.md"), "# Integration Test");

	const cliPath = path.resolve(__dirname, "../bin/index.js"); // Changed to bin/index.js

	exec(
		`node ${cliPath} --format markdown --output testOutput.md`,
		{ cwd: testDir },
		(error, stdout, stderr) => {
			if (error) {
				console.error(`CLI Error: ${error.message}`);
				console.error(`stderr: ${stderr}`);
				expect(error).toBeNull();
				done();
				return;
			}

			// Check if the output file exists
			const outputPath = path.join(testDir, "testOutput.md");
			const exists = fs.existsSync(outputPath);
			expect(exists).toBe(true);

			if (!exists) {
				console.error(`Output file not found at ${outputPath}`);
				done();
				return;
			}

			// Read and verify the content of the output file
			const content = fs.readFileSync(outputPath, "utf-8");
			expect(content).toContain("## index.js");
			expect(content).toContain("## README.md");

			// Cleanup
			fs.unlinkSync(path.join(testDir, "index.js"));
			fs.unlinkSync(path.join(testDir, "README.md"));
			fs.unlinkSync(outputPath);
			fs.rmdirSync(testDir);
			done();
		},
	);
});
