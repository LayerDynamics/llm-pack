const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/logger');
const FileProcessor = require('./fileProcessor');
const MetricsCollector = require('./metricsCollector');

class Consolidator {
	constructor(options = {}) {
		this.outputDir = this.normalizeOutputDir(options.outputDir);
		this.outputFileName = options.outputFileName || 'output.md';
		this.outputFilePath = this.normalizeOutputPath(
			this.outputDir,
			this.outputFileName,
		);
		this.fileProcessor = new FileProcessor({
			...options,
			outputDir: this.outputDir,
		});
		this.metrics = new MetricsCollector();
	}

	normalizeOutputDir(dir) {
		if (dir === '') return '.';
		return dir || '.llm-pack';
	}

	normalizeOutputPath(dir, fileName) {
		if (dir === '.') return `./${fileName}`;
		return path.join(dir, fileName);
	}

	async ensureOutputDirectory() {
		if (this.outputDir === '') {
			Logger.info('Using current directory for output');
			return;
		}

		try {
			// Use fs.access to check if directory exists
			await fs.access(this.outputDir).catch(async () => {
				// Directory doesn't exist, create it
				await fs.mkdir(this.outputDir, { recursive: true });
				Logger.info(`Created output directory at ${this.outputDir}`);
			});
		} catch (error) {
			Logger.error(`Error ensuring output directory: ${error.message}`);
			throw error;
		}
	}

	async consolidate(files) {
		if (!Array.isArray(files)) {
			throw new Error('Files must be provided as an array');
		}

		const timer = this.metrics.startTimer('consolidation');

		try {
			await this.ensureOutputDirectory();

			const processed = await this.fileProcessor.processFiles(files);
			if (!processed || !processed.results) {
				throw new Error('File processing failed to return results');
			}

			const result = await this.createOutput(processed.results);

			timer();
			return {
				...result,
				metrics: {
					...processed.metrics,
					...this.metrics.generateReport(),
				},
			};
		} catch (error) {
			Logger.error(`Error during consolidation: ${error.message}`);
			throw error;
		}
	}

	async createOutput(results) {
		try {
			const content = results
				.filter((file) => file && file.fileName) // Filter out invalid files
				.map((file) => {
					const header = this.formatHeader(file);
					const body = this.formatContent(file);
					return `${header}${body}`;
				})
				.join('\n');

			await fs.writeFile(this.outputFilePath, content, 'utf8');
			Logger.info(`Files consolidated successfully to ${this.outputFilePath}`);
			return { success: true, results };
		} catch (error) {
			Logger.error(`Error during output creation: ${error.message}`);
			throw error;
		}
	}

	formatHeader(file) {
		const {
			fileName,
			relativePath,
			metadata = { description: '', dependencies: [] },
		} = file;
		const description = metadata.description || 'No description available.';
		const dependencies =
			metadata.dependencies && metadata.dependencies.length > 0
				? metadata.dependencies.join(', ')
				: 'None';

		return `# ${fileName}\n**Path**: \`${relativePath}\`\n**Description**: ${description}\n**Dependencies**: ${dependencies}\n\n`;
	}

	formatContent(file) {
		let ext = 'plaintext';
		if (file.fileName) {
			ext = path.extname(file.fileName).substring(1) || 'plaintext';
		}
		const content = file.content ? file.content.replace(/```/g, '````') : '';
		return `\`\`\`${ext}\n${content}\n\`\`\`\n`;
	}
}

module.exports = Consolidator;
