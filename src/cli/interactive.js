/**
 * Interactive CLI Mode
 * Prompts the user for configurations and runs the LLM-Pack pipeline.
 */

const inquirer = require('inquirer');
const path = require('path');
const Logger = require('../utils/logger');
const LlmPackAPI = require('../api/api');

async function interactiveCLI() {
  try {
    Logger.info('Starting interactive CLI mode...');

    const answers = await inquirer.prompt([
      {
        name: 'rootDir',
        type: 'input',
        message: 'Enter the root directory of your project:',
        default: process.cwd(),
      },
      {
        name: 'sortingStrategy',
        type: 'list',
        message: 'Choose a sorting strategy:',
        choices: ['lexical', 'dependency', 'size', 'type'],
        default: 'lexical',
      },
      {
        name: 'sortOrder',
        type: 'list',
        message: 'Choose a sort order:',
        choices: ['asc', 'desc'],
        when: (ans) => ['size', 'type'].includes(ans.sortingStrategy),
        default: 'asc',
      },
      {
        name: 'enrichDescriptions',
        type: 'confirm',
        message: 'Enable enrichment of descriptions?',
        default: true,
      },
      {
        name: 'detectDependencies',
        type: 'confirm',
        message: 'Enable detection of dependencies (import statements)?',
        default: true,
      },
      {
        name: 'outputDir',
        type: 'input',
        message: 'Output directory for consolidation?',
        default: '.llm-pack',
      },
      {
        name: 'outputFileName',
        type: 'input',
        message: 'Output file name for consolidated data?',
        default: 'consolidated_output.md',
      },
      {
        name: 'runAll',
        type: 'confirm',
        message: 'Would you like to run the entire pipeline now?',
        default: true,
      },
    ]);

    // Construct a config override from user input
    const configOverride = {
      sortingStrategy: answers.sortingStrategy,
      sortOrder: answers.sortOrder || 'asc',
      metadata: {
        enrichDescriptions: answers.enrichDescriptions,
        detectDependencies: answers.detectDependencies,
      },
      output: {
        dir: answers.outputDir,
        fileName: answers.outputFileName,
      },
    };

    const api = new LlmPackAPI(path.resolve(answers.rootDir), configOverride);

    if (answers.runAll) {
      await api.runAll();
      Logger.info('Pipeline execution complete (interactive mode).');
    } else {
      Logger.info('You can run `llm-pack run -r <rootDir>` to execute the pipeline later.');
    }
  } catch (error) {
    Logger.error(`Interactive CLI error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = interactiveCLI;
