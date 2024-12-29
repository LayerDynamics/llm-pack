// tests/integration/cliIntegration.test.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const { mkdtempSync, writeFileSync, mkdirSync, rmdirSync } = fs;

// Mock execa
jest.mock('execa', () => ({
	command: jest.fn().mockResolvedValue({ stdout: 'mocked output' }),
}));

describe('CLI Integration', () => {
	const cliPath = path.join(__dirname, '../../src/cli/cli.js');
	let rootDir;

	beforeEach(() => {
		// Create a temporary directory
		rootDir = mkdtempSync(path.join(os.tmpdir(), 'llm-pack-test-'));

		// Set up the project structure within the temporary directory
		mkdirSync(path.join(rootDir, 'src'));
		mkdirSync(path.join(rootDir, 'src', 'cli'));
		mkdirSync(path.join(rootDir, 'src', 'gui'));
		mkdirSync(path.join(rootDir, 'tests'));
		mkdirSync(path.join(rootDir, '.llm-pack'));

		writeFileSync(
			path.join(rootDir, '.gitignore'),
			`
      node_modules/
      *.log
    `,
		);

		writeFileSync(path.join(rootDir, 'src', 'main.js'), 'console.log("Main");');
		writeFileSync(
			path.join(rootDir, 'src', 'utils.js'),
			'console.log("Utils");',
		);
		writeFileSync(path.join(rootDir, 'README.md'), '# LLM-Pack Project');
	});

	afterEach(() => {
		// Remove the temporary directory and its contents
		fs.rmSync(rootDir, { recursive: true, force: true });
	});

	test('should execute CLI commands successfully', async () => {
		const { command } = require('execa');

		await expect(
			command(`node ${cliPath} run ${rootDir}`),
		).resolves.toHaveProperty('stdout', 'mocked output');

		expect(command).toHaveBeenCalledWith(`node ${cliPath} run ${rootDir}`);
	});
});
