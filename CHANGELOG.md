# Changelog

## [1.2.0] - 2024-11-15

### Added

- **Worker Module**: Introduced `worker.js` to handle background file processing tasks, enhancing performance and responsiveness.
- **File Processor Enhancements**: Added `fileProcessor` for improved management and processing of file contents across various formats.
- **Content Manager**: Implemented `contentManager` to streamline content handling, ensuring efficient data flow and management.
- **ContentNormalizer Updates**: Enhanced `contentNormalizer` with additional patterns and normalization rules to support a wider range of file types.
- **Advanced Pattern Definitions**:
  - **JavaScript**: Added patterns for state management, API operations, control flow, declarations, constants, debugging, and hooks.
  - **Python**: Introduced patterns for class definitions, function definitions, import statements, decorators, special methods, docstrings, async definitions, `with` statements, exception handling, and lambda functions.
  - **Markdown**: Enhanced patterns for headers, code blocks, links, emphasis, lists, blockquotes, and tables.
  - **JSON**: Added patterns for main keys, nested objects, and arrays to improve JSON content processing.

### Changed

- **Stream Processor Logic**: Updated `streamProcessor.js` to utilize `readline` for efficient line-by-line processing, replacing previously unused stream methods.
- **Integration Tests**: Revised integration tests to incorporate the new `ContentNormalizer` methods and ensure comprehensive testing of the updated processing logic.
- **Error Handling**: Improved error handling in `StreamProcessor` by implementing the missing `cleanup()` method, ensuring proper resource management and preventing runtime errors.

### Fixed

- **ESLint Warnings**: Resolved ESLint warnings related to unused variables (`readline` and `SizeAndLineRestrictedStream`) by ensuring their usage within the codebase.
- **CLI Execution Error**: Fixed the fatal error `components.streamProcessor.cleanup is not a function` by implementing the `cleanup()` method in `StreamProcessor`.
- **Deprecation Warnings**: Addressed deprecation warnings related to the `punycode` module by updating dependencies and utilizing userland alternatives.
- **Streaming Threshold Test**: Corrected the streaming threshold test to ensure `result.length` is less than the specified maximum, preventing boundary condition issues.

## [1.1.1] - 2024-11-14

### Added

- **Advanced Line Filtering**: Implemented line filtering and selection based on important patterns and exclusion patterns to improve content relevance.
- **Structured Section Identification**: Added functionality to identify important lines and structured sections within files for better content processing.
- **Block Comment Handling**: Enhanced handling of block comments within file processors to accurately include or exclude content.

### Changed

- **Improved File Processing Logic**: Refined the logic for processing files to better extract meaningful code and documentation comments.
- **Enhanced Line Selection**: Updated line selection and formatting to apply maximum line limits while retaining essential content.
- **Optimized Content Truncation**: Adjusted the logic to keep portions of the file when applying line limits, ensuring important content is preserved.

### Fixed

- **Excluded Irrelevant Lines**: Resolved issues where irrelevant or excluded lines were included in the output files.
- **Block Comment Inclusion**: Improved handling of block comments to prevent unintended content inclusion in processed outputs.
- **Performance Improvements**: Addressed potential performance issues with large file processing due to improved filtering logic.

## [1.1.0] - 20-11-13

### Added

- Consistent ASCII separator formatting
- Improved anchor ID generation for Markdown links
- Enhanced test coverage for content formatting
- Better error handling in integration tests
- Real-time progress tracking improvements
- More robust file ordering in output
- Content size estimation with `ContentSizeManager`
- Progress tracking with real-time updates
- Streaming support for large file processing
- Enhanced error handling and reporting
- Comprehensive warning system
- File size and count limitations
- Performance optimizations for large projects

### Changed

- Updated separator formatting for better readability
- Improved content size management
- Enhanced test stability and reliability
- Better handling of file paths in anchor IDs
- More flexible test assertions for better maintainability
- Improved memory management for large files
- Enhanced configuration options
- Better progress feedback during processing
- More detailed error reporting
- Removed Husky git hooks dependencies

### Fixed

- Content ordering consistency in output
- ASCII separator alignment issues
- Anchor ID generation for special characters
- Integration test reliability
- File path handling in tests
- Memory issues with large files
- Performance bottlenecks in directory scanning
- Improved error handling and recovery
- Better handling of invalid file types
