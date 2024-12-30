const mockFs = require('mock-fs');
const fs = require('fs');
const path = require('path');
const Consolidator = require('../../src/core/consolidator');
const FileProcessor = require('../../src/core/fileProcessor');

jest.mock('../../src/utils/logger');
jest.mock('../../src/core/fileProcessor');

describe('Consolidator', () => {
	beforeEach(() => {
		mockFs({
			'/test': {
				'input.txt': 'test content',
				'output': {},
			},
		});

		// Setup FileProcessor mock
		FileProcessor.prototype.processFiles.mockResolvedValue({
			results: [
				{
					fileName: 'test.js',
					relativePath: 'test.js',
					content: 'console.log("test");',
					outputPath: '/test/output/test.js',
				},
			],
			metrics: {},
		});

		jest.clearAllMocks();
	});

	afterEach(() => {
		mockFs.restore();
	});

	test('should initialize and consolidate files correctly', async () => {
		const consolidator = new Consolidator({
			outputDir: '/test/output',
			outputFileName: 'output.md',
		});

		const files = [
			{
				fileName: 'test.js',
				relativePath: 'test.js',
				content: 'console.log("test");',
			},
		];

		await consolidator.consolidate(files);

		expect(FileProcessor.prototype.processFiles).toHaveBeenCalledWith(files);
		expect(fs.existsSync('/test/output/output.md')).toBe(true);
	});

	test('should create the output directory if it does not exist', async () => {
		const consolidator = new Consolidator({
			outputDir: '/test/newdir',
			outputFileName: 'output.md',
		});

		await consolidator.ensureOutputDirectory();
		expect(fs.existsSync('/test/newdir')).toBe(true);
	});

	test('formatHeader should handle missing metadata correctly', () => {
		const consolidator = new Consolidator();
		const file = {
			fileName: 'test.js',
			relativePath: 'src/test.js',
		};
		const header = consolidator.formatHeader(file);
		expect(header).toContain('No description available');
		expect(header).toContain('**Dependencies**: None');
	});

	test('should use current directory when outputDir is empty', () => {
		const consolidator = new Consolidator({
			outputDir: '',
			outputFileName: 'output.md',
		});

		expect(consolidator.outputDir).toBe('.');
		expect(consolidator.outputFilePath).toBe('./output.md');
	});

	test('formatContent should handle different file extensions', () => {
		const consolidator = new Consolidator();
		const testCases = [
			{ fileName: 'test.js', expectedExt: 'js' },
			{ fileName: 'test.py', expectedExt: 'py' },
			{ fileName: 'test', expectedExt: 'plaintext' },
			{ fileName: undefined, expectedExt: 'plaintext' },
		];

		testCases.forEach(({ fileName, expectedExt }) => {
			const result = consolidator.formatContent({ fileName, content: 'test' });
			expect(result).toContain(`\`\`\`${expectedExt}\n`);
		});
	});

	test('should handle file processing errors gracefully', async () => {
		FileProcessor.prototype.processFiles.mockRejectedValueOnce(
			new Error('Processing failed'),
		);

		const consolidator = new Consolidator({
			outputDir: '/test/output',
			outputFileName: 'output.md',
		});

		await expect(
			consolidator.consolidate([{ path: 'test.js' }]),
		).rejects.toThrow('Processing failed');
	});
});
