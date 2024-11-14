const fs = require('fs').promises;
const path = require('path');

/**
 * A class for scanning directories and filtering files based on extensions and ignore patterns.
 * Supports common version control system ignore files and custom ignore patterns.
 * Provides functionality to recursively traverse directories while respecting ignore rules.
 *
 * @class
 * @classdesc Scans file system directories while respecting ignore patterns and file extension filters.
 * @example
 * const scanner = new FileScanner('/path/to/root', ignoreProcessor);
 * const files = await scanner.scan();
 *
 * @property {string} rootDir - The root directory to start scanning from
 * @property {IgnoreProcessor} ignoreProcessor - Processor for handling ignore patterns
 * @property {Array<string>} allowedExtensions - List of file extensions to include in scan results
 *
 * @see {@link IgnoreProcessor} for ignore pattern handling
 */
class FileScanner {
  /**
   * Constructs a FileScanner instance.
   * @param {string} rootDir - Root directory to start scanning from.
   * @param {IgnoreProcessor} ignoreProcessor - Instance of IgnoreProcessor to handle ignore patterns.
   * @param {Array<string>} [additionalExtensions=[]] - Additional file extensions to include.
   */
  constructor(rootDir, ignoreProcessor, additionalExtensions = []) {
    this.rootDir = rootDir;
    this.ignoreProcessor = ignoreProcessor;
    this.allowedExtensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.json',
      '.md',
      '.html',
      '.css',
      '.py',
      '.java',
      '.c',
      '.cpp',
      '.rb',
      '.go',
      '.php',
      '.sh',
      ...additionalExtensions,
    ];
  }

  /**
   * Initiates the scanning process.
   * @returns {Promise<Array<string>>} - Array of relative file paths that are not ignored.
   */
  async scan() {
    const files = [];
    await this.traverseDirectory(this.rootDir, files, []);
    return files;
  }

  /**
   * Recursively traverses directories to find eligible files.
   * @param {string} currentDir - Current directory being traversed.
   * @param {Array<string>} files - Accumulator for eligible file paths.
   * @param {Array<string>} parentIgnorePatterns - Accumulated ignore patterns from parent directories.
   */
  async traverseDirectory(currentDir, files, parentIgnorePatterns) {
    let currentIgnorePatterns = [...parentIgnorePatterns];

    // Load ignore patterns from the current directory's ignore files
    const dirIgnorePatterns = this.ignoreProcessor.loadIgnorePatternsFromDirectory(currentDir);
    currentIgnorePatterns.push(...dirIgnorePatterns);

    // Update the IgnoreProcessor with new patterns
    if (dirIgnorePatterns.length > 0) {
      this.ignoreProcessor.addPatterns(dirIgnorePatterns);
    }

    // Create a new ignore instance for the current directory
    const ig = this.ignoreProcessor.ig;

    // Read directory entries
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      console.error(`Error reading directory: ${currentDir}\n${error.message}`);
      return;
    }

    // Sort entries alphabetically to ensure consistent order
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(this.rootDir, fullPath).split(path.sep).join('/'); // Normalize to forward slashes

      // Skip the current directory's ignore files as they have already been processed
      if (
        this.ignoreProcessor.standardIgnoreFiles.includes(entry.name) &&
        currentDir === this.rootDir
      ) {
        continue;
      }

      // Determine if the entry should be ignored based on current ignore patterns
      if (ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Exclude directories that are commonly ignored regardless of ignore files
        if (this.isCommonIgnoredDirectory(entry.name)) {
          continue;
        }
        await this.traverseDirectory(fullPath, files, currentIgnorePatterns);
      } else if (entry.isFile()) {
        if (this.isAllowedExtension(entry.name)) {
          files.push(relativePath);
        }
      }
    }
  }

  /**
   * Checks if the file has an allowed extension.
   * @param {string} filename - Name of the file to check.
   * @returns {boolean} - Returns true if the file has an allowed extension; otherwise, false.
   */
  isAllowedExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }

  /**
   * Checks if the directory name is commonly ignored (e.g., node_modules, .git).
   * @param {string} dirname - Name of the directory to check.
   * @returns {boolean} - Returns true if the directory is commonly ignored; otherwise, false.
   */
  isCommonIgnoredDirectory(dirname) {
    const ignoredDirs = [
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      'dist',
      'build',
      'coverage',
      'temp',
      'cache',
      'package-lock.json',
      // Add more commonly ignored directories as needed
    ];
    return ignoredDirs.includes(dirname);
  }
}

module.exports = FileScanner;
