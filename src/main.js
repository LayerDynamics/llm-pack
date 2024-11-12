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
    .scriptName("llm-pack")
    .usage("$0 [options]")
    .option("format", {
      alias: "f",
      describe: "Output format (markdown or json)",
      choices: ["markdown", "json"],
      default: "markdown",
    })
    .option("output", {
      alias: "o",
      describe: "Output file path",
      type: "string",
      default: null,
    })
    .option("ignore", {
      alias: "i",
      describe: "Custom ignore files",
      type: "array",
      default: [],
    })
    .option("extensions", {
      alias: "e",
      describe: "Additional file extensions to include",
      type: "array",
      default: [],
    })
    .help()
    .alias("help", "h").argv;

  try {
    const rootDir = process.cwd();
    const ignoreProcessor = new IgnoreProcessor(parsedArgv.ignore);
    const fileScanner = new FileScanner(
      rootDir,
      ignoreProcessor,
      parsedArgv.extensions,
    );
    const files = await fileScanner.scan();

    if (files.length === 0) {
      console.log(chalk.yellow("No files found to aggregate."));
      process.exit(0);
    }

    const contentFormatter = new ContentFormatter(parsedArgv.format);
    const formattedContents = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(rootDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const formattedContent = contentFormatter.formatContent(file, content);
        return { filePath: file, formattedContent };
      }),
    );

    const outputPath = parsedArgv.output
      ? path.isAbsolute(parsedArgv.output)
        ? parsedArgv.output
        : path.join(rootDir, parsedArgv.output)
      : path.join(
          rootDir,
          parsedArgv.format === "markdown"
            ? "llm-pack-output.md"
            : "llm-pack-output.json",
        );

    const outputAggregator = new OutputAggregator(
      parsedArgv.format,
      outputPath,
    );
    const aggregatedContent =
      outputAggregator.aggregateContents(formattedContents);
    await outputAggregator.saveOutput(aggregatedContent);
  } catch (error) {
    console.error(chalk.red("Error:"), error.message);
    process.exit(1);
  }
}

module.exports = { run };
