class LexicalSort {
  sort(files) {
    return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }
}

module.exports = LexicalSort;
