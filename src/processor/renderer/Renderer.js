import { marked } from "marked";

import { templates } from "./Templates";
import { tokenizer } from "./Tokenizer";
import { MarkdownPreprocessor } from "./Preprocess";

const renderer = {
    paragraph({ type, tokens }) {
        return templates.paragraph(type, this.parser.parseInline(tokens));
    },
    text({ text, tokens }) {
        return tokens ? this.parser.parseInline(tokens) : templates.text(text);
    },
    code(tokens) {
        console.log("Code", tokens);
    },
    codespan(tokens) {
        console.log("Code Span", tokens);
    }
};

marked.use({
    async: true,
    pedantic: true,
    breaks: true,
    gfm: true,
    renderer,
    tokenizer
});

/**
 * Asynchronously processes a list of items by parsing each item using the `marked.parse` function,
 * with special handling for empty strings and strings ending with a newline character.
 * 
 * - If an item is an empty string, it is appended with "[EMPTY]".
 * - If an item ends with a newline character (`\n`), "[EMPTY]" is appended to it.
 * 
 * After handling these special cases, the function parses each item asynchronously and returns a list of parsed results.
 * 
 * @param {string[]} list - The original list of strings to be processed.
 * @returns {Promise<string[]>} - A Promise that resolves to an array of parsed results after processing each item.
 */
async function processList(list) {
    // Use map to iterate over the list and create an array of Promises
    const promises = list.map(item => {
        let processed = item;

        if (processed.trim() === "") {
            processed += "[EMPTY]";
        }

        if (processed.endsWith("\n")) {
            processed += "[EMPTY]";
        }

        return marked.parse(processed);
    });

    // Wait for all promises to resolve
    return await Promise.all(promises);
}

export class Markdown {
    /**
     * @param {string} src 
     * @returns {Promise<string[]>}
     */
    static async parse(src) {
        /**
         * Preprocessing steps: 
         *    Replace with soft line breaks -> Split into paragraphs -> Fix broken Markdown lists.
         * 
         * This function takes a Markdown string as input and processes it through a series of transformations:
         * 1. Replaces line breaks with soft line breaks for better formatting.
         * 2. Splits the input text into an array of paragraphs, based on double newlines (`\n\n`).
         * 3. Merges consecutive list items of the same type (ordered or unordered lists) that may have been disrupted by splitting.
         * 
         * After applying these transformations, the processed Markdown is returned as an array of strings.
         * 
         * @param {string} src - The Markdown text to be processed.
         * @returns {string[]} - An array of processed Markdown paragraphs, with fixed list items and soft line breaks.
         */
        const processMarkdown = (src) => {
            return new MarkdownPreprocessor(src)
                .replaceWithSoftLineWraps()
                .splitFromEnd(/\n\n/g)
                .mergeListItems()
                .submit();
        }

        // Render each paragraph asynchronously.
        return await processList(processMarkdown(src));
    }
}