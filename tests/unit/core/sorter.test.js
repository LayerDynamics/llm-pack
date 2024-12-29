const Sorter = require('../../../src/core/sorter');
const LexicalSort = require('../../../src/core/strategies/lexicalSort');
const DependencySort = require('../../../src/core/strategies/dependencySort');
const Logger = require('../../../src/utils/logger');

jest.mock('../../../src/utils/logger');

describe('Sorter', () => {
	let mockStrategy;

	beforeEach(() => {
		jest.clearAllMocks(); // Add this to reset all mocks before each test
		mockStrategy = {
			sort: jest.fn().mockResolvedValue([]),
			constructor: { name: 'MockStrategy' },
		};
	});

	const mockFiles = [
		{
			fileName: 'main.js',
			relativePath: 'src/main.js',
			metadata: { description: 'Entry point', dependencies: [] },
			content: 'console.log("main");',
		},
		{
			fileName: 'README.md',
			relativePath: 'README.md',
			metadata: { description: 'Documentation', dependencies: [] },
			content: '# Project',
		},
	];

	test('should sort files lexically by relativePath', async () => {
		const lexicalSort = new LexicalSort();
		const sorter = new Sorter(lexicalSort);
		const sortedFiles = await sorter.sort([...mockFiles]);
		expect(sortedFiles[0].relativePath).toBe('README.md');
	});

	test('should throw error if initialized without a strategy', () => {
		expect(() => new Sorter()).toThrow('Invalid sorting strategy provided');
	});

	test('should throw error if initialized with an invalid strategy', () => {
		expect(() => new Sorter({})).toThrow('Invalid sorting strategy provided');
	});

	test('should allow changing strategy', async () => {
		// Make async
		const lexicalSort = new LexicalSort();
		const sorter = new Sorter(lexicalSort);
		sorter.setStrategy(lexicalSort);
		const sortedFiles = await sorter.sort([...mockFiles]); // Add await
		expect(sortedFiles[0].relativePath).toBe('README.md');
	});

	test('should sort files lexically by relativePath using LexicalSort strategy', async () => {
		const lexicalSort = new LexicalSort();
		const sorter = new Sorter(lexicalSort);
		const sorted = await sorter.sort([...mockFiles]);
		expect(sorted[0].relativePath).toBe('README.md');
	});

	test('should sort files based on dependencies using DependencySort strategy', async () => {
		const dependencySort = new DependencySort();
		const sorter = new Sorter(dependencySort);
		const sorted = await sorter.sort([...mockFiles]);
		// Since both files have no dependencies, order should be preserved
		expect(sorted[0].relativePath).toBe('src/main.js');
	});

	test('should handle strategy errors correctly', async () => {
		const error = new Error('Strategy error');
		mockStrategy.sort.mockRejectedValue(error);
		const sorter = new Sorter(mockStrategy);

		await expect(sorter.sort([])).rejects.toThrow(
			'File sorting encountered an error',
		);
		expect(Logger.error).toHaveBeenCalledWith(
			'File sorting encountered an error: Strategy error',
			expect.any(Error),
		);
	});

	test('should handle async strategy errors correctly', async () => {
		const error = new Error('Strategy error');
		const errorStrategy = {
			sort: jest.fn().mockRejectedValue(error),
			constructor: { name: 'ErrorStrategy' },
		};

		const sorter = new Sorter(errorStrategy);
		await expect(sorter.sort([])).rejects.toThrow(
			'File sorting encountered an error: Strategy error',
		);
		const expectedMessage = 'File sorting encountered an error: Strategy error';
		expect(Logger.error).toHaveBeenCalledWith(expectedMessage, error);
	});

	test('should handle sorting when strategy.sort throws an error', async () => {
		const error = new Error('Strategy error');
		const faultyStrategy = {
			sort: jest.fn().mockRejectedValue(error),
			constructor: { name: 'FaultyStrategy' },
		};

		const sorter = new Sorter(faultyStrategy);
		await expect(sorter.sort([])).rejects.toThrow(
			'File sorting encountered an error: Strategy error',
		);
		const expectedMessage = 'File sorting encountered an error: Strategy error';
		expect(Logger.error).toHaveBeenCalledWith(expectedMessage, error);
	});

	test('should throw error when strategy sort function throws', async () => {
		const error = new Error('Strategy error');
		const errorStrategy = {
			sort: () => {
				throw error;
			},
			constructor: { name: 'ErrorStrategy' },
		};

		const sorter = new Sorter(errorStrategy);
		await expect(sorter.sort([])).rejects.toThrow(
			'File sorting encountered an error: Strategy error',
		);
		const expectedMessage = 'File sorting encountered an error: Strategy error';
		expect(Logger.error).toHaveBeenCalledWith(expectedMessage, error);
	});

	test('should throw error when strategy is invalid', () => {
		expect(() => new Sorter({ invalid: true })).toThrow(
			'Invalid sorting strategy provided',
		);
	});

	test('should throw error when sorting with invalid input', async () => {
		const sorter = new Sorter(mockStrategy);
		await expect(sorter.sort()).rejects.toThrow(
			'Files must be provided as an array',
		);
	});
});
