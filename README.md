```ascii
██╗     ██╗     ███╗   ███╗            ██████╗  █████╗  ██████╗██╗  ██╗
██║     ██║     ████╗ ████║            ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
██║     ██║     ██╔████╔██║            ██████╔╝███████║██║     █████╔╝
██║     ██║     ██║╚██╔╝██║            ██╔═══╝ ██╔══██║██║     ██╔═██╗
███████╗███████╗██║ ╚═╝ ██║            ██║     ██║  ██║╚██████╗██║  ██╗
╚══════╝╚══════╝╚═╝     ╚═╝            ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
          Project Content Aggregator for Large Language Models
```

[![npm version](https://img.shields.io/npm/v/llm-pack.svg)](https://www.npmjs.com/package/llm-pack)
[![License: Unlicense](https://img.shields.io/badge/License-Unlicense-blue.svg)](https://opensource.org/licenses/Unlicense)

LLM-Pack is a command-line tool designed to aggregate and optimize project content for use with Large Language Models (LLMs). It recursively scans your project directory, respects standard ignore patterns, and generates a single structured file that's optimized for LLM processing.

## Features

- 📁 Recursive directory scanning with intelligent filtering
- 🚫 Respects `.gitignore`, `.dockerignore`, and other standard ignore files
- 📝 Markdown and JSON output formats with syntax highlighting
- 🎨 Smart content compaction for large files
- 📑 Automatic table of contents generation
- 🔧 Configurable file size limits and file count constraints
- 🎯 Custom ignore patterns support
- 🚀 Built-in common directory exclusions (`node_modules`, `dist`, etc.)
- ⚡ Streaming support for large file processing
- 📊 Progress tracking with real-time updates
- 🔄 Parallel processing with worker threads
- 💾 Memory-optimized processing for large projects
- 🧠 Intelligent code compaction preserving important sections
- 🔍 Advanced pattern detection for various file types
- 🌈 Rich syntax highlighting with multiple themes

## Installation

```bash
# Global installation
npm install -g llm-pack

# Or using npx directly
npx llm-pack [options]
```

## Usage

### Basic Usage

Run in your project directory:

```bash
llm-pack
```

This will:
1. Scan your project directory
2. Process files according to configured limits and patterns
3. Generate a formatted output file with all relevant content
4. Include a table of contents and syntax-highlighted code blocks

### Command Line Options

```bash
llm-pack [options]

Basic Options:
  -f, --format         Output format (markdown or json)     [default: "markdown"]
  -o, --output        Output file path                     [default: "llm-pack-output.md" or "llm-pack-output.json"]
  -i, --ignore        Custom ignore files                  [array]
  -e, --extensions    Additional file extensions to include [array]
  -c, --config        Path to configuration file           [string]
  -h, --help         Show help                            [boolean]
  -v, --version      Show version number                  [boolean]

Content Processing:
  --max-files         Maximum number of files to include   [number]
  --max-file-size     Maximum file size in kilobytes      [number]
  --use-compactor     Enable code compaction              [boolean] [default: false]
  --compact-lines     Maximum lines before compaction      [number] [default: 100]
  --context-lines     Context lines to preserve           [number] [default: 3]
  --importance        Importance threshold (0-1)          [number] [default: 0.6]

Performance Options:
  --enable-workers              Enable parallel processing     [boolean] [default: false]
  --max-workers                Maximum worker threads          [number] [default: 4]
  --enable-memory-monitoring   Monitor memory usage            [boolean] [default: false]
  --chunk-size                Streaming chunk size (bytes)     [number] [default: 65536]
  --progress                  Show detailed progress           [boolean] [default: false]
```
## Configuration

Create `llm-pack.config.json` in your project root:

```json
{
  "output": {
    "format": "markdown",
    "path": "./llm-pack-output",
    "createDirectory": true
  },
  "limits": {
    "maxFileSize": 1024,
    "maxFiles": null,
    "maxTotalSize": null
  },
  "processing": {
    "batchSize": 100,
    "streamingThreshold": 512,
    "compactLargeFiles": true,
    "enableWorkers": true,
    "maxWorkers": 4
  },
  "extensions": {
    "include": [".js", ".jsx", ".ts", ".tsx", ".md", ".json"],
    "exclude": [".min.js", ".map"]
  },
  "ignore": {
    "customPatterns": [],
    "extendGitignore": true,
    "defaultIgnores": true
  },
  "normalization": {
    "normalizeLineEndings": true,
    "normalizeWhitespace": true,
    "removeHtmlTags": false,
    "preserveCodeBlocks": true
  }
}
```

## Default Behavior

LLM-Pack comes with sensible defaults:

### Excluded Directories
- `node_modules`
- `dist`
- `coverage`
- `.git`
- `build`
- `temp`
- `cache`

### Supported File Extensions
- JavaScript: `.js`, `.jsx`
- TypeScript: `.ts`, `.tsx`
- Documentation: `.md`
- Data: `.json`, `.yaml`, `.yml`
- Web: `.html`, `.css`
- Other: `.py`, `.java`, `.c`, `.cpp`, `.rb`, `.go`, `.php`, `.sh`

### Ignore Files Support
- `.gitignore`
- `.npmignore`
- `.dockerignore`
- `.eslintignore`
- `.prettierignore`
- `.hgignore`
- `.svnignore`

## Advanced Features

### Intelligent Code Compaction
When using `--use-compactor`, LLM-Pack intelligently preserves:
- Class and function definitions
- Important method implementations
- Configuration objects
- API operations
- Error handling
- State management
- Documentation comments

### Memory Management
- Streaming support for large files
- Automatic chunk size optimization
- Memory usage monitoring
- Garbage collection optimization
- Configurable memory limits

### Worker Thread Processing
- Parallel file processing
- Automatic work distribution
- Configurable worker pool
- Memory-aware task scheduling

### Content Normalization
- Line ending standardization
- Whitespace optimization
- HTML tag handling
- Code block preservation
- Consistent formatting

## Performance Features

- Streaming support for large file processing
- Real-time progress tracking
- Memory-efficient file handling
- Asynchronous file processing
- Smart content buffering
- Parallel processing capabilities
- Optimized memory management


## LLM Use Cases

### 1. Code Understanding & Analysis
Generate a concise overview for LLMs to understand your codebase:
```bash
llm-pack \
  --use-compactor \
  --compact-lines 100 \
  --importance 0.8 \
  --normalize-whitespace \
  --output ./llm/codebase-overview.md
```
*Best for: Asking LLMs to analyze architecture, explain code patterns, or suggest improvements*

### 2. Technical Documentation Generation
Create comprehensive documentation from your codebase:
```bash
llm-pack \
  --format markdown \
  --extensions .js,.ts,.md \
  --preserve-code-blocks \
  --output ./llm/documentation-input.md
```
*Best for: Having LLMs generate documentation, API guides, or technical specifications*

### 3. Code Migration Planning
Prepare codebase analysis for migration projects:
```bash
llm-pack \
  --use-compactor \
  --importance 0.9 \
  --preserve-structure \
  --normalize-line-endings \
  --output ./llm/migration-analysis.md
```
*Best for: Asking LLMs to plan migrations, suggest refactoring strategies, or identify dependencies*

### 4. Bug Analysis
Collect relevant code context for bug investigation:
```bash
llm-pack \
  --format markdown \
  --context-lines 5 \
  --importance 0.8 \
  --output ./llm/bug-context.md
```
*Best for: Having LLMs analyze bugs, suggest fixes, or explain error patterns*

### 5. Code Review Assistance
Generate focused content for code review:
```bash
llm-pack \
  --use-compactor \
  --compact-lines 50 \
  --importance 0.9 \
  --extensions .js,.ts,.jsx,.tsx \
  --output ./llm/code-review.md
```
*Best for: Getting LLMs to review code, suggest improvements, or identify potential issues*

### Best Practices for LLM Interaction

1. **Content Optimization**
   - Use `--use-compactor` to focus on important code sections
   - Set `--importance` threshold to 0.8+ for critical code understanding
   - Include `--context-lines` to maintain code comprehension

2. **Format Selection**
   - Use `markdown` format for better code structure preservation
   - Enable `--preserve-code-blocks` for accurate syntax interpretation
   - Use `--normalize-whitespace` for consistent formatting

3. **Context Management**
   - Keep file sizes manageable (use `--max-file-size`)
   - Include necessary context with `--context-lines`
   - Use `--compact-lines` to focus on essential code

### Input Size Optimization

1. **For GPT-3.5 (4K context)**
   ```bash
   llm-pack \
     --use-compactor \
     --compact-lines 50 \
     --max-file-size 100 \
     --importance 0.9
   ```

2. **For GPT-4 (8K context)**
   ```bash
   llm-pack \
     --use-compactor \
     --compact-lines 100 \
     --max-file-size 200 \
     --importance 0.8
   ```

3. **For Claude (100K context)**
   ```bash
   llm-pack \
     --use-compactor \
     --compact-lines 500 \
     --max-file-size 1000 \
     --importance 0.7
   ```

### LLM Prompt Examples

1. **Code Understanding**
```
I'm providing a codebase overview generated by llm-pack. Please:
1. Analyze the overall architecture
2. Identify key design patterns
3. Suggest potential improvements
<paste llm-pack output>
```

2. **Documentation Generation**
```
I've used llm-pack to collect my project's code. Please:
1. Generate comprehensive documentation
2. Include API endpoints and usage
3. Document key functions and components
<paste llm-pack output>
```

3. **Migration Planning**
```
Here's my codebase exported by llm-pack. Please:
1. Analyze the current structure
2. Suggest a migration strategy
3. Identify potential challenges
<paste llm-pack output>
```

4. **Bug Analysis**
```
I've collected relevant code context using llm-pack. Please:
1. Analyze the code for potential issues
2. Suggest possible bug fixes
3. Recommend prevention strategies
<paste llm-pack output>
```

### Common LLM Tasks

1. **Architecture Review**
   ```bash
   llm-pack \
     --use-compactor \
     --importance 0.9 \
     --preserve-structure \
     --output ./llm/architecture.md
   ```
   *For getting LLM insights on system design and architecture*

2. **Security Analysis**
   ```bash
   llm-pack \
     --use-compactor \
     --importance 0.95 \
     --context-lines 10 \
     --output ./llm/security-review.md
   ```
   *For having LLMs identify potential security issues*

3. **API Documentation**
   ```bash
   llm-pack \
     --extensions .js,.ts \
     --preserve-code-blocks \
     --normalize-whitespace \
     --output ./llm/api-docs.md
   ```
   *For generating API documentation with LLM assistance*



## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the Unlicense License - see the [LICENSE](LICENSE) file for details.

## Author

LayerDynamics (Ryan O'Boyle)
Email: [layerdynamics@proton.me](mailto:layerdynamics@proton.me)
GitHub: [https://github.com/LayerDynamics/llm-pack.git](https://github.com/LayerDynamics/llm-pack.git)

## Documentation

For more detailed documentation, visit: [https://layerdynamics.github.io/llm-pack/index.html](https://layerdynamics.github.io/llm-pack/index.html)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and releases.
