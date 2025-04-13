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
 * Splits a string into parts from the end based on a specified regular expression,
 * while avoiding splitting within code blocks or inline code. The function ensures 
 * that splits occur only at valid positions (such as double newlines) and respects 
 * the boundaries of code blocks or inline code.
 *
 * This function is useful for handling markdown-like strings, where you want to 
 * split content based on some delimiter (e.g., double newlines) but avoid splitting 
 * inside code sections (both block code and inline code).
 * 
 * The function processes the string in three main steps:
 * 1. Identifies all code blocks and inline code to ensure that splits do not occur inside them.
 * 2. Finds all valid split positions (e.g., double newlines) that are not inside code blocks.
 * 3. Splits the string from the end, ensuring that the total number of parts does not exceed the specified limit.
 *
 * @param {string} str - The input string to split.
 * @param {RegExp} regex - The regular expression used to identify split positions (e.g., double newlines).
 * @param {number} [limit=Infinity] - The maximum number of parts to split the string into. Defaults to no limit.
 * @returns {string[]} - The array of string parts resulting from the split, in reverse order.
 *
 * @example
 * const input = "First part\n\nSecond part\n\n`Inline code`\n\nThird part";
 * const result = splitFromEnd(input, /\n\n/g);
 * 
 * console.log(result);
 * // Output: [
 * //   "Second part",
 * //   "First part"
 * // ]
 */
export function splitFromEnd(str, regex, limit = Infinity) {
    // Step 1: Identify the boundaries of all code blocks and inline code
    const codeBoundaries = [];
    let match;

    while ((match = rules.renderer.other.codeBlocksAndInlineCode.exec(str)) !== null) {
        codeBoundaries.push({ start: match.index, end: match.index + match[0].length });
    }

    // Step 2: Find all valid double line break locations (not within the code block)
    const splitPositions = [];
    while ((match = regex.exec(str)) !== null) {
        const pos = match.index;
        const isInCode = codeBoundaries.some(b => pos >= b.start && pos < b.end);

        if (!isInCode) splitPositions.push(pos);
    }

    // Step 3: Split the string from back to front
    const parts = [];
    let remaining = str;
    let count = 1;

    // Reverse Split Positions (Back to Front)
    splitPositions.sort((a, b) => b - a).forEach(pos => {
        if (count >= limit) return;
        if (pos >= remaining.length) return;

        // "+ 2" means skipping two line breaks
        parts.push(remaining.slice(pos + 2));
        remaining = remaining.slice(0, pos);
        count++;
    });

    parts.push(remaining);

    return parts.reverse();
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

export function escapeString(str) {
    const escapeMap = {
        "<": "&lt;",
        ">": "&#62;"
        // 添加其他需要转义的字符
    };
    let result = '';
    let backslashCount = 0;

    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === '\\') {
            backslashCount++;
            continue;
        }

        // 处理前面的反斜杠
        let backslashPrefix = '';
        if (backslashCount > 0) {
            const evenCount = Math.floor(backslashCount / 2) * 2;
            backslashPrefix = '\\'.repeat(evenCount);
            if (backslashCount % 2 !== 0) {
                backslashPrefix += '\\';
            }
        }
        result += backslashPrefix;

        // 处理当前字符
        if (backslashCount % 2 === 0) {
            result += escapeMap[c] || c;
        } else {
            result += c;
        }
        backslashCount = 0;
    }

    // 处理末尾剩余的反斜杠
    if (backslashCount > 0) {
        const evenCount = Math.floor(backslashCount / 2) * 2;
        result += '\\'.repeat(evenCount);
        if (backslashCount % 2 !== 0) {
            result += '\\';
        }
    }

    return result;
}