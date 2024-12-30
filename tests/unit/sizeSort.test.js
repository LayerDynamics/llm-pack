const SizeSort = require('../../src/core/strategies/sizeSort');

// Mock fs.promises.stat directly
jest.mock('fs', () => ({
	promises: {
		stat: jest.fn(),
	},
}));

// Mock Logger
jest.mock('../../src/utils/logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
}));

describe('SizeSort', () => {
	const fs = require('fs');
	const Logger = require('../../src/utils/logger');

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should sort files by size in ascending order', async () => {
		const files = [
			{ path: 'file1.txt' },
			{ path: 'file2.txt' },
			{ path: 'file3.txt' },
		];

		fs.promises.stat
			.mockResolvedValueOnce({ size: 300 })
			.mockResolvedValueOnce({ size: 100 })
			.mockResolvedValueOnce({ size: 200 });

		const sizeSort = new SizeSort({ order: 'asc' });
		const sorted = await sizeSort.sort(files);

		expect(sorted.map((f) => f.path)).toEqual([
			'file2.txt', // 100
			'file3.txt', // 200
			'file1.txt', // 300
		]);
	});

	it('should handle files with missing paths', async () => {
		const files = [{ relativePath: 'file1.txt' }];
		fs.promises.stat.mockResolvedValue({ size: 100 });

		const sizeSort = new SizeSort();
		const sorted = await sizeSort.sort(files);

		expect(sorted[0].size).toBe(100);
	});

	it('should handle stat errors gracefully', async () => {
		fs.promises.stat.mockRejectedValue(new Error('File not found'));

		const files = [{ path: 'nonexistent.txt' }];
		const sizeSort = new SizeSort();
		const sorted = await sizeSort.sort(files);

		expect(sorted[0].size).toBe(0);
		expect(Logger.error).toHaveBeenCalled();
	});

	it('should handle invalid input types', async () => {
		const sizeSort = new SizeSort();

		await expect(sizeSort.sort(null)).rejects.toThrow(
			'Files must be provided as an array',
		);

		await expect(sizeSort.sort('not an array')).rejects.toThrow(
			'Files must be provided as an array',
		);
	});

	it('should handle files without any path properties', async () => {
		const files = [{ name: 'test.txt' }];
		const sizeSort = new SizeSort();
		const sorted = await sizeSort.sort(files);

		expect(sorted[0].size).toBe(0);
		expect(Logger.warn).toHaveBeenCalledWith('SizeSort: File path not found');
	});

	it('should sort in descending order when specified', async () => {
		const files = [{ path: 'file1.txt' }, { path: 'file2.txt' }];

		fs.promises.stat
			.mockResolvedValueOnce({ size: 100 })
			.mockResolvedValueOnce({ size: 200 });

		const sizeSort = new SizeSort({ order: 'desc' });
		const sorted = await sizeSort.sort(files);

		expect(sorted[0].path).toBe('file2.txt');
		expect(sorted[1].path).toBe('file1.txt');
	});
});
