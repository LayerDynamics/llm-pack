// src/outputStyles.js

/**
 * Creates an ASCII art separator with a centered label.
 * @param {string} label - The text to be displayed in the center of the separator.
 * @returns {string} A multi-line string containing the ASCII art separator with the centered label.
 * @example
 * createAsciiSeparator("Hello")
 * // Returns:
 * // ****************************************
 * // *********       Hello       ***********
 * // ****************************************
 */
function createAsciiSeparator(label) {
  const separatorLength = 40;
  // Create the middle line with consistent spacing (9 asterisks + 7 spaces on each side)
  const middleLine = `*********       ${label}       *********`;
  const topBottom = '*'.repeat(separatorLength);
  return `${topBottom}\n${middleLine}\n${topBottom}\n`;
}

module.exports = { createAsciiSeparator };
