const path = require('path');

class DependencySort {
	constructor() {
		this.resolvedDeps = new Map();
	}

	sort(files) {
		if (!Array.isArray(files)) {
			throw new Error('Files must be provided as an array');
		}

		const fileMap = new Map();
		const sorted = [];
		const visited = new Set();
		const temp = new Set();

		// Initialize file map with normalized paths
		files.forEach((file) => {
			const key = file.relativePath || file.path;
			fileMap.set(key, file);
		});

		const visit = (file, chain = []) => {
			const fileKey = file.relativePath || file.path;

			if (visited.has(fileKey)) return;
			if (temp.has(fileKey)) {
				throw new Error(`Circular dependency detected involving ${chain[0]}`);
			}

			temp.add(fileKey);
			chain.push(fileKey);

			// Process dependencies
			const deps = file.metadata?.dependencies || [];
			if (Array.isArray(deps)) {
				for (const dep of deps) {
					if (!dep) continue;

					// Handle dependency path with or without .js extension
					const depPath = dep.endsWith('.js') ? dep : `${dep}.js`;
					const normalizedPath = depPath.startsWith('./')
						? path.join(path.dirname(fileKey), depPath.slice(2))
						: depPath;

					const depFile = fileMap.get(normalizedPath);
					if (depFile && !visited.has(normalizedPath)) {
						visit(depFile, [...chain]);
					}
				}
			}

			temp.delete(fileKey);
			visited.add(fileKey);
			sorted.push(file);
		};

		// Process all files
		for (const file of files) {
			if (!visited.has(file.relativePath || file.path)) {
				visit(file, []);
			}
		}

		return sorted;
	}
}

module.exports = DependencySort;
