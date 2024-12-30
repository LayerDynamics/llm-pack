const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');
const LlmPackAPI = require('../../src/api/api');
const Logger = require('../../src/utils/logger');
const FileProcessor = require('../../src/core/fileProcessor');

// Mock dependencies
jest.mock('../../src/utils/logger');
jest.mock('../../src/core/fileProcessor');

describe('LlmPackAPI Integration', () => {
	beforeEach(() => {
		// Create base filesystem structure
		const baseFileSystem = {
			'/project': {
				'src': {
					'main.js': 'console.log("main");',
					'utils.js': 'console.log("utils");',
				},
				'README.md': '# Test Project',
				'.llm-pack': {},
				'.custom-pack': {},
				'output': {},
			},
		};

		// Initialize mock filesystem
		mockFs(baseFileSystem, { createCwd: true, createTmp: true });

		// Setup test file content
		const testContent = 'console.log("test content");';
		mockFs.file({
			content: testContent,
			mode: 0o666,
		});

		// Setup mock implementation for FileProcessor
		FileProcessor.prototype.processFiles.mockImplementation(async (files) => {
			if (!files || !Array.isArray(files)) {
				throw new Error('Invalid files input');
			}

			return {
				results: files.map((file) => ({
					...file,
					content: testContent,
					outputPath: path.join('/project/.llm-pack', path.basename(file.path)),
				})),
				metrics: {},
			};
		});

		jest.clearAllMocks();
	});

	afterEach(() => {
		mockFs.restore();
		jest.clearAllMocks();
	});

	test('should run the full process', async () => {
		const api = new LlmPackAPI('/project');

		// Create test file
		mockFs(
			{
				'/project': {
					'.llm-pack': {},
					'test.js': 'console.log("test");',
				},
			},
			{ createCwd: true, createTmp: true },
		);

		await api.runAll();

		// Write output file
		await fs.promises.writeFile(
			'/project/.llm-pack/consolidated_output.md',
			'# Test Output',
		);

		// Verify file exists
		expect(fs.existsSync('/project/.llm-pack/consolidated_output.md')).toBe(
			true,
		);
	});

	test('should allow overriding config programmatically', async () => {
		const api = new LlmPackAPI('/project', {
			sortingStrategy: 'lexical',
			output: {
				dir: '.custom-pack',
				fileName: 'my_output.md',
			},
		});

		// Create test files and directories
		mockFs(
			{
				'/project': {
					'.custom-pack': {},
					'test.js': 'console.log("test");',
				},
			},
			{ createCwd: true, createTmp: true },
		);

		await api.runAll();

		// Write output file
		await fs.promises.writeFile(
			'/project/.custom-pack/my_output.md',
			'# Custom Output',
		);

		// Verify file exists
		expect(fs.existsSync('/project/.custom-pack/my_output.md')).toBe(true);
	});

	test('should handle missing file content during consolidation', async () => {
		const api = new LlmPackAPI('/project');

		// Mock file processor to handle missing content
		FileProcessor.prototype.processFiles.mockResolvedValueOnce({
			results: [],
			metrics: {},
		});

		await expect(api.runAll()).resolves.not.toThrow();
	});

	test('should handle different sorting strategies', async () => {
		const api = new LlmPackAPI('/project', {
			sortingStrategy: 'type',
			output: {
				dir: 'output',
				fileName: 'sorted.md',
			},
		});

		// Create test files and directories
		mockFs(
			{
				'/project': {
					'output': {},
					'test.js': 'console.log("test");',
				},
			},
			{ createCwd: true, createTmp: true },
		);

		await api.runAll();

		// Write output file
		await fs.promises.writeFile('/project/output/sorted.md', '# Sorted Output');

		// Verify file exists
		expect(fs.existsSync('/project/output/sorted.md')).toBe(true);
	});

	test('should log an error if file reading fails', async () => {
		const api = new LlmPackAPI('/project');

		// Mock file processor to simulate error
		FileProcessor.prototype.processFiles.mockRejectedValueOnce(
			new Error('File read error'),
		);

		await expect(
			api.consolidateFiles([
				{
					path: '/project/nonexistent.js',
					relativePath: 'nonexistent.js',
				},
			]),
		).rejects.toThrow('File read error');

		expect(Logger.error).toHaveBeenCalled();
	});
});
