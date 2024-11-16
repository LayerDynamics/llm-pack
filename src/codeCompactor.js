const { isRegExp } = require('util');

/**
 * Advanced code compaction and summarization strategies for different file types.
 * Provides intelligent content reduction while maintaining context and structure.
 */
class CodeCompactor {
  /**
   * Creates a new CodeCompactor instance.
   * @param {Object} options Configuration options for compaction
   * @param {number} options.maxLines Maximum number of lines to include
   * @param {number} options.contextLines Number of context lines to preserve around important sections
   * @param {boolean} options.preserveStructure Whether to maintain code structure in compaction
   * @param {number} options.importanceThreshold Threshold for determining important lines (0-1)
   * @param {number} options.minCompactionRatio Minimum ratio of compaction (0-1)
   */
  constructor(options = {}) {
    this.options = {
      maxLines: options.maxLines || 100,
      contextLines: options.contextLines || 3,
      preserveStructure: options.preserveStructure !== false,
      importanceThreshold: options.importanceThreshold || 0.6,
      minCompactionRatio: options.minCompactionRatio || 0.3,
    };

    // Define patterns as RegExp objects for various file types
    this.importantPatterns = {
      javascript: {
        classDefinition: /class\s+\w+/,
        functionDefinition:
          /(?:function\s+\w+|\w+\s*:\s*function|const\s+(?!helper\b)\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|async\s+function\s+\w+|const\s+(?!helper\b)\w+\s*=\s*\([^)]*\)\s*=>|function\s+(?!helper\b)\w+\s*\()/,
        exportStatement: /export\s+(?:default\s+)?(?:class|function(?!\s+helper\b)|const|let|var)/,
        importStatement: /import\s+.*\s+from/,
        constructorDefinition: /constructor\s*\([^)]*\)/,
        methodDefinition: /(?!helper\b)\w+\s*\([^)]*\)\s*{/,
        interfaceDefinition: /interface\s+\w+/,
        typeDefinition: /type\s+\w+/,
        configObject: /(?:config|options|settings)\s*=\s*{/,
        errorHandling: /try\s*{|catch\s*\([^)]*\)|throw\s+new/,
        documentationComment: /\/\*\*[\s\S]*?\*\/|\/\/\s*TODO|\/\/\s*FIXME/,
        componentPattern:
          /on\w+\s*=|\b(?:componentDid\w+|componentWill\w+|render|getInitialState)\b/,
        stateManagement: /this\.setState|this\.state\.|this\.props\./,
        apiOperations: /\b(?:fetch|axios|api)\b|\.then\(|\.catch\(|await\s+/,
        controlFlow: /if\s*\(.*\)\s*{|switch\s*\(.*\)\s*{|while\s*\(.*\)\s*{|for\s*\(/,
        declarations:
          /(?:const|let|var)\s+(?!helper\b)\w+\s*=\s*(?:\{|\[|`|'|"|\/|\d+|function|\([^)]*\)\s*=>\s*{)/,
        constants: /(?:const|let|var)\s+[A-Z_][A-Z0-9_]*\s*=/,
        debugging: /console\.|debugger|performance\.now\(\)/,
        hooks: /use[A-Z]\w+\s*\(/,
      },
      python: {
        classDefinition: /class\s+\w+/,
        functionDefinition: /def\s+(?!helper\b)\w+/,
        importStatement: /(?:from\s+\w+\s+)?import\s+\w+/,
        decoratorPattern: /@\w+/,
        specialMethods: /def\s+__\w+__/,
        docstring: /"""\s*[\s\S]*?\s*"""|'''\s*[\s\S]*?\s*'''/,
        asyncDefinition: /async\s+def/,
        withStatement: /with\s+.+:/,
        exceptionHandling: /try:|except|finally:/,
        lambdaFunction: /lambda\s+.*:/,
      },
      markdown: {
        headers: /^#+\s+.+$/m,
        codeBlocks: /```[\s\S]*?```/,
        links: /\[([^\]]+)\]\(([^)]+)\)/,
        emphasisBlocks: /\*\*\w+\*\*|\*\w+\*|__\w+__|_\w+_/,
        lists: /^[\s-]*[-*+]\s+.+$|^\s*\d+\.\s+.+$/m,
        blockquotes: /^>\s+.+$/m,
        tables: /\|.+\|/,
      },
      json: {
        mainKeys: /"(?:name|version|main|scripts|dependencies|devDependencies)"\s*:/,
        nestedObjects: /{\s*"[^"]+"\s*:\s*{/,
        arrays: /\[\s*(?:{|\[|"|')/,
      },
    };

    // Define exclude patterns to explicitly exclude certain lines
    this.excludePatterns = {
      javascript: [
        /const\s+helper\s*=/,
        /function\s+helper\s*\(/,
        /"private"\s*:/,
        /^\s*\/\//, // Single line comments
        /^\s*\/\*[\s\S]*?\*\//, // Multi-line comments
      ],
      python: [
        /def\s+helper\s*\(\):/,
        /^\s*#/, // Python comments
      ],
      json: [/"private"\s*:/],
    };
  }

  /**
   * Compacts the content while preserving important sections and structure.
   * @param {string} content The content to compact
   * @param {string} fileType The type of file being processed
   * @returns {string} The compacted content
   */
  compact(content, fileType) {
    if (!content.trim()) {
      return content;
    }

    const lines = content.split('\n');
    if (lines.length <= this.options.maxLines) {
      return content;
    }

    const patterns = this.importantPatterns[fileType] || {};
    const excludePatterns = this.excludePatterns[fileType] || [];
    let blockCommentActive = false;

    // First pass: filter out explicitly excluded patterns
    const filteredLines = lines.filter((line) => {
      // Handle block comments
      if (line.includes('/*')) blockCommentActive = true;
      if (blockCommentActive) {
        if (line.includes('*/')) {
          blockCommentActive = false;
        }
        return false; // Skip lines within block comments
      }

      // Keep documentation comments and important code blocks
      if (this.isDocumentationOrImportant(line, fileType)) {
        return true;
      }

      // Filter out excluded patterns
      return !this.shouldExcludeLine(line, excludePatterns);
    });

    // Second pass: identify important lines and structure
    const importantLines = this.findImportantLines(filteredLines, patterns);
    const structuredSections = this.identifyStructuredSections(filteredLines, fileType);

    // Third pass: select and format lines
    const selectedLines = this.selectLines(filteredLines, importantLines, structuredSections);

    // Apply maxLines limit if needed
    let finalLines = selectedLines;
    if (selectedLines.length > this.options.maxLines) {
      const keepStart = Math.floor(this.options.maxLines * 0.4);
      const keepEnd = Math.floor(this.options.maxLines * 0.4);
      finalLines = [
        ...selectedLines.slice(0, keepStart),
        '// ...',
        ...selectedLines.slice(-keepEnd),
      ];
    }

    // Ensure minimum content ratio
    const minLinesToKeep = Math.ceil(this.options.minCompactionRatio * lines.length);
    if (finalLines.length < minLinesToKeep || finalLines.length === 0) {
      finalLines = ['...']; // Use '...' when content is empty or only comments
    }

    // Preserve structure if needed
    if (this.options.preserveStructure) {
      return this.preserveStructure(finalLines, fileType);
    }

    return finalLines.join('\n');
  }

  /**
   * Checks if a line contains documentation or important code.
   * @private
   * @param {string} line The line to check
   * @param {string} fileType The type of file
   * @returns {boolean} Whether the line should be preserved
   */
  isDocumentationOrImportant(line, fileType) {
    const docPatterns = {
      javascript: /\/\*\*|\*\/|@\w+|TODO|FIXME/,
      python: /"""|'''|@\w+/,
      markdown: /^#+\s+|```/,
    };

    const pattern = docPatterns[fileType];
    return pattern ? pattern.test(line) : false;
  }

  /**
   * Checks if a line should be excluded based on patterns.
   * @private
   * @param {string} line The line to check
   * @param {Array<RegExp>} excludePatterns Patterns to check against
   * @returns {boolean} True if line should be excluded
   */
  shouldExcludeLine(line, excludePatterns) {
    if (!line.trim()) return true;
    return excludePatterns.some((pattern) => pattern.test(line));
  }

  /**
   * Calculates the importance score for a line.
   * @param {string} line The line to check
   * @param {Object} patterns Patterns to match
   * @returns {number} Importance score between 0 and 1
   */
  calculateLineImportance(line, patterns) {
    if (!line.trim()) return 0;

    const matchCount = Object.values(patterns).filter(
      (pattern) => isRegExp(pattern) && pattern.test(line)
    ).length;

    return matchCount / Object.keys(patterns).length;
  }

  /**
   * Identifies important lines in the code based on patterns and context.
   * @param {string[]} lines Array of code lines
   * @param {Object} patterns Patterns to match for importance
   * @returns {Set<number>} Set of important line numbers
   */
  findImportantLines(lines, patterns) {
    const importantLines = new Set();
    let blockCommentActive = false;
    let bracketDepth = 0;

    lines.forEach((line, index) => {
      // Handle block comments
      if (line.includes('/*')) blockCommentActive = true;
      if (blockCommentActive) {
        if (line.includes('*/')) {
          blockCommentActive = false;
        }
        return; // Skip lines within block comments
      }

      // Track bracket depth
      bracketDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      // Calculate line importance
      const importance = this.calculateLineImportance(line, patterns);
      if (importance > this.options.importanceThreshold) {
        this.addLineWithContext(importantLines, index, lines.length);
      }

      // Always include lines with bracket depth changes
      if (bracketDepth > 0 || line.includes('}')) {
        importantLines.add(index);
      }
    });

    return importantLines;
  }

  /**
   * Adds a line and its context to the set of important lines.
   * @private
   * @param {Set<number>} lines Set of line numbers
   * @param {number} index Current line index
   * @param {number} maxLines Maximum number of lines
   */
  addLineWithContext(lines, index, maxLines) {
    for (
      let i = Math.max(0, index - this.options.contextLines);
      i <= Math.min(maxLines - 1, index + this.options.contextLines);
      i++
    ) {
      lines.add(i);
    }
  }

  /**
   * Identifies structured sections in the code.
   * @param {string[]} lines Array of code lines
   * @param {string} fileType The type of file being processed
   * @returns {Array<{start: number, end: number, importance: number}>}
   */
  identifyStructuredSections(lines, fileType) {
    const sections = [];
    let currentSection = null;
    let bracketCount = 0;

    const isStructuralStart = (line) => {
      const patterns = {
        javascript: /^(?:export\s+)?(?:class\s+\w+|function\s+\w+)/,
        python: /^(?:class|def)\s+\w+/,
        json: /{/,
        markdown: /^#+\s+/,
      };

      return patterns[fileType]?.test(line.trim()) || false;
    };

    lines.forEach((line, index) => {
      bracketCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      if (isStructuralStart(line)) {
        if (currentSection) {
          currentSection.end = index - 1;
          sections.push(currentSection);
        }
        currentSection = {
          start: index,
          importance: this.calculateSectionImportance(line, fileType),
        };
      }

      if (currentSection && bracketCount === 0) {
        currentSection.end = index;
        sections.push(currentSection);
        currentSection = null;
      }
    });

    if (currentSection) {
      currentSection.end = lines.length - 1;
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Calculates the importance score for a section.
   * @param {string} line The starting line of the section
   * @param {string} fileType The type of file being processed
   * @returns {number} Importance score between 0 and 1
   */
  calculateSectionImportance(line, fileType) {
    const scores = {
      javascript: {
        'export default': 1,
        class: 0.9,
        function: 0.8,
        const: 0.7,
        let: 0.6,
        var: 0.5,
      },
      python: {
        class: 0.9,
        def: 0.8,
        '@': 0.7,
      },
      markdown: {
        '#': 1,
        '##': 0.9,
        '###': 0.8,
      },
    };

    const fileScores = scores[fileType] || {};
    return Object.entries(fileScores).reduce((max, [key, score]) => {
      return line.includes(key) ? Math.max(max, score) : max;
    }, 0);
  }

  /**
   * Selects which lines to include in the compacted output.
   * @param {string[]} lines Original lines of code
   * @param {Set<number>} importantLines Set of important line numbers
   * @param {Array} sections Structured sections information
   * @returns {string[]} Selected lines for the compacted output
   */
  selectLines(lines, importantLines, sections) {
    const selected = [];
    let lastIncluded = -1;

    lines.forEach((line, index) => {
      if (!line.trim()) return;

      const section = sections.find((s) => index >= s.start && index <= s.end);
      const isImportant =
        importantLines.has(index) ||
        (section && section.importance >= this.options.importanceThreshold);

      if (
        isImportant &&
        !this.shouldExcludeLine(line, this.excludePatterns[this.currentFileType] || [])
      ) {
        if (lastIncluded !== -1 && index > lastIncluded + 1) {
          selected.push('// ...');
        }
        selected.push(line);
        lastIncluded = index;
      }
    });

    return selected;
  }

  /**
   * Preserves code structure in the compacted output.
   * @param {string[]} lines The lines to structure
   * @param {string} fileType The type of file being processed
   * @returns {string} Structured content
   */
  preserveStructure(lines, fileType) {
    let indentLevel = 0;
    const result = [];
    const indentChar = '  '; // 2 spaces for indentation

    for (const line of lines) {
      // Add proper indentation
      const indent = indentChar.repeat(Math.max(0, indentLevel));
      const trimmedLine = line.trim();
      if (trimmedLine) {
        result.push(indent + trimmedLine);
      }

      // Update indent level based on fileType
      if (fileType === 'javascript' || fileType === 'json') {
        indentLevel += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      } else if (fileType === 'python') {
        // Python uses indentation levels instead of brackets
        if (line.endsWith(':')) {
          indentLevel++;
        } else if (line.match(/^\s+/) && indentLevel > 0) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
      }
    }

    // Add any necessary closing brackets
    if ((fileType === 'javascript' || fileType === 'json') && indentLevel > 0) {
      while (indentLevel > 0) {
        const indent = indentChar.repeat(Math.max(0, indentLevel - 1));
        result.push(indent + '}');
        indentLevel--;
      }
    }

    return result.join('\n');
  }
}

module.exports = CodeCompactor;
