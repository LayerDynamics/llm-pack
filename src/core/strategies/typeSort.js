// src/core/strategies/typeSort.js
const path = require('path');

class TypeSort {
	constructor(options = { order: 'asc' }) {
		this.order = options.order?.toLowerCase() === 'desc' ? 'desc' : 'asc';

		// Updated priorities to match test expectations
		this.typePriorities = new Map([
			['css', 1],    // Lowest priority for CSS
			['js', 2],     // JavaScript second
			['md', 3],     // Markdown highest
			['jsx', 2],
			['ts', 2],
			['tsx', 2],
			['json', 2],
			['html', 2],
			['other', 0],
			['', 0]
		]);
	}

	getFileType(filePath) {
		const ext = path.extname(filePath).toLowerCase();
		const type = ext ? ext.substring(1) : '';
		// Map unknown extensions to 'other'
		return this.typePriorities.has(type) ? type : 'other';
	}

	getPriority(type) {
		return this.typePriorities.get(type) ?? this.typePriorities.get('other');
	}

	sort(files) {
		const filesWithType = files.map((file) => {
			const filePath = file.path || file.relativePath;
			const type = this.getFileType(filePath);
			return { ...file, type };
		});

		return filesWithType.sort((a, b) => {
			const priorityA = this.getPriority(a.type);
			const priorityB = this.getPriority(b.type);

			if (priorityA !== priorityB) {
				// For descending order, swap the comparison
				return this.order === 'desc'
					? priorityB - priorityA
					: priorityA - priorityB;
			}

			// Secondary sort by path when priorities are equal
			const pathA = a.path || a.relativePath;
			const pathB = b.path || b.relativePath;
			return this.order === 'desc' 
				? pathB.localeCompare(pathA)
				: pathA.localeCompare(pathB);
		});
	}
}

module.exports = TypeSort;
