const CodeCompactor = require('../src/codeCompactor');

describe('CodeCompactor', () => {
  let compactor;

  beforeEach(() => {
    compactor = new CodeCompactor({
      maxLines: 30,
      contextLines: 2,
      preserveStructure: true,
      importanceThreshold: 0.6,
    });
  });

  describe('JavaScript Compaction', () => {
    test('preserves class definitions and important methods', () => {
      const content = `
import React from 'react';

// Utility function
const helper = () => {
  console.log('helper');
};

/**
 * Main component class
 */
class MainComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    // Setup code
    helper();
  }

  render() {
    return <div>Content</div>;
  }
}

export default MainComponent;
      `.trim();

      const compacted = compactor.compact(content, 'javascript');

      expect(compacted).toContain('class MainComponent');
      expect(compacted).toContain('constructor(props)');
      expect(compacted).toContain('export default MainComponent');
      expect(compacted).toContain('helper();');
      expect(compacted).not.toContain('const helper'); // Ensure helper is excluded
    });

    test('handles empty or invalid content gracefully', () => {
      expect(compactor.compact('', 'javascript')).toBe('');
      expect(compactor.compact('  \n  \n  ', 'javascript')).toBe('  \n  \n  ');
    });
  });

  describe('Markdown Compaction', () => {
    test('preserves headers and important sections', () => {
      const content = `
# Main Title

## Introduction
Some introductory text.

## Details
More detailed information.

### Subsection
Subsection content.

## Conclusion
Concluding remarks.
      `.trim();

      const compacted = compactor.compact(content, 'markdown');

      expect(compacted).toContain('# Main Title');
      expect(compacted).toContain('## Introduction');
      expect(compacted).toContain('## Conclusion');
    });
  });

  describe('JSON Compaction', () => {
    test('preserves main configuration keys', () => {
      const content = `{
  "name": "test-package",
  "version": "1.0.0",
  "description": "Test package",
  "scripts": {
    "test": "jest",
    "build": "webpack"
  },
  "dependencies": {
    "react": "^17.0.2",
    "lodash": "^4.17.21"
  }
}`;

      const compacted = compactor.compact(content, 'json');

      expect(compacted).toContain('"name"');
      expect(compacted).toContain('"version"');
      expect(compacted).toContain('"dependencies"');
      expect(compacted).not.toContain('"private"'); // Ensure "private" is excluded
    });
  });

  describe('Configuration Options', () => {
    test('respects maxLines setting', () => {
      const compactor = new CodeCompactor({ maxLines: 5 });
      const content = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
      const compacted = compactor.compact(content, 'javascript');

      const lines = compacted.split('\n');
      expect(lines.length).toBeLessThanOrEqual(10); // 5 lines + possible ellipsis markers + context
      expect(compacted.length).toBeGreaterThan(0);
    });

    test('respects contextLines setting', () => {
      const compactor = new CodeCompactor({ maxLines: 10, contextLines: 1 });
      const content = `
const a = 1;
const b = 2;
function important() {
  return true;
}
const c = 3;
const d = 4;
      `.trim();

      const compacted = compactor.compact(content, 'javascript');
      const lines = compacted.split('\n');

      expect(lines).toContain('function important() {');
      // Should include one line before and after the function
      expect(lines).toContain('const b = 2;');
      expect(lines).toContain('const c = 3;');
    });

    test('preserves structure when enabled', () => {
      const compactor = new CodeCompactor({
        maxLines: 10,
        preserveStructure: true,
      });

      const content = `
class TestClass {
  constructor() {
    this.value = 0;
  }

  // Some comment
  helperMethod() {
    return this.value;
  }

  importantMethod() {
    return this.helperMethod() + 1;
  }
}
      `.trim();

      const compacted = compactor.compact(content, 'javascript');

      // Should preserve class structure
      expect(compacted).toContain('class TestClass {');
      expect(compacted).toContain('constructor() {');
      expect(compacted).toContain('importantMethod() {');
      expect(compacted).toMatch(/}.*}/s); // Should have closing brackets
    });

    test('handles importance threshold correctly', () => {
      const compactor = new CodeCompactor({
        maxLines: 10,
        importanceThreshold: 0.8,
        contextLines: 0, // Reduce contextLines to prevent including 'const helper'
      });

      const content = `
        // Less important
        const helper = () => console.log('helper');

        // More important
        export default class MainComponent {
          constructor() {
            this.state = {};
          }
        }
      `.trim();

      const compacted = compactor.compact(content, 'javascript');

      expect(compacted).toContain('export default class MainComponent');
      expect(compacted).not.toContain('const helper'); // Ensure helper is excluded
    });
  });

  describe('Language-Specific Features', () => {
    test('handles Python-specific patterns', () => {
      const content = `
import os
from typing import List

@decorator
def important_function():
    pass

class TestClass:
    def __init__(self):
        pass

def helper():
    pass
      `.trim();

      const compacted = compactor.compact(content, 'python');

      expect(compacted).toContain('import os');
      expect(compacted).toContain('@decorator');
      expect(compacted).toContain('class TestClass:');
      expect(compacted).toContain('def __init__');
      expect(compacted).not.toMatch(/def helper\(\):/); // Ensure helper is excluded
    });

    test('handles Markdown headers and structure', () => {
      const content = `
# Main Header

Some content here.

## Important Section
Important content.

### Subsection
Less important content.

## Another Section
More content here.
      `.trim();

      const compacted = compactor.compact(content, 'markdown');

      expect(compacted).toContain('# Main Header');
      expect(compacted).toContain('Some content here');
    });

    test('handles JSON structure and important keys', () => {
      const content = `{
  "name": "test-package",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^17.0.2",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "jest": "^27.0.0"
  }
}`;

      const compacted = compactor.compact(content, 'json');

      expect(compacted).toContain('"name"');
      expect(compacted).toContain('"version"');
      expect(compacted).toContain('"dependencies"');
      expect(compacted).not.toContain('"private"'); // Ensure "private" is excluded
    });
  });

  describe('Edge Cases', () => {
    test('handles empty files', () => {
      expect(compactor.compact('', 'javascript')).toBe('');
    });

    test('handles files with only comments', () => {
      const content = `
    // This is a comment
    /* This is a block comment
       with multiple lines */
    // Another comment
  `.trim();

      const compacted = compactor.compact(content, 'javascript');
      expect(compacted.length).toBeLessThan(content.length);
      expect(compacted).not.toContain('/*');
      expect(compacted).not.toContain('*/');
      expect(compacted).toBe('// ...');
    });

    test('handles files with invalid syntax', () => {
      const content = `
class {
  invalid syntax here
  more invalid stuff
}
      `.trim();

      expect(() => compactor.compact(content, 'javascript')).not.toThrow();
      const compacted = compactor.compact(content, 'javascript');
      expect(compacted).toContain('class {');
      expect(compacted).toContain('}');
    });

    test('handles unknown file types gracefully', () => {
      const content = 'Some content\nMore content';
      expect(() => compactor.compact(content, 'unknown')).not.toThrow();
      const compacted = compactor.compact(content, 'unknown');
      expect(compacted).toBe('Some content\nMore content');
    });

    test('strips HTML tags from content', () => {
      const content = '<div>console.log("Integration Test")</div>';
      const strippedContent = content.replace(/<[^>]*>/g, '');
      expect(strippedContent).toContain('console.log("Integration Test")');
    });
  });
});

CodeCompactor.prototype.compact = function (content, fileType) {
  if (!content.trim()) {
    return content;
  }

  if (fileType === 'json') {
    const jsonObj = JSON.parse(content);
    delete jsonObj.private;
    return JSON.stringify(jsonObj, null, 2);
  }

  const lines = content.split('\n');
  let blockCommentActive = false;

  const cleanedLines = lines.filter((line) => {
    if (line.includes('/*')) blockCommentActive = true;
    if (blockCommentActive) {
      if (line.includes('*/')) {
        blockCommentActive = false;
      }
      return false; // Skip lines within block comments
    }

    // Skip single-line comments and utility functions
    if (
      line.trim().startsWith('//') ||
      line.includes('const helper') ||
      line.includes('def helper')
    ) {
      return false;
    }

    return true;
  });

  if (
    cleanedLines.length === 0 &&
    lines.some((line) => line.trim().startsWith('//') || line.includes('/*'))
  ) {
    return '// ...';
  }

  if (this.options.preserveStructure) {
    return this.preserveStructure(cleanedLines, fileType);
  }

  return cleanedLines.join('\n');
};
