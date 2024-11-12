// src/fileScanner.js
const path = require("path");
const fs = require("fs/promises");

class FileScanner {
	constructor(rootDir, ignoreProcessor, additionalExtensions = []) {
		this.rootDir = rootDir;
		this.ignoreProcessor = ignoreProcessor;
		this.additionalExtensions = additionalExtensions.map((ext) =>
			ext.startsWith(".") ? ext : `.${ext}`,
		);
		this.defaultExtensions = [".js", ".md", ".json", ".ts", ".jsx", ".tsx"];
		this.allExtensions = [
			...this.defaultExtensions,
			...this.additionalExtensions,
		];
	}

	/**
	 * Recursively traverse directories starting from rootDir
	 * and collect files matching the allowed extensions and not ignored.
	 * @returns {Promise<string[]>} - Array of relative file paths
	 */
	async scan() {
		const files = [];
		await this.traverseDirectory(this.rootDir, files);
		return files;
	}

	/**
	 * Helper function to traverse directories recursively.
	 * @param {string} dir - Current directory path
	 * @param {string[]} files - Accumulator for file paths
	 */
	async traverseDirectory(dir, files) {
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			const relativePath = path
				.relative(this.rootDir, fullPath)
				.split(path.sep)
				.join("/"); // Normalize to forward slashes

			if (this.ignoreProcessor.isIgnored(relativePath)) {
				continue;
			}

			if (entry.isDirectory()) {
				// Exclude directories that are commonly ignored
				if (this.isCommonIgnoredDirectory(entry.name)) {
					continue;
				}
				await this.traverseDirectory(fullPath, files);
			} else if (entry.isFile()) {
				if (this.isAllowedExtension(entry.name)) {
					files.push(relativePath);
				}
			}
		}
	}

	/**
	 * Check if the file has an allowed extension.
	 * @param {string} fileName
	 * @returns {boolean}
	 */
	isAllowedExtension(fileName) {
		const ext = path.extname(fileName).toLowerCase();
		return this.allExtensions.includes(ext);
	}

	/**
	 * Check if the directory is commonly ignored.
	 * @param {string} dirName
	 * @returns {boolean}
	 */
	isCommonIgnoredDirectory(dirName) {
		const ignoredDirs = ["node_modules", "dist", "coverage", "__tests__"];
		return ignoredDirs.includes(dirName);
	}
}

module.exports = FileScanner;
