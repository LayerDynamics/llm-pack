
const path = require('path');

class MarkdownFormatter {
  formatFile(file) {
    const header = this.createHeader(file);
    const metadata = this.formatMetadata(file.metadata || {});
    const content = this.formatContent(file);
    return this.combine(header, metadata, content);
  }

  createHeader(file) {
    return file.fileName || 'Untitled';
  }

  formatMetadata(metadata) {
    const description = metadata.description || 'No description available.';
    const dependencies = (metadata.dependencies && metadata.dependencies.length > 0)
      ? metadata.dependencies.join(', ')
      : 'None';
    return `**Description**: ${description}\n**Dependencies**: ${dependencies}`;
  }

  formatContent(file) {
    let ext = path.extname(file.fileName || '').substring(1) || 'plaintext';
    // Escape triple backticks in content
    const escaped = (file.content || '').replace(/```/g, '````');
    return `\`\`\`${ext}\n${escaped}\n\`\`\``;
  }

  combine(header, metadata, content) {
    return `# ${header}\n\n${metadata}\n\n${content}\n\n---\n`;
  }

  getLanguage(content) {
    // Optionally determine language from content, for now default to 'plaintext'
    return 'plaintext';
  }
}

module.exports = MarkdownFormatter;