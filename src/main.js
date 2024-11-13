// src/main.js

const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const fs = require('fs').promises;
const IgnoreProcessor = require('./ignoreProcessor');
const FileScanner = require('./fileScanner');
const ContentFormatter = require('./contentFormatter');
const OutputAggregator = require('./outputAggregator');

/**
 * Runs the llm-pack CLI tool.
 * @param {string[]} argv - Command-line arguments.
 */
async function run(argv = process.argv.slice(2)) {
	const parsedArgv = yargs(hideBin(argv))
		.scriptName('llm-pack')
		.usage('$0 [options]')
		.option('format', {
			alias: 'f',
			describe: 'Output format (markdown or json)',
			choices: ['markdown', 'json'],
			default: 'markdown',
		})
		.option('output', {
			alias: 'o',
			describe: 'Output file path',
			type: 'string',
			default: null,
		})
		.option('ignore', {
			alias: 'i',
			describe: 'Custom ignore files',
			type: 'array',
			default: [],
		})
		.option('extensions', {
			alias: 'e',
			describe: 'Additional file extensions to include',
			type: 'array',
			default: [],
		})
		// New options
		.option('max-files', {
			alias: 'm',
			describe: 'Maximum number of files to include in the output',
			type: 'number',
			default: null,
		})
		.option('max-file-size', {
			alias: 's',
			describe:
				'Maximum file size in kilobytes. Files larger than this will be skipped or compacted.',
			type: 'number',
			default: null,
		})
		.help()
		.alias('help', 'h').argv;

	// Validate max-files
	if (parsedArgv['max-files'] !== null && parsedArgv['max-files'] <= 0) {
		console.error(chalk.red('Error: --max-files must be a positive integer.'));
		process.exit(1);
	}

	// Validate max-file-size
	if (
		parsedArgv['max-file-size'] !== null &&
		parsedArgv['max-file-size'] <= 0
	) {
		console.error(
			chalk.red('Error: --max-file-size must be a positive number.'),
		);
		process.exit(1);
	}

	try {
		const rootDir = process.cwd();
		const ignoreProcessor = new IgnoreProcessor(parsedArgv.ignore);
		const fileScanner = new FileScanner(
			rootDir,
			ignoreProcessor,
			parsedArgv.extensions,
		);
		let files = await fileScanner.scan();

		// Apply max-files limit if specified
		if (parsedArgv['max-files'] !== null) {
			if (files.length > parsedArgv['max-files']) {
				console.log(
					chalk.yellow(
						`Limiting output to the first ${parsedArgv['max-files']} files.`,
					),
				);
				files = files.slice(0, parsedArgv['max-files']);
			}
		}

		if (files.length === 0) {
			console.log(chalk.yellow('No files found to aggregate.'));
			process.exit(0);
		}

		const contentFormatter = new ContentFormatter(parsedArgv.format);
		const formattedContents = await Promise.all(
			files.map(async (file) => {
				const filePath = path.join(rootDir, file);
				let content;
				let compacted = false;
				const stats = await fs.stat(filePath);
				const fileSizeKB = stats.size / 1024;

				if (
					parsedArgv['max-file-size'] !== null &&
					fileSizeKB > parsedArgv['max-file-size']
				) {
					// Compact the file by taking the first 100 lines or a summary
					content = await compactFileContent(filePath);
					compacted = true;
				} else {
					content = await fs.readFile(filePath, 'utf-8');
				}

				const formattedContent = contentFormatter.formatContent(
					file,
					content,
					compacted,
				);
				return { filePath: file, formattedContent };
			}),
		);

		const outputPath = parsedArgv.output
			? path.isAbsolute(parsedArgv.output)
				? parsedArgv.output
				: path.join(rootDir, parsedArgv.output)
			: path.join(
					rootDir,
					parsedArgv.format === 'markdown'
						? 'llm-pack-output.md'
						: 'llm-pack-output.json',
				);

		const outputAggregator = new OutputAggregator(
			parsedArgv.format,
			outputPath,
		);
		const aggregatedContent =
			outputAggregator.aggregateContents(formattedContents);
		await outputAggregator.saveOutput(aggregatedContent);
	} catch (error) {
		console.error(chalk.red('Error:'), error.message);
		process.exit(1);
	}
}

/**
 * Compacts file content by taking the first 100 lines.
 * @param {string} filePath - Path to the file.
 * @param {number} maxLines - Maximum number of lines to include.
 * @returns {Promise<string>} - Compacted content.
 */
async function compactFileContent(filePath, maxLines = 100) {
	try {
		const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
		const readline = require('readline');
		const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
		let lines = [];
		for await (const line of rl) {
			lines.push(line);
			if (lines.length >= maxLines) {
				break;
			}
		}
		rl.close();
		stream.close();
		if (lines.length >= maxLines) {
			return lines.join('\n') + '\n... (Content truncated)';
		}
		return lines.join('\n');
	} catch (err) {
		console.warn(
			chalk.yellow(`Failed to compact file ${filePath}: ${err.message}`),
		);
		return '';
	}
}

module.exports = { run };
