# LLM-Pack

[![npm version](https://img.shields.io/npm/v/llm-pack.svg)](https://www.npmjs.com/package/llm-pack)
[![License: Unlicense](https://img.shields.io/badge/License-Unlicense-blue.svg)](https://opensource.org/licenses/Unlicense)

LLM-Pack is a command-line tool designed to aggregate and optimize project content for use with Large Language Models (LLMs). It recursively scans your project directory, respects standard ignore patterns, and generates a single structured file that's optimized for LLM processing.

## Features

- 📁 Recursive directory scanning with smart file filtering
- 🚫 Respects `.gitignore`, `.dockerignore`, and other standard ignore files
- 📝 Markdown and JSON output formats
- 🎨 Syntax highlighting for code blocks in Markdown output
- 📑 Automatic table of contents generation
- 🔧 Configurable file size limits and file count constraints
- 🎯 Custom ignore patterns support
- 🚀 Built-in common directory exclusions (`node_modules`, `dist`, etc.)
- ⚡ Streaming support for large file processing
- 📊 Progress tracking with real-time updates

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
2. Generate a Markdown file (`llm-pack-output.md`) with all relevant content
3. Include a table of contents and syntax-highlighted code blocks

### Command Line Options

```bash
llm-pack [options]

Options:
  -f, --format         Output format (markdown or json)     [default: "markdown"]
  -o, --output        Output file path                     [default: "llm-pack-output.md" or "llm-pack-output.json"]
  -i, --ignore        Custom ignore files                  [array]
  -e, --extensions    Additional file extensions to include [array]
  -m, --max-files     Maximum number of files to include   [number]
  -s, --max-file-size Maximum file size in kilobytes      [number]
  -h, --help         Show help                            [boolean]
```

### Examples

#### Generate JSON Output

```bash
llm-pack --format json
```

#### Custom Output Location

```bash
llm-pack --output ./docs/project-content.md
```

#### Add Custom Ignore Files

```bash
llm-pack --ignore .customignore .otherignore
```

#### Include Additional File Extensions

```bash
llm-pack --extensions .tsx .jsx .vue
```

#### Limit Output Size

```bash
llm-pack --max-files 50 --max-file-size 100
```

### Output Format

#### Markdown (Default)

The Markdown output follows this structure:

````markdown
# Table of Contents

- [src/index.js](#src-index-js)
- [README.md](#readme-md)
  ...

# Project Content

---

\***\*\*\*\*** src/index.js \***\*\*\*\***

---

```js
// Content of index.js
```
````

---

\***\*\*\*\*** README.md \***\*\*\*\***

---

```md
# Content of README.md
```

#### JSON Output

When using `--format json`, the output follows this structure:

```json
{
  {
    "filePath": "src/index.js",
    "content": "// Content of index.js",
    "compacted": false
  },
  {
    "filePath": "README.md",
    "content": "# Content of README.md",
    "compacted": false
  }
}
```

## Default Behavior

By default, LLM-Pack:

1. Excludes common directories:

   - `node_modules`
   - `dist`
   - `coverage`
   - `.git`
   - `build`
   - `temp`
   - `cache`

2. Supports common file extensions:

   - `.js`, `.jsx`
   - `.ts`, `.tsx`
   - `.json`
   - `.md`
   - `.html`, `.css`
   - `.py`
   - `.java`
   - `.c`, `.cpp`
   - `.rb`
   - `.go`
   - `.php`
   - `.sh`

3. Respects ignore patterns from:
   - `.gitignore`
   - `.npmignore`
   - `.dockerignore`
   - `.eslintignore`
   - `.prettierignore`
   - `.hgignore`
   - `.svnignore`

## Content Size Management

When using `--max-file-size`:

- Files larger than the specified size will be truncated
- A note will be added to indicate truncation
- The first 100 lines of the file will be included

When using `--max-files`:

- Only the specified number of files will be included
- A warning will be displayed if files are skipped

## Performance Features

- Streaming support for large file processing
- Real-time progress tracking
- Memory-efficient file handling
- Asynchronous file processing
- Smart content buffering

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the Unlicense License - see the [LICENSE](LICENSE) file for details.

## Author

LayerDynamics(Ryan O'Boyle)
Email: [layerdynamics@proton.me](mailto:layerdynamics@proton.me)
GitHub: [https://github.com/LayerDynamics/llm-pack.git](https://github.com/LayerDynamics/llm-pack.git)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and releases.
