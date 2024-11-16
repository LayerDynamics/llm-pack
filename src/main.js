// main.js
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
const CodeCompactor = require('./codeCompactor');

/**
 * Generates the detailed help text for the CLI
 * @returns {string} Formatted help text
 */
function generateDetailedHelp() {
  return `
LLM-Pack: Project Content Aggregator for Large Language Models

Description:
  A command-line tool for aggregating project content and optimizing it for Large Language Models (LLMs).
  Processes directories recursively, respects ignore patterns, and generates optimized, structured output.

Usage:
  llm-pack [options]

Basic Options:
  -f, --format           Output format (markdown or json)                      [default: "markdown"]
  -o, --output          Output file path                                      [default: "llm-pack-output.{md|json}"]
  -i, --ignore          Custom ignore files                                   [array]
  -e, --extensions      Additional file extensions to include                  [array]
  -h, --help           Show help                                             [boolean]
  -v, --version        Show version number                                   [boolean]

Content Processing Options:
  --max-files          Maximum number of files to include                    [number]
  --max-file-size      Maximum file size in kilobytes                       [number]
  --use-compactor      Enable code compaction                               [boolean] [default: false]
  --compact-lines      Maximum lines before compaction                       [number] [default: 100]
  --context-lines      Context lines to preserve                            [number] [default: 3]
  --importance         Importance threshold for code preservation (0-1)      [number] [default: 0.6]

Normalization Options:
  --normalize-line-endings   Normalize line endings across files             [boolean] [default: true]
  --normalize-whitespace    Normalize whitespace in content                  [boolean] [default: true]
  --remove-html            Remove HTML tags from content                     [boolean] [default: false]
  --preserve-code-blocks   Preserve formatting in code blocks                [boolean] [default: true]

Performance Options:
  --enable-workers             Enable parallel processing                    [boolean] [default: false]
  --max-workers               Maximum number of worker threads              [number] [default: 4]
  --enable-memory-monitoring  Enable memory usage monitoring                [boolean] [default: false]
  --chunk-size               Size of chunks for streaming in bytes          [number] [default: 65536]
  --progress                 Enable detailed progress reporting             [boolean] [default: false]

Examples:
  # Basic usage with default settings
  llm-pack

  # Generate JSON output with custom file size limit
  llm-pack --format json --max-file-size 500

  # Use parallel processing with normalization
  llm-pack --enable-workers --max-workers 4 --normalize-whitespace

  # Enable code compaction with custom settings
  llm-pack --use-compactor --compact-lines 50 --context-lines 2

  # Custom output with specific normalizations
  llm-pack --output ./docs/output.md --normalize-line-endings --remove-html

Notes:
  - File size limits are in kilobytes
  - Worker threads can significantly improve performance for large projects
  - Normalization options help ensure consistent output
  - Code compaction preserves important code while reducing size
  - Progress reporting provides real-time processing information

For more information visit: https://github.com/LayerDynamics/llm-pack
`;
}

/**
 * Initializes application components
 * @param {Object} options Configuration options
 * @param {string} rootDir Project root directory
 * @returns {Promise<Object>} Initialized components
 */
async function initializeComponents(options, rootDir) {
  const ignoreProcessor = new IgnoreProcessor(options.ignoreFiles);

  const contentSizeManager = new ContentSizeManager(
    options.maxFileSize,
    options.maxFiles,
    options.extensions
  );

  const fileScanner = new FileScanner(rootDir, ignoreProcessor, options.extensions);

  const streamProcessor = new StreamProcessor({
    maxBufferSize: options.maxBufferSize,
    chunkSize: options.chunkSize,
    enableMemoryMonitoring: options.enableMemoryMonitoring,
    enableProgressReporting: options.progress,
    enableWorkers: options.enableWorkers,
    maxWorkers: options.maxWorkers,
    ...options.normalization,
  });

  const contentFormatter = new ContentFormatter(options.format, {
    theme: options.theme,
    highlightSyntax: true,
    ...options.normalization,
  });

  let codeCompactor = null;
  if (options.useCompactor && !options.enableWorkers) {
    codeCompactor = new CodeCompactor({
      maxLines: options.compactLines,
      contextLines: options.contextLines,
      preserveStructure: true,
      importanceThreshold: options.importanceThreshold,
      minCompactionRatio: 0.3,
    });
  }

  return {
    ignoreProcessor,
    contentSizeManager,
    fileScanner,
    streamProcessor,
    contentFormatter,
    codeCompactor,
  };
}

