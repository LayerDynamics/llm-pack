#!/usr/bin/env node

/**
 * CLI Entry Point
 * Provides commands to run LLM-Pack functionalities using commander.
 */

const { Command } = require('commander');
const path = require('path');
const Logger = require('../utils/logger');
const LlmPackAPI = require('../api/api');
const interactiveCLI = require('./interactive');

const program = new Command();

program
  .name('llm-pack')
  .description('A CLI tool to optimize project files for LLM consumption.')
  .version('0.1.0');

program
  .command('scan')
  .description('Scans the project for all non-ignored files.')
  .option('-r, --root <path>', 'Root directory of the project', process.cwd())
  .action(async (options) => {
    try {
      const { root } = options;
      const api = new LlmPackAPI(path.resolve(root));
      const files = await api.scanFiles();

      Logger.info(`Found ${files.length} files:`);
      files.forEach((file) => Logger.info(file));
    } catch (error) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

program
  .command('enrich')
  .description('Enriches scanned files with metadata.')
  .option('-r, --root <path>', 'Root directory of the project', process.cwd())
  .action(async (options) => {
    try {
      const { root } = options;
      const api = new LlmPackAPI(path.resolve(root));
      const files = await api.scanFiles();
      const enriched = await api.enrichMetadata(files);

      Logger.info(`Enriched ${enriched.length} files:`);
      enriched.forEach((file) =>
        Logger.info(`- ${file.relativePath} (Deps: ${file.metadata.dependencies.join(', ') || 'None'})`)
      );
    } catch (error) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

program
  .command('sort')
  .description('Sorts files using the configured strategy.')
  .option('-r, --root <path>', 'Root directory of the project', process.cwd())
  .option('-s, --strategy <type>', 'Sorting strategy (lexical, dependency, size, type)', 'lexical')
  .option('-o, --order <order>', 'Sort order (asc, desc)', 'asc')
  .action(async (options) => {
    try {
      const { root, strategy, order } = options;
      const api = new LlmPackAPI(path.resolve(root));
      const files = await api.scanFiles();
      const enriched = await api.enrichMetadata(files);
      const configOverride = {
        sortingStrategy: strategy,
        sortOrder: order,
      };
      const sorted = api.sortFiles(enriched, configOverride);

      Logger.info('Sorted files order:');
      sorted.forEach((file) => Logger.info(file.relativePath));
    } catch (error) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

program
  .command('consolidate')
  .description('Consolidates files into a single Markdown document.')
  .option('-r, --root <path>', 'Root directory of the project', process.cwd())
  .action(async (options) => {
    try {
      const { root } = options;
      const api = new LlmPackAPI(path.resolve(root));
      const files = await api.scanFiles();
      const enriched = await api.enrichMetadata(files);
      const sorted = api.sortFiles(enriched);
      await api.consolidateFiles(sorted);
      Logger.info('Consolidation complete. Check the .llm-pack folder for output.');
    } catch (error) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Runs the full pipeline: scan, enrich, sort, and consolidate.')
  .option('-r, --root <path>', 'Root directory of the project', process.cwd())
  .option('-s, --strategy <type>', 'Sorting strategy (lexical, dependency, size, type)', 'lexical')
  .option('-o, --order <order>', 'Sort order (asc, desc)', 'asc')
  .action(async (options) => {
    try {
      console.log('Starting LLM-Pack pipeline...');
      console.log(`Working directory: ${options.root}`);
      
      const { root, strategy, order } = options;
      const api = new LlmPackAPI(path.resolve(root));
      const configOverride = {
        sortingStrategy: strategy,
        sortOrder: order,
      };

      console.log('Scanning files...');
      await api.runAll(configOverride);
      
      console.log('Pipeline execution complete.');
      console.log(`Output directory: ${path.join(options.root, '.llm-pack')}`);
    } catch (error) {
      Logger.error('Pipeline failed:', error);
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('interactive')
  .description('Launches the interactive CLI mode.')
  .action(() => {
    interactiveCLI();
  });

program.parse(process.argv);
