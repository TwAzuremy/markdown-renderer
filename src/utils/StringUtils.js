import { rules } from "../processor/Rules";

/**
 * Remove trailing "c"s. Equivalent to str.replace(/c*$/, "").
 * /c*$/ is vulnerable to REDOS.
 *
 * @param {String} str
 * @param {String} c
 * @param {Boolean} [invert=false] Remove suffix of non-c chars instead. Default false.
 */
export function rtrim(str, c, invert = false) {
    const l = str.length;
    if (l === 0) {
        return "";
    }

    // Length of suffix matching the invert condition.
    let suffLen = 0;

    // Step left until we fail to match the invert condition.
    while (suffLen < l) {
        const currChar = str.charAt(l - suffLen - 1);
        if (currChar === c && !invert) {
            suffLen++;
        } else if (currChar !== c && invert) {
            suffLen++;
        } else {
            break;
        }
    }

    return str.slice(0, l - suffLen);
}

export const toCamelCase = str =>
    str.trim().replace(/\s+(.)/g, (_, c) => c.toUpperCase());

/**
 * Retrieves the nesting level of a line based on the number of leading ">" characters.
 *
 * This function counts the number of ">" symbols at the beginning of a string (after trimming leading spaces), 
 * and returns that count as the nesting level. The greater the number of ">" characters, the deeper the nesting.
 * 
 * @param {string} line - The line of text to analyze.
 * @returns {number} - The nesting level, represented by the number of ">" characters at the start of the line.
 */
const getLevel = (line) => {
    const trimmed = line.replace(rules.renderer.other.trimStartPattern, "");
    const match = trimmed.match(/>/g);

    return match ? match.length : 0;
};

/**
 * Validates the effectiveness of a line of text.
 * 
 * This function checks whether a line meets the following conditions:
 * - If the line is empty, it returns `false`.
 * - If the line is a blockquote (starts with `>`), it must contain valid content (non-empty) or at least two consecutive spaces.
 * - Regular lines must contain valid non-empty characters.
 *
 * @param {string} line - The line of text to validate.
 * @returns {boolean} - Returns `true` if the line is valid, otherwise returns `false`.
 */
const isValidLine = (line) => {
    // Exclude empty lines immediately
    if (line.length === 0) return false;

    // Check if the line is a blockquote
    const trimmed = line.replace(rules.renderer.other.trimStartPattern, "");
    const isBlockquote = trimmed.startsWith(">");

    if (isBlockquote) {
        // Extract the blockquote prefix and level
        const gtContent = trimmed.match(rules.renderer.blockquote.blockQuotePattern)?.[0] || "";
        const remaining = trimmed.slice(gtContent.length);

        // Blockquote line must contain valid content (non-empty) or two consecutive spaces
        return remaining.includes("  ") || /\S/.test(remaining);
    }

    // Regular lines must contain non-empty characters
    return true;
};

/**
 * Replaces line breaks in the given text with soft line breaks (two spaces + newline),
 * while preserving certain formatting rules like code blocks, lists, and blockquotes.
 *
 * This function splits the input text into blocks, specifically separating code blocks marked by triple backticks.
 * It then processes the text outside of the code blocks to insert soft line breaks while preserving the structure of:
 * - Lists (both unordered and ordered)
 * - Blockquotes (preserving their nested levels)
 * - Avoiding consecutive empty lines
 * - Keeping the integrity of code blocks intact.
 *
 * @param {string} text - The input text to process.
 * @returns {string} - The processed text with soft line breaks inserted.
 *
 * @example
 * const inputText = "This is a paragraph.\n\nNext paragraph.\n```console.log("Code")```\nAnother paragraph.";
 * const result = ReplaceWithSoftLineWraps(inputText);
 * console.log(result);
 */
