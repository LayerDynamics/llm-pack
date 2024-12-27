const path = require('path'); // Ensure path is required

class DependencySort {
  sort(files) {
    const fileMap = new Map();
    const sorted = [];
    const visited = new Set();
    const temp = new Set();

    // Initialize the file map
    files.forEach((file) => {
      fileMap.set(file.relativePath, file);
    });

    const visit = (file) => {
      if (visited.has(file.relativePath)) {
        return;
      }
      if (temp.has(file.relativePath)) {
        throw new Error(`Circular dependency detected involving ${file.relativePath}`);
      }

      temp.add(file.relativePath);

      // Process dependencies if they exist and are valid
      const deps = file.metadata?.dependencies;
      if (deps && Array.isArray(deps)) {
        for (const dep of deps) {
          if (!dep) continue; // Skip null/undefined dependencies
          
          const depPath = dep.endsWith('.js') ? dep : `${dep}.js`;
          const currentDir = path.dirname(file.relativePath);
          const depRelativePath = path.normalize(path.join(currentDir, depPath));

          const depFile = fileMap.get(depRelativePath);
          if (depFile) {
            visit(depFile);
          }
        }
      }

      temp.delete(file.relativePath);
      visited.add(file.relativePath);
      sorted.push(file);
    };

    try {
      // First process files with dependencies
      files.forEach((file) => {
        if (
          !visited.has(file.relativePath) &&
          file.metadata?.dependencies?.length > 0
        ) {
          visit(file);
        }
      });

      // Then process remaining files
      files.forEach((file) => {
        if (!visited.has(file.relativePath)) {
          visit(file);
        }
      });

      return sorted;
    } catch (error) {
      throw error; // Preserve original error message for circular dependencies
    }
  }
}

module.exports = DependencySort;

