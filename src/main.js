// src/main.js
const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const fs = require('fs').promises;
const ConfigManager = require('../config/configManager'); 
const IgnoreProcessor = require('./ignoreProcessor');
const FileScanner = require('./fileScanner');
const ContentFormatter = require('./contentFormatter');
const OutputAggregator = require('./outputAggregator');
const ContentSizeManager = require('./contentSizeManager');
const ProgressTracker = require('./progressTracker');
const StreamProcessor = require('./streamProcessor');
const ErrorHandler = require('./errorHandler');

/**
 * Runs the llm-pack CLI tool.
 * @param {string[]} argv - Command-line arguments.
 */
/**
 * Executes the llm-pack CLI application.
 *
 * Processes command-line arguments, loads configuration, scans files,
 * formats content, and outputs aggregated results based on the specified options.
 *
 * @async
 * @param {string[]} [argv=process.argv.slice(2)] - Command-line arguments array.
 * @returns {Promise<void>} Resolves when the application has finished running.
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
    .option('config', {
      alias: 'c',
      describe: 'Path to configuration file',
      type: 'string',
      default: null,
    })
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'v').argv;

  const errorHandler = new ErrorHandler();

  try {
    // Load configuration
    const configManager = new ConfigManager(parsedArgv.config);
    const config = await configManager.loadConfig();

    // Merge CLI arguments with config
    const options = {
      ...config,
      format: parsedArgv.format || config.output.format,
      outputPath: parsedArgv.output || config.output.path,
      maxFiles: parsedArgv['max-files'] || config.limits.maxFiles,
      maxFileSize: parsedArgv['max-file-size'] || config.limits.maxFileSize,
      ignoreFiles: parsedArgv.ignore || config.ignore.customPatterns,
      extensions: parsedArgv.extensions || config.extensions.include,
    };

    // Initialize components
    const rootDir = process.cwd();
    const ignoreProcessor = new IgnoreProcessor(options.ignoreFiles);
    const contentSizeManager = new ContentSizeManager(
      options.maxFileSize,
      options.maxFiles,
      options.extensions
    );
    const fileScanner = new FileScanner(rootDir, ignoreProcessor, options.extensions);
    const streamProcessor = new StreamProcessor();

    // Estimate project size
    console.log(chalk.blue('Estimating project size...'));
    const sizeEstimate = await contentSizeManager.estimateProjectSize(rootDir, ignoreProcessor);

    // Initialize progress tracking
    const progressTracker = new ProgressTracker(sizeEstimate);
    console.log(
      chalk.blue(`Found ${sizeEstimate.totalFiles} files (${Math.round(sizeEstimate.totalSize)}KB)`)
    );

    // Scan files
    let files = await fileScanner.scan();
    console.log(chalk.blue(`Processing ${files.length} files...`));

    // Apply file limits
    if (options.maxFiles !== null && files.length > options.maxFiles) {
      console.log(chalk.yellow(`Limiting output to the first ${options.maxFiles} files.`));
      files = files.slice(0, options.maxFiles);
    }

    if (files.length === 0) {
      console.log(chalk.yellow('No files found to aggregate.'));
      process.exit(0);
    }

    const contentFormatter = new ContentFormatter(options.format);
    const formattedContents = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(rootDir, file);
        let content;
        let compacted = false;

        try {
          const stats = await fs.stat(filePath);
          const fileSizeKB = stats.size / 1024;
          const processDecision = contentSizeManager.shouldProcessFile(file, stats.size);

          if (!processDecision.shouldProcess) {
            errorHandler.addWarning(`Skipping ${file}: ${processDecision.reason}`, 'FileProcessor');
            return null;
          }

          if (processDecision.shouldCompact) {
            content = await streamProcessor.processLargeFile(filePath);
            compacted = true;
          } else {
            content = await fs.readFile(filePath, 'utf-8');
          }

          progressTracker.updateProgress(stats.size);
          return {
            filePath: file,
            formattedContent: contentFormatter.formatContent(file, content, compacted),
          };
        } catch (error) {
          errorHandler.addWarning(`Error processing ${file}: ${error.message}`, 'FileProcessor');
          return null;
        }
      })
    );

    // Filter out null results from failed processing
    const validContents = formattedContents.filter((content) => content !== null);

    const outputPath = options.outputPath
      ? path.isAbsolute(options.outputPath)
        ? options.outputPath
        : path.join(rootDir, options.outputPath)
      : path.join(
          rootDir,
          options.format === 'markdown' ? 'llm-pack-output.md' : 'llm-pack-output.json'
        );

    const outputAggregator = new OutputAggregator(options.format, outputPath);
    const aggregatedContent = outputAggregator.aggregateContents(validContents);
    await outputAggregator.saveOutput(aggregatedContent);

    progressTracker.complete();

    if (errorHandler.hasWarnings()) {
      console.log(
        chalk.yellow('\nWarnings occurred during processing. Check the output for details.')
      );
    }
  } catch (error) {
    errorHandler.handleError(error, 'Main', true);
  }
}

module.exports = { run };