export function replaceWithSoftLineWraps(text) {
    // Split the text into blocks, including code blocks marked by triple backticks (```).
    const codeBlockSplit = text.split(rules.renderer.code.pattern);

    for (let i = 0; i < codeBlockSplit.length; i++) {
        // Skip code blocks (odd indexes will contain the code blocks)
        if (i % 2 === 1) continue;

        codeBlockSplit[i] = codeBlockSplit[i].replace(/\n/g, (match, offset, str) => {
            // Get the current line"s content
            const lineStart = str.lastIndexOf("\n", offset - 1) + 1;
            const currentLine = str.slice(lineStart, offset);

            // Validate the line with a custom function
            if (!isValidLine(currentLine)) return match;

            // Check if the next line is empty (consecutive line breaks)
            const nextPos = offset + 1;
            // Consecutive empty lines
            if (str[nextPos] === "\n") return match;

            // Extract the next line
            const nextLineEnd = str.indexOf("\n", nextPos);
            const nextLine = str.slice(nextPos, nextLineEnd === -1 ? undefined : nextLineEnd);

            // Skip list items (both unordered and ordered)
            if (rules.renderer.list.pattern.test(nextLine)) return match;

            // Handle blockquotes (lines starting with ">")
            if (str[nextPos] === ">") {
                // Check if the content after the ">" is valid
                const afterGT = nextLine.slice(1);
                if (!(/\S| {2}/.test(afterGT))) return match;

                // Check if the blockquote levels are consistent
                if (getLevel(currentLine) !== getLevel(nextLine)) return match;
            }

            // Return a soft line break (two spaces + newline)
            return "  \n";
        });
    }

    // Join the blocks back together and return the modified text
    return codeBlockSplit.join("");
}

/**
 * Merges consecutive list items of the same type (ordered or unordered) into a single block,
 * while preserving other non-list items as individual entries.
 *
 * The function processes an array of strings representing a mixed list of items, where some items 
 * are part of ordered or unordered lists. It groups consecutive list items of the same type together 
 * (separated by two newlines) and leaves other items (e.g., paragraphs) as they are.
 * 
 * It distinguishes between ordered (`1.`, `2.`, etc.) and unordered (`*`, `+`, `-`) lists based on
 * the starting characters of each line. When encountering a change in list type or non-list items,
 * the current list is flushed, and the new type is started.
 *
 * @param {string[]} arr - The array of strings, where each string represents a line, 
 *                        potentially part of an ordered or unordered list.
 * @returns {string[]} - The processed array with merged list items of the same type and 
 *                       preserved non-list items.
 *
 * @example
 * const input = [
 *   "* Item 1",
 *   "* Item 2",
 *   "* Item 3",
 *   "This is a paragraph.",
 *   "1. First item",
 *   "2. Second item",
 *   "Another paragraph."
 * ];
 * 
 * const result = mergeListItems(input);
 * 
 * console.log(result);
 * // Output: [
 * //   "* Item 1\n\n* Item 2\n\n* Item 3",
 * //   "This is a paragraph.",
 * //   "1. First item\n\n2. Second item",
 * //   "Another paragraph."
 * // ]
 */
export function mergeListItems(arr) {
    const mergedArray = [];
    let currentType = null;
    let buffer = [];

    // Helper function to flush the buffer (i.e., push the accumulated list items to mergedArray).
    const flushBuffer = () => {
        if (buffer.length) {
            mergedArray.push(buffer.join("\n\n"));
            buffer = [];
        }
    };

    for (const item of arr) {
        // Trim leading whitespace to help identify the list type
        const trimmed = item.replace(rules.renderer.other.trimStartPattern, "");
        let type = null;

        // Check if the item is part of an unordered list (starts with * or + or -)
        if (rules.renderer.list.unorderedListItem.test(trimmed)) {
            type = "unordered";
        } else if (rules.renderer.list.orderedListItem.test(trimmed)) {
            // Check if the item is part of an ordered list (starts with a number followed by a period)
            type = "ordered";
        }

        if (type) {
            if (type !== currentType) {
                flushBuffer();

                currentType = type;
            }

            buffer.push(item);
        } else {
            flushBuffer();

            currentType = null;
            mergedArray.push(item);
        }
    }

    // Flush any remaining items in the buffer at the end
    flushBuffer();

    return mergedArray;
}

/**
 * Splits a string from the end using a specified separator.
 * The function searches for the last occurrence of the separator in the string and splits the string into parts
 * from that point. The result is reversed to maintain the order of segments from the end.
 * 
 * @param {string} str - The input string that needs to be split.
 * @param {string} separator - The separator to use for splitting the string.
 * @returns {Array} - An array of string segments, ordered as if splitting from the end.
 */
