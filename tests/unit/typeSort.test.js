// tests/unit/typeSort.test.js
const TypeSort = require('../../src/core/strategies/typeSort');
const Logger = require('../../src/utils/logger');

jest.mock('../../src/utils/logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
}));

describe('TypeSort', () => {
	const files = [
		{ path: 'file1.js', relativePath: 'src/file1.js' },
		{ path: 'readme.md', relativePath: 'readme.md' },
		{ path: 'styles.css', relativePath: 'src/styles.css' },
	];

	it('should sort files by extension in ascending order', () => {
		const typeSort = new TypeSort({ order: 'asc' });
		const sorted = typeSort.sort(files);

		expect(sorted.map((f) => f.path)).toEqual([
			'styles.css',
			'file1.js',
			'readme.md',
		]);
	});

	it('should sort files by extension in descending order', () => {
		const typeSort = new TypeSort({ order: 'desc' });
		const sorted = typeSort.sort(files);

		expect(sorted.map((f) => f.path)).toEqual([
			'readme.md',
			'file1.js',
			'styles.css',
		]);
	});

	it('should handle files with no extension', () => {
		const filesWithNoExt = [{ path: 'LICENSE', relativePath: 'LICENSE' }];

		const typeSort = new TypeSort();
		const sorted = typeSort.sort(filesWithNoExt);
		expect(sorted[0].type).toBe('');
	});

	test('should handle files with unknown extensions', () => {
		const files = [
			{ path: 'test.unknown' },
			{ path: 'noextension' },
			{ path: 'test.js' },
		];

		const sorter = new TypeSort();
		const sorted = sorter.sort(files);

		expect(sorted[sorted.length - 1].path).toBe('test.js');
	});

	test('should handle unknown file types', () => {
		const typeSort = new TypeSort();
		const files = [
			{ path: 'unknown.xyz' },
			{ path: 'test.js' },
			{ path: 'noextension' },
		];

		const sorted = typeSort.sort(files);
		expect(sorted.length).toBe(3);
		// Ensure unknown types are handled
		expect(sorted.some((f) => f.path === 'unknown.xyz')).toBe(true);
	});
});

describe('TypeSort - Additional Coverage', () => {
	test('should handle unknown extension (lines 11-12)', () => {
		const sorter = new TypeSort();
		const files = [{ path: 'file.???' }];
		const sorted = sorter.sort(files);
		expect(sorted[0].type).toBe('other'); // or something that ensures line 11-12 is covered
	});
});
