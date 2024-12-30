
class HeaderFormatter {
  createFileHeader(file) {
    return `# ${file.fileName}\n`;
  }

  formatMetadataSection(metadata) {
    const { description = 'No description', dependencies = [] } = metadata;
    return `**Description**: ${description}\n**Dependencies**: ${
      dependencies.length ? dependencies.join(', ') : 'None'
    }`;
  }

  createSeparator() {
    return '\n---\n';
  }
}

module.exports = HeaderFormatter;