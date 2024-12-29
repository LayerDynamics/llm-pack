const fs = require('fs').promises;
const Logger = require('../../utils/logger');

class SizeSort {
  constructor(options = { order: 'asc' }) {
    this.order = options.order?.toLowerCase() === 'desc' ? 'desc' : 'asc';
  }

  async sort(files) {
    if (!Array.isArray(files)) {
      Logger.error('SizeSort: Input must be an array');
      throw new Error('Files must be provided as an array');
    }

    const filesWithSize = await Promise.all(
      files.map(async (file) => {
        const filePath = file.path || file.absolutePath || file.relativePath;
        if (!filePath) {
          Logger.warn('SizeSort: File path not found');
          return { ...file, size: 0 };
        }

        try {
          const stats = await fs.stat(filePath);
          return { ...file, size: stats.size };
        } catch (error) {
          Logger.error(`SizeSort: Error getting file size: ${error.message}`);
          return { ...file, size: 0 };
        }
      })
    );

    return filesWithSize.sort((a, b) => 
      this.order === 'asc' ? a.size - b.size : b.size - a.size
    );
  }
}

module.exports = SizeSort;