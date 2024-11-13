// src/outputStyles.js

/**
 * Creates an ASCII art separator with a centered label.
 * @param {string} label - The text to be displayed in the center of the separator.
 * @returns {string} A multi-line string containing the ASCII art separator with the centered label.
 * @example
 * createAsciiSeparator("Hello")
 * // Returns:
 * // ****************************************
 * // ************   Hello   ****************
 * // ****************************************
 */
function createAsciiSeparator(label) {
	const separatorLength = 40;
	const labelFormatted = `*       ${label}       *`;
	const padding = Math.max(separatorLength - labelFormatted.length, 0);
	const padStart = Math.floor(padding / 2);
	const padEnd = padding - padStart;
	const topBottom = '*'.repeat(separatorLength);
	const middle = '*'.repeat(padStart) + labelFormatted + '*'.repeat(padEnd);
	return `${topBottom}\n${middle}\n${topBottom}\n`;
}

module.exports = { createAsciiSeparator };
