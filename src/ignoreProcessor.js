// src/ignoreProcessor.js

const fs = require('fs');
const path = require('path');
const ignore = require('ignore');

/**
 * A class that processes and manages ignore patterns from various ignore files (e.g., .gitignore, .npmignore).
 * Handles loading and applying ignore patterns from standard ignore files, custom ignore files, and directory-specific ignore files.
 * 
 * @class
 * @example
 * const processor = new IgnoreProcessor(['/path/to/custom/ignore'], '/path/to/config.json');
 * if (processor.isIgnored('file/to/check.js')) {
 *   console.log('This file is ignored');
 * }
 * 
 * @property {ignore} ig - Instance of the ignore package for pattern matching
 * @property {Array<string>} standardIgnoreFiles - List of standard ignore file names to look for
 */
class IgnoreProcessor {
	/**
	 * Constructs an IgnoreProcessor instance.
	 * @param {Array<string>} customIgnoreFiles - Array of custom ignore file paths.
	 * @param {string} [configPath=null] - Path to a custom configuration file containing default ignore patterns.
	 */
	constructor(customIgnoreFiles = [], configPath = null) {
		this.ig = ignore();
		this.standardIgnoreFiles = [
			'.gitignore',
			'.npmignore',
			'.eslintignore',
			'.dockerignore',
			'.prettierignore',
			'.hgignore',
			'.svnignore',
			// Add more standard ignore files as needed
		];
		this.loadDefaultPatterns(configPath);
		this.loadCustomIgnoreFiles(customIgnoreFiles);
	}

	/**
	 * Loads default ignore patterns from a JSON configuration file.
	 * @param {string|null} configPath - Path to the JSON configuration file.
	 */
	loadDefaultPatterns(configPath = null) {
		const defaultPatternsPath = configPath
			? path.resolve(configPath)
			: path.join(__dirname, '../config/defaultIgnorePatterns.json');
		if (fs.existsSync(defaultPatternsPath)) {
			try {
				const data = JSON.parse(fs.readFileSync(defaultPatternsPath, 'utf-8'));
				if (Array.isArray(data.ignorePatterns)) {
					this.ig.add(data.ignorePatterns);
					console.log(
						`Loaded default ignore patterns from ${defaultPatternsPath}`,
					);
				} else {
					console.warn(
						`Invalid format in default ignore patterns file: ${defaultPatternsPath}. Expected an array under "ignorePatterns".`,
					);
				}
			} catch (error) {
				console.error(
					`Error parsing default ignore patterns file: ${defaultPatternsPath}\n${error.message}`,
				);
			}
		} else {
			console.warn(
				`Default ignore patterns file not found at ${defaultPatternsPath}. Continuing without default patterns.`,
			);
		}
	}

	/**
	 * Loads and processes custom ignore files provided by the user.
	 * @param {Array<string>} customIgnoreFiles - Array of custom ignore file paths.
	 */
	loadCustomIgnoreFiles(customIgnoreFiles) {
		customIgnoreFiles.forEach((file) => {
			const absolutePath = path.isAbsolute(file)
				? file
				: path.join(process.cwd(), file);
			if (fs.existsSync(absolutePath)) {
				try {
					const patterns = fs
						.readFileSync(absolutePath, 'utf-8')
						.split('\n')
						.map((line) => line.trim())
						.filter((line) => line && !line.startsWith('#')); // Remove empty lines and comments
					this.ig.add(patterns);
					console.log(`Loaded custom ignore patterns from ${absolutePath}`);
				} catch (error) {
					console.error(
						`Error reading custom ignore file: ${absolutePath}\n${error.message}`,
					);
				}
			} else {
				console.warn(`Custom ignore file not found: ${absolutePath}`);
			}
		});
	}

	/**
	 * Loads and processes ignore patterns from a specific directory's ignore files.
	 * This method is used to handle ignore files in subdirectories during traversal.
	 * @param {string} dirPath - Absolute path of the directory to check for ignore files.
	 * @returns {Array<string>} - Array of ignore patterns found in the directory.
	 */
	loadIgnorePatternsFromDirectory(dirPath) {
		const patterns = [];
		// Detect all .{{service}}ignore files in the directory
		const ignoreFiles = this.standardIgnoreFiles.filter((ignoreFile) =>
			fs.existsSync(path.join(dirPath, ignoreFile)),
		);

		// Additionally, detect any other files that end with .ignore
		try {
			const dirEntries = fs.readdirSync(dirPath, { withFileTypes: true });
			dirEntries.forEach((entry) => {
				if (
					entry.isFile() &&
					entry.name.endsWith('.ignore') &&
					!this.standardIgnoreFiles.includes(entry.name)
				) {
					ignoreFiles.push(entry.name);
				}
			});
		} catch (error) {
			console.error(
				`Error reading directory for additional ignore files: ${dirPath}\n${error.message}`,
			);
		}

		ignoreFiles.forEach((ignoreFile) => {
			const ignoreFilePath = path.join(dirPath, ignoreFile);
			if (fs.existsSync(ignoreFilePath)) {
				try {
					const filePatterns = fs
						.readFileSync(ignoreFilePath, 'utf-8')
						.split('\n')
						.map((line) => line.trim())
						.filter((line) => line && !line.startsWith('#')); // Remove empty lines and comments
					// Prepend directory path to make patterns relative to rootDir
					const relativeDir = path.relative(process.cwd(), dirPath);
					const adjustedPatterns = filePatterns.map((pattern) => {
						if (pattern.startsWith('/')) {
							// Absolute patterns relative to the directory
							return path.join(relativeDir, pattern.substring(1));
						} else {
							// Relative patterns
							return path.join(relativeDir, pattern);
						}
					});
					patterns.push(...adjustedPatterns);
					console.log(`Loaded ignore patterns from ${ignoreFilePath}`);
				} catch (error) {
					console.error(
						`Error reading ignore file: ${ignoreFilePath}\n${error.message}`,
					);
				}
			}
		});

		return patterns;
	}

	/**
	 * Determines if a given file path should be ignored based on loaded patterns.
	 * @param {string} filePath - Relative file path to check.
	 * @returns {boolean} - Returns true if the file is ignored; otherwise, false.
	 */
	isIgnored(filePath) {
		return this.ig.ignores(filePath);
	}

	/**
	 * Adds additional patterns to the ignore instance.
	 * Useful for dynamically adding patterns during traversal.
	 * @param {Array<string>} patterns - Array of ignore patterns to add.
	 */
	addPatterns(patterns) {
		this.ig.add(patterns);
	}
}

module.exports = IgnoreProcessor;
