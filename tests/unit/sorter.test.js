const Sorter = require('../../src/core/sorter');
const Logger = require('../../src/utils/logger');

jest.mock('../../src/utils/logger');

describe('Sorter', () => {
	let mockStrategy;

	beforeEach(() => {
		mockStrategy = {
			sort: jest.fn().mockImplementation((files) => files),
		};
		jest.clearAllMocks();
	});

	it('should initialize with a valid strategy', () => {
		const sorter = new Sorter(mockStrategy);
		expect(sorter.strategy).toBe(mockStrategy);
	});

	it('should throw error if initialized with invalid strategy', () => {
		expect(() => new Sorter()).toThrow('Invalid sorting strategy provided');
		expect(() => new Sorter({})).toThrow('Invalid sorting strategy provided');
	});

	it('should allow changing strategy', () => {
		const sorter = new Sorter(mockStrategy);
		const newStrategy = {
			sort: jest.fn(),
		};
		sorter.setStrategy(newStrategy);
		expect(sorter.strategy).toBe(newStrategy);
	});

	it('should sort files using the current strategy', async () => {
		const files = [{ path: 'test.js' }];
		const sorter = new Sorter(mockStrategy);
		await sorter.sort(files);
		expect(mockStrategy.sort).toHaveBeenCalledWith(files);
	});

	it('should throw error when sorting with invalid input', async () => {
		const sorter = new Sorter(mockStrategy);
		await expect(sorter.sort()).rejects.toThrow(
			'Files must be provided as an array',
		);
	});

	it('should handle strategy errors gracefully', async () => {
		mockStrategy.sort.mockRejectedValue(new Error('Sort failed'));
		const sorter = new Sorter(mockStrategy);
		await expect(sorter.sort([])).rejects.toThrow('Sort failed');
		expect(Logger.error).toHaveBeenCalled();
	});
});
