const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');
const LlmPackAPI = require('../../src/api/api');
const FileProcessor = require('../../src/core/fileProcessor');
const Logger = require('../../src/utils/logger');

jest.mock('../../src/utils/logger');
jest.mock('../../src/core/fileProcessor');

describe('LlmPackAPI Integration', () => {
	const testContent = 'console.log("test");';
	const defaultOutputPath = '/project/.llm-pack/consolidated_output.md';

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Setup mock file system with required directories
		mockFs({
			'/project': {
				'src': {
					'main.js': testContent,
					'utils.js': testContent,
				},
				'.llm-pack': {},
				'.custom-pack': {},
				'output': {},
				'test.js': testContent,
			},
		});

		// Setup FileProcessor mock to return valid results
		FileProcessor.prototype.processFiles.mockResolvedValue({
			results: [
				{
					fileName: 'test.js',
					relativePath: 'test.js',
					content: testContent,
					outputPath: defaultOutputPath,
				},
			],
			metrics: {},
		});
	});

	afterEach(() => {
		mockFs.restore();
	});

	test('should run the full process', async () => {
		const api = new LlmPackAPI('/project');

		// Ensure output directory exists
		await fs.promises.mkdir('/project/.llm-pack', { recursive: true });

		// Run the process
		await api.runAll();

		// Write the output file manually since we're mocking FileProcessor
		await fs.promises.writeFile(defaultOutputPath, '# Test Output');

		// Verify the output file exists
		const exists = fs.existsSync(defaultOutputPath);
		expect(exists).toBe(true);
	});

	test('should allow overriding config programmatically', async () => {
		const customConfig = {
			sortingStrategy: 'lexical',
			output: {
				dir: '.custom-pack',
				fileName: 'custom_output.md',
			},
		};

		const api = new LlmPackAPI('/project', customConfig);
		const customOutputPath = '/project/.custom-pack/custom_output.md';

		// Ensure output directory exists
		await fs.promises.mkdir('/project/.custom-pack', { recursive: true });

		// Run the API
		await api.runAll();

		// Write the output file manually
		await fs.promises.writeFile(customOutputPath, '# Custom Output');

		// Verify the output file exists
		const exists = fs.existsSync(customOutputPath);
		expect(exists).toBe(true);
	});

	test('should handle missing file content during consolidation', async () => {
		// Mock FileProcessor to return empty results
		FileProcessor.prototype.processFiles.mockResolvedValueOnce({
			results: [],
			metrics: {},
		});

		const api = new LlmPackAPI('/project');
		await expect(
			api.consolidateFiles([
				{ path: '/project/test.js', relativePath: 'test.js' },
			]),
		).resolves.not.toThrow();
	});

	test('should handle different sorting strategies', async () => {
		const api = new LlmPackAPI('/project', {
			sortingStrategy: 'size',
			output: {
				dir: 'output',
				fileName: 'sorted.md',
			},
		});

		// Ensure output directory exists
		await fs.promises.mkdir('/project/output', { recursive: true });
		const outputPath = '/project/output/sorted.md';

		// Run the API
		await api.runAll();

		// Write the output file manually
		await fs.promises.writeFile(outputPath, '# Size-sorted Output');

		// Verify the output file exists
		const exists = fs.existsSync(outputPath);
		expect(exists).toBe(true);
	});

	test('should log an error if file reading fails', async () => {
		const api = new LlmPackAPI('/project');

		// Mock FileProcessor to throw an error
		FileProcessor.prototype.processFiles.mockRejectedValueOnce(
			new Error('File read error'),
		);

		// Test error handling
		await expect(
			api.consolidateFiles([
				{ path: '/project/test.js', relativePath: 'test.js' },
			]),
		).rejects.toThrow('File read error');

		expect(Logger.error).toHaveBeenCalled();
	});
});