/**
 * Process a single file
 * @param {string} file File path
 * @param {Object} components Initialized components
 * @param {Object} options Configuration options
 * @param {Object} context Processing context
 * @returns {Promise<Object|null>} Processed content or null if skipped
 */
async function processFile(file, components, options, context) {
  const { contentSizeManager, streamProcessor, contentFormatter, codeCompactor } = components;
  const { rootDir, errorHandler, progressTracker } = context;

  // Sanitize input filename
  if (!file || typeof file !== 'string' || !file.match(/^[a-zA-Z0-9-_./\\]+$/)) {
    errorHandler.addWarning(`Invalid filename: ${file}`, 'FileProcessor');
    return null;
  }

  // Get absolute paths and normalize
  const absoluteRootDir = path.resolve(rootDir);
  const normalizedPath = path.resolve(absoluteRootDir, file);

  // Path traversal checks
  if (!normalizedPath.startsWith(absoluteRootDir)) {
    errorHandler.addWarning(`Invalid path ${file}: Path traversal detected`, 'FileProcessor');
    return null;
  }

  const relativePath = path.relative(absoluteRootDir, normalizedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    errorHandler.addWarning(`Invalid path ${file}: Path traversal detected`, 'FileProcessor');
    return null;
  }

  try {
    const stats = await fs.stat(normalizedPath);

    if (!stats.isFile()) {
      errorHandler.addWarning(`Not a file: ${file}`, 'FileProcessor');
      return null;
    }

    const processDecision = contentSizeManager.shouldProcessFile(file, stats.size);

    if (!processDecision.shouldProcess) {
      errorHandler.addWarning(`Skipping ${file}: ${processDecision.reason}`, 'FileProcessor');
      return null;
    }

    const realPath = await fs.realpath(normalizedPath);
    if (!realPath.startsWith(absoluteRootDir)) {
      throw new Error('Invalid file path: Path traversal detected');
    }

    let content;
    let compacted = false;

    if (options.enableWorkers && streamProcessor.fileProcessor) {
      const result = await streamProcessor.fileProcessor.processFile(realPath, {
        streamingThreshold: options.streamingThreshold || 5 * 1024 * 1024,
        compactLines: options.compactLines,
        contextLines: options.contextLines,
        importanceThreshold: options.importanceThreshold,
        normalizationOptions: options.normalization,
      });

      if (result.success) {
        content = result.result.formattedContent;
        compacted = result.result.compacted;
      } else {
        throw new Error(result.error.message);
      }
    } else {
      if (options.useCompactor && processDecision.shouldCompact && codeCompactor) {
        const fileExt = path.extname(file).substring(1);
        if (!fileExt.match(/^[a-zA-Z0-9]+$/)) {
          throw new Error('Invalid file extension');
        }
        console.log(chalk.blue(`Compacting ${path.basename(file)}...`));
        content = codeCompactor.compact(await fs.readFile(realPath, 'utf-8'), fileExt);
        compacted = true;
      } else if (stats.size > 512 * 1024) {
        content = await streamProcessor.processLargeFile(realPath, options.maxLines || 100, {
          normalizeContent: true,
          normalizationOptions: options.normalization,
        });
        compacted = true;
      } else {
        content = await fs.readFile(realPath, 'utf-8');
      }
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
}

/**
 * Main CLI execution function
 * @param {string[]} argv Command line arguments
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
      describe: 'Maximum number of files to include',
      type: 'number',
      default: null,
    })
    .option('max-file-size', {
      alias: 's',
      describe: 'Maximum file size in kilobytes',
      type: 'number',
      default: null,
    })
    .option('use-compactor', {
      describe: 'Enable code compaction',
      type: 'boolean',
      default: false,
    })
    .option('compact-lines', {
      describe: 'Maximum lines before compaction',
      type: 'number',
      implies: 'use-compactor',
      default: 100,
    })
    .option('context-lines', {
      describe: 'Context lines to preserve',
      type: 'number',
      implies: 'use-compactor',
      default: 3,
    })
    .option('importance', {
      describe: 'Importance threshold for code preservation (0-1)',
      type: 'number',
      implies: 'use-compactor',
      default: 0.6,
    })
    .option('normalize-line-endings', {
      describe: 'Normalize line endings across files',
      type: 'boolean',
      default: true,
    })
    .option('normalize-whitespace', {
      describe: 'Normalize whitespace in content',
      type: 'boolean',
      default: true,
    })
    .option('remove-html', {
      describe: 'Remove HTML tags from content',
      type: 'boolean',
      default: false,
    })
    .option('preserve-code-blocks', {
      describe: 'Preserve formatting in code blocks',
      type: 'boolean',
      default: true,
    })
    .option('enable-workers', {
      describe: 'Enable parallel processing using worker threads',
      type: 'boolean',
      default: false,
    })
    .option('max-workers', {
      describe: 'Maximum number of worker threads',
      type: 'number',
      default: 4,
    })
    .option('enable-memory-monitoring', {
      describe: 'Enable memory usage monitoring',
      type: 'boolean',
      default: false,
    })
    .option('chunk-size', {
      describe: 'Size of chunks for streaming in bytes',
      type: 'number',
      default: 64 * 1024,
    })
    .option('progress', {
      describe: 'Enable detailed progress reporting',
      type: 'boolean',
      default: false,
    })
    .option('config', {
      alias: 'c',
      describe: 'Path to configuration file',
      type: 'string',
      default: null,
    })
    .check((argv) => {
      if (argv.importance !== undefined && (argv.importance < 0 || argv.importance > 1)) {
        throw new Error('Importance threshold must be between 0 and 1');
      }
      if (argv.maxWorkers !== undefined && argv.maxWorkers < 1) {
        throw new Error('Max workers must be at least 1');
      }
      return true;
    })
    .middleware((argv) => {
      if (!argv.useCompactor && (argv.compactLines || argv.contextLines || argv.importance)) {
        console.warn(
          chalk.yellow(
            'Warning: Compaction options provided but compactor is not enabled. Use --use-compactor to enable compaction.'
          )
        );
      }
      if (argv.removeHtml && !argv.normalizeWhitespace) {
        console.warn(
          chalk.yellow(
            'Warning: --remove-html is more effective when used with --normalize-whitespace'
          )
        );
      }
    })
    .epilogue(generateDetailedHelp())
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'v')
    .wrap(null).argv;

  const errorHandler = new ErrorHandler();

  try {
    const configManager = new ConfigManager(parsedArgv.config);
    const config = await configManager.loadConfig();

    const options = {
      ...config,
      format: parsedArgv.format || config.output.format,
      outputPath: parsedArgv.output || config.output.path,
      maxFiles:
        parsedArgv['max-files'] !== undefined ? parsedArgv['max-files'] : config.limits.maxFiles,
      maxFileSize:
        parsedArgv['max-file-size'] !== undefined
          ? parsedArgv['max-file-size']
          : config.limits.maxFileSize,
      ignoreFiles: parsedArgv.ignore.length > 0 ? parsedArgv.ignore : config.ignore.customPatterns,
      extensions:
        parsedArgv.extensions.length > 0 ? parsedArgv.extensions : config.extensions.include,
      useCompactor: parsedArgv['use-compactor'],
      compactLines: parsedArgv['compact-lines'],
      contextLines: parsedArgv['context-lines'],
      importanceThreshold: parsedArgv['importance'],
      enableWorkers: parsedArgv['enable-workers'],
      maxWorkers: parsedArgv['max-workers'],
      enableMemoryMonitoring: parsedArgv['enable-memory-monitoring'],
      chunkSize: parsedArgv['chunk-size'],
      progress: parsedArgv['progress'],
      streamingThreshold: config.streamingThreshold || 5 * 1024 * 1024, // 5MB default
      maxHeapUsage: config.memoryLimits?.maxHeapUsage || null,
      memoryCheckInterval: config.memoryLimits?.checkInterval || 1000,
      normalization: {
        normalizeLineEndings:
          parsedArgv['normalize-line-endings'] !== undefined
            ? parsedArgv['normalize-line-endings']
            : (config.normalization?.normalizeLineEndings ?? true),
        normalizeWhitespace:
          parsedArgv['normalize-whitespace'] !== undefined
            ? parsedArgv['normalize-whitespace']
            : (config.normalization?.normalizeWhitespace ?? true),
        removeHtmlTags:
          parsedArgv['remove-html'] !== undefined
            ? parsedArgv['remove-html']
            : (config.normalization?.removeHtmlTags ?? false),
        preserveCodeBlocks:
          parsedArgv['preserve-code-blocks'] !== undefined
            ? parsedArgv['preserve-code-blocks']
            : (config.normalization?.preserveCodeBlocks ?? true),
      },
    };

    const rootDir = process.cwd();
    const components = await initializeComponents(options, rootDir);

    console.log(chalk.blue('Estimating project size...'));
    const sizeEstimate = await components.contentSizeManager.estimateProjectSize(
      rootDir,
      components.ignoreProcessor
    );

    const progressTracker = new ProgressTracker(sizeEstimate);
    const totalSize = Math.max(0, Math.round(parseFloat(sizeEstimate?.totalSize) || 0));
    const totalFiles = Math.max(0, Number(sizeEstimate?.totalFiles) || 0);

    console.log(chalk.blue(`Found ${totalFiles.toString()} files (${totalSize.toString()}KB)`));

    let files;
    try {
      files = await components.fileScanner.scan();
      if (!Array.isArray(files)) {
        throw new Error('File scanner did not return an array');
      }
    } catch (error) {
      console.error(chalk.red(`Error during file scan: ${error.message}`));
      files = [];
    }

    const fileCount = files.length;
    console.log(chalk.blue(`Processing ${fileCount.toString()} files...`));

    if (options.maxFiles !== null) {
      const maxFilesLimit = Number(options.maxFiles);
      if (Number.isFinite(maxFilesLimit) && files.length > maxFilesLimit) {
        const safeMaxFiles = maxFilesLimit.toString();
        console.log(chalk.yellow(`Limiting output to the first ${safeMaxFiles} files.`));
        files = files.slice(0, maxFilesLimit);
      } else if (!Number.isFinite(maxFilesLimit)) {
        console.warn(chalk.yellow('Invalid maxFiles value provided, processing all files'));
      }
    }

    const processContext = { rootDir, errorHandler, progressTracker };
    let formattedContents = [];

    if (options.enableWorkers && components.streamProcessor) {
      const { results, errors } = await components.streamProcessor.processBatch(files, {
        ...options,
        normalizeContent: true,
        normalizationOptions: options.normalization,
      });
      formattedContents = results;
      errors.forEach((err) => {
        errorHandler.addWarning(
          `Error processing ${err.file}: ${err.error.message}`,
          'StreamProcessor'
        );
      });
    } else {
      formattedContents = await Promise.all(
        files.map((file) => processFile(file, components, options, processContext))
      );
      formattedContents = formattedContents.filter((content) => content !== null);
    }

    let outputPath;
    if (options.outputPath) {
      const normalizedPath = path.normalize(options.outputPath).replace(/^(\.\.(\/|\\|$))+/, '');
      outputPath = path.isAbsolute(normalizedPath)
        ? normalizedPath
        : path.join(rootDir, normalizedPath);
      if (!outputPath.startsWith(path.resolve(rootDir))) {
        throw new Error('Invalid output path: Path traversal detected');
      }
    } else {
      outputPath = path.join(
        rootDir,
        options.format === 'markdown' ? 'llm-pack-output.md' : 'llm-pack-output.json'
      );
    }

    const outputAggregator = new OutputAggregator(options.format, outputPath, {
      ...options.normalization,
    });

    const aggregatedContent = outputAggregator.aggregateContents(formattedContents);
    await outputAggregator.saveOutput(aggregatedContent);

    progressTracker.complete();

    if (errorHandler.hasWarnings()) {
      console.log(
        chalk.yellow('\nWarnings occurred during processing. Check the output for details.')
      );
    }

    // Cleanup resources
    if (components.streamProcessor) {
      await components.streamProcessor.cleanup();
    }
    await outputAggregator.cleanup();
  } catch (error) {
    errorHandler.handleError(error, 'Main', true);
  }
}

module.exports = { run };
