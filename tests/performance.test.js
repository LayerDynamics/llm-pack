const FileProcessor = require('../src/core/fileProcessor');
const BatchProcessor = require('../src/core/batchProcessor');
const MetricsCollector = require('../src/core/metricsCollector');
const fs = require('fs');
const path = require('path');

function generateLargeFile(size) {
	const tempDir = path.join(__dirname, 'temp');
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true });
	}
	const filePath = path.join(tempDir, 'large-file.txt');
	const data = 'x'.repeat(size);
	fs.writeFileSync(filePath, data);
	return { path: filePath, outputPath: filePath + '.out' };
}

function generateTestItems(count) {
	return Array.from({ length: count }, (_, i) => ({ id: i }));
}

async function processItem(item) {
	return { ...item, processed: true };
}

describe('Performance Tests', () => {
	const tempDir = path.join(__dirname, 'temp');

	beforeAll(() => {
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}
	});

	afterAll(() => {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	test('processes large files efficiently', async () => {
		const processor = new FileProcessor();
		const largeFile = generateLargeFile(1024 * 1024 * 10); // 10MB

		const startMemory = process.memoryUsage().heapUsed;
		const result = await processor.processFile(largeFile);
		const endMemory = process.memoryUsage().heapUsed;

		expect(endMemory - startMemory).toBeLessThan(1024 * 1024 * 50);
	}, 10000); // 10 second timeout

	test('handles batch processing efficiently', async () => {
		const batchProcessor = new BatchProcessor();
		const items = generateTestItems(10000);

		const startTime = process.hrtime();
		await batchProcessor.processAll(items, (item) => processItem(item));
		const [seconds] = process.hrtime(startTime);

		expect(seconds).toBeLessThan(5);
	});
});
