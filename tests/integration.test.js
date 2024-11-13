const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

jest.setTimeout(60000); // Increased timeout to 60 seconds to accommodate longer runs

describe('Integration Tests', () => {
	let testDir;

	beforeEach(() => {
		testDir = path.join(process.cwd(), 'tests', 'integrationTestProject');
		fs.mkdirSync(testDir, { recursive: true });
		fs.writeFileSync(
			path.join(testDir, 'index.js'),
			'console.log("Integration Test");',
		);
		fs.writeFileSync(path.join(testDir, 'README.md'), '# Integration Test');

		// Create a large file (~10KB)
		const largeContent = 'const a = 1;\n'.repeat(1000); // Approximately 10KB
		fs.writeFileSync(path.join(testDir, 'largeFile.js'), largeContent);
	});

	afterEach(() => {
		// Cleanup all files and directories created during tests
		fs.unlinkSync(path.join(testDir, 'index.js'));
		fs.unlinkSync(path.join(testDir, 'README.md'));
		fs.unlinkSync(path.join(testDir, 'largeFile.js'));
		const outputPath = path.join(testDir, 'testOutput.md');
		if (fs.existsSync(outputPath)) {
			fs.unlinkSync(outputPath);
		}
		fs.rmdirSync(testDir);
	});

	test('CLI aggregates files correctly with max-files and max-file-size options', async () => {
		const cliPath = path.resolve(__dirname, '../bin/index.js'); // Ensure this path is correct

		// Execute CLI with max-files=2 and max-file-size=5KB
		try {
			await execAsync(
				`node ${cliPath} --format markdown --output testOutput.md --max-files 2 --max-file-size 5`,
				{ cwd: testDir },
			);

			// Check if the output file exists
			const outputPath = path.join(testDir, 'testOutput.md');
			const exists = fs.existsSync(outputPath);
			expect(exists).toBe(true);

			if (!exists) {
				throw new Error(`Output file not found at ${outputPath}`);
			}

			// Read and verify the content of the output file
			const content = fs.readFileSync(outputPath, 'utf-8');

			// Verify ToC
			expect(content).toContain('- [src/index.js](#srcindexjs)');
			expect(content).toContain('- [README.md](#readmemd)');
			expect(content).not.toContain('- [largeFile.js](#largefilejs)');

			// Verify file sections with ASCII dividers
			expect(content).toContain('*       src/index.js         *');
			expect(content).toContain('*       README.md         *');
			expect(content).not.toContain('*       largeFile.js         *');

			// Verify code blocks
			expect(content).toContain('```javascript');
			expect(content).toContain('console.log("Integration Test");');
			expect(content).toContain('```markdown');
			expect(content).toContain('# Integration Test');

			// Verify that largeFile.js is excluded
			expect(content).not.toContain('const a = 1;');
		} catch (error) {
			console.error(`Test failed: ${error.message}`);
			throw error; // Let Jest handle the failure
		}
	});

	test('CLI aggregates and compacts large files correctly', async () => {
		const cliPath = path.resolve(__dirname, '../bin/index.js'); // Ensure this path is correct

		// Execute CLI with max-file-size=5KB (no max-files)
		try {
			await execAsync(
				`node ${cliPath} --format markdown --output testOutput.md --max-file-size 5`,
				{ cwd: testDir },
			);

			// Check if the output file exists
			const outputPath = path.join(testDir, 'testOutput.md');
			const exists = fs.existsSync(outputPath);
			expect(exists).toBe(true);

			if (!exists) {
				throw new Error(`Output file not found at ${outputPath}`);
			}

			// Read and verify the content of the output file
			const content = fs.readFileSync(outputPath, 'utf-8');

			// Verify ToC
			expect(content).toContain('- [src/index.js](#srcindexjs)');
			expect(content).toContain('- [README.md](#readmemd)');
			expect(content).toContain('- [largeFile.js](#largefilejs)');

			// Verify file sections with ASCII dividers
			expect(content).toContain('*       src/index.js         *');
			expect(content).toContain('*       README.md         *');
			expect(content).toContain('*       largeFile.js         *');

			// Verify code blocks
			expect(content).toContain('```javascript');
			expect(content).toContain('console.log("Integration Test");');
			expect(content).toContain('```markdown');
			expect(content).toContain('# Integration Test');

			// Verify that largeFile.js content is truncated
			expect(content).toContain('const a = 1;');
			expect(content).toContain('... (Content truncated)');
			expect(content).toContain(
				'*Note: The content of this file was truncated due to size constraints.*',
			);
		} catch (error) {
			console.error(`Test failed: ${error.message}`);
			throw error; // Let Jest handle the failure
		}
	});
});
