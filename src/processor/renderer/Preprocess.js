import { mergeListItems, replaceWithSoftLineWraps, splitFromEnd } from "../../utils/StringUtils";

/**
 * The MarkdownPreprocessor class is designed to process and transform markdown-like text.
 * This class provides a series of chained methods that allow for a sequence of text transformation steps.
 * Each method modifies the text in place, enabling the user to customize the processing flow.
 * 
 * Key functionalities of this class include:
 * - Replacing line breaks with appropriate soft line breaks.
 * - Splitting the text from the end based on a provided regular expression.
 * - Merging consecutive list items of the same type (ordered or unordered lists).
 * - Applying all transformations and returning the final processed text.
 * 
 * @example
 * const processedText = new MarkdownPreprocessor(src)
 *  .replaceWithSoftLineWraps()
 *  .splitFromEnd(/\n\n/g)
 *  .mergeListItems()
 *  .submit();
 * 
 * @class MarkdownPreprocessor
 */
export class MarkdownPreprocessor {
    /**
     * Creates an instance of the MarkdownPreprocessor class.
     *
     * This class provides a pipeline for processing markdown-like text by chaining 
     * multiple transformation steps, such as replacing line breaks, splitting text, 
     * and merging list items. The methods modify the content based on a series of 
     * transformation rules while maintaining the integrity of markdown structures.
     *
     * @param {string} src - The source markdown text to process.
     */
    constructor(src) {
        this.value = src;
        this.pipeline = [];
    }

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
     * @returns {string} - The processed text with soft line breaks inserted.
     */
    replaceWithSoftLineWraps() {
        this.pipeline.push(value => replaceWithSoftLineWraps(value));

        return this;
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
     * @param {RegExp} separator - The regular expression used to identify split positions (e.g., double newlines).
     * @returns {string[]} - The array of string parts resulting from the split, in reverse order.
     */
    splitFromEnd(separator) {
        this.pipeline.push(value => splitFromEnd(value, separator));

        return this;
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
     * @returns {string[]} - The processed array with merged list items of the same type and 
     *                       preserved non-list items.
     */
    mergeListItems() {
        this.pipeline.push(value => mergeListItems(value));

        return this;
    }

    /**
     * Executes the pipeline of transformations on the input text and returns the final processed result.
     *
     * This method processes the input text by applying all functions in the `pipeline` array in sequence. 
     * It reduces the pipeline by applying each function to the current state of the text.
     * 
     * @returns {string} - The final processed text after all transformations in the pipeline have been applied.
     */
    submit() {
        return this.pipeline.reduce((acc, fn) => fn?.(acc), this.value)
    }
}