export function splitFromEnd(str, separator) {
    const result = [];
    let remaining = str;
    const separatorLength = separator.length;

    // If the separator is an empty string, return an array of individual characters.
    if (separator === '') {
        return [...str];
    }

    // Start by searching for the separator from the end of the string
    let lastIndex = remaining.lastIndexOf(separator);
    while (lastIndex !== -1) {
        // Slice the part of the string after the separator and push it into the result
        const segment = remaining.slice(lastIndex + separatorLength);
        result.push(segment);

        // Update the remaining string to be the part before the separator
        remaining = remaining.slice(0, lastIndex);

        // Search for the next occurrence of the separator
        lastIndex = remaining.lastIndexOf(separator);
    }

    // Add the remaining part of the string (the part before the first separator)
    result.push(remaining);

    // Reverse the result to match the order from the end to the start
    return result.reverse();
}

/**
 * Returns a set of HTML block-level tags that are commonly used to structure content 
 * in a webpage. Block-level elements typically occupy the entire width of their 
 * container and can contain other block or inline elements.
 *
 * @returns {Set<string>} A set containing HTML block-level tags.
 */
export function getHTMLBlockTags() {
    return new Set([
        // Document structure
        "section", "article", "aside", "header", "footer", "nav", "main",
        // Headings
        "h1", "h2", "h3", "h4", "h5", "h6",
        // Content grouping
        "div", "p", "hr", "pre", "blockquote", "address",
        // Lists & description
        "ul", "ol", "dl",
        // Table
        "table",
        // Form-related
        "form", "fieldset",
        // Media & images
        "figure",
        // Other
        "details", "dialog"
    ]);
}

/**
 * Returns a set of HTML void tags, which are self-closing elements that do not have
 * a closing tag. These elements are typically used to embed resources or add
 * content to a page without requiring separate start and end tags.
 *
 * @returns {Set<string>} A set containing HTML void tags.
 */
export function getHTMLVoidTags() {
    return new Set([
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"
    ]);
}

/**
 * Escapes special characters in a string and handles backslashes appropriately.
 * This function maps certain special characters (like "<" and ">") to their HTML entity equivalents
 * and ensures that backslashes are handled in a way that respects their escape behavior.
 * 
 * The function handles two main operations:
 * 1. It escapes characters that need to be replaced with their HTML entity equivalents (currently supports "<" and ">").
 * 2. It ensures that backslashes are properly escaped, accounting for whether they are used as escape characters.
 * 
 * @param {string} str - The input string that needs to be escaped.
 * @returns {string} - The escaped string with special characters replaced and backslashes handled appropriately.
 * 
 * @example
 * escapeString("Hello <world>") // will return "Hello &lt;world&gt;".
 * escapeString("foo\\bar") // will return "foo\\bar", while escapeString("foo\\\\bar") will return "foo\\\\bar".
 */
export function escapeString(str) {
    // Map of characters to be escaped; extendable for additional characters.
    const escapeMap = {
        "<": "&lt;",
        ">": "&#62;"
    };
    let result = "";
    let backslashCount = 0;

    /**
     * Helper function to process consecutive backslashes in the string.
     * It ensures even backslashes are preserved, and odd backslashes are handled as escape characters.
     * 
     * @param {number} count - The number of consecutive backslashes encountered.
     * @returns {string} - A string of backslashes that respects the escape rules.
     */
    const processBackslashes = (count) => {
        // Calculate the even part (e.g., 5 → 4, 3 → 2).
        const even = count - (count % 2);

        // Keep even number of backslashes and add an additional escape backslash if odd.
        return "\\".repeat(even) +
            // If odd, add one more escape backslash.
            (count % 2 ? "\\" : "");
    };

    for (let i = 0; i < str.length; i++) {
        const c = str[i];

        // If the character is a backslash, count it but do not process yet.
        if (c === "\\") {
            backslashCount++;
            continue;
        }

        // Process any accumulated backslashes before the current character.
        result += processBackslashes(backslashCount);

        // If the number of backslashes is even, escape the current character.
        // If the number is odd, retain the character as is.
        result += backslashCount % 2 === 0 ? (escapeMap[c] || c) : c;
        backslashCount = 0;
    }

    // Process any remaining backslashes at the end of the string. (e.g "foo\\\\\")
    result += processBackslashes(backslashCount);
    return result;
}