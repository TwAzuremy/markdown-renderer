import { getHTMLBlockTags, getHTMLVoidTags } from "../utils/StringUtils";

/**
 * Creates a regular expression for matching HTML tags based on the specified type.
 * The regex can match both block-level or inline HTML tags, including both closing and void tags.
 * 
 * @param {string} [type="block"] - The type of HTML tags to match. It can be either "block" or "inline".
 *                                  - "block" matches block-level tags (e.g., <div>, <p>) and void tags (e.g., <hr>).
 *                                  - "inline" matches inline tags (e.g., <span>, <a>) and void tags (e.g., <img>).
 * 
 * @returns {RegExp} - The regular expression to match the specified type of HTML tags. 
 *                     The regex includes both matching opening/closing tags and self-closing tags.
 * 
 * @example
 * const regexBlock = createHTMLTagsRegex("block");
 * const regexInline = createHTMLTagsRegex("inline");
 */
function createHTMLTagsRegex(type = "block") {
    const blockTags = [...getHTMLBlockTags()];
    const voidTags = [...getHTMLVoidTags()];

    // Generate the tag patterns based on the specified type.
    let closeTags, voidElements;

    if (type === "block") {
        // Block closing tags: blockTags excluding void tags.
        closeTags = blockTags.filter(tag => !voidTags.includes(tag)).join("|");

        // Block void tags: tags that are both block-level and void (e.g., <hr>).
        voidElements = blockTags.filter(tag => voidTags.includes(tag)).join("|");
    } else {
        // Inline closing tags: tags that are neither block nor void tags.
        const excludePattern = [...blockTags, ...voidTags].join("|");

        closeTags = `(?!${excludePattern}$)[a-zA-Z]+`;

        // Inline void tags: void tags excluding block-level tags.
        voidElements = voidTags.filter(tag => !blockTags.includes(tag)).join("|");
    }

    // Construct the regular expression pattern.
    const pattern = [
        // Match closing tags (group 1 to group 4).
        closeTags && `(^<(${closeTags})(\\s[^>]*?)?>([\\s\\S]*?)<\\/\\2>)`,
        // Match self-closing tags (group 5 to group 7).
        voidElements && `(^<(${voidElements})(\\s[^>]*?)?\\/?>)`
    ]
        // Remove empty parts.
        .filter(Boolean)
        .join("|");

    return new RegExp(pattern, "gi");
}

export const rules = {
    renderer: {
        space: {
            anotherLines: /\n{2}/g,
            newLines: /\n{4}/g,
        },
        code: {
            pattern: /(```[\s\S]*?```)/g,
            codeFenceEndLookahead: /```(?=\n|$)/g,
            codeFenceWithLanguage: /```[^\n]*\n/g,
            codeBlockRegex: /^```[\s\S]*```[ \n]*$/,
            separateLanguageAndCode: /^```([^\n]*)\n([\s\S]*?)\n```$/
        },
        html: {
            blockPattern: createHTMLTagsRegex("block"),
            inlinePattern: createHTMLTagsRegex("inline")
        },
        blockquote: {
            blockQuotePattern: /^(?:(>\s*)+)/,
            blockquoteEmptyLine: /^>\s*$/
        },
        list: {
            pattern: /^\s*([-*+]|\d+\.\s)/,
            orderedListItem: /^\d+\.\s+/,
            unorderedListItem: /^[*+-]\s+/
        },
        table: {
            pattern: /^\s*(\|.*\|)\s*\r?\n\s*(\|(?: *:?-{3,}:? *\|)+)(?:\s*\r?\n\s*((?:^[^\S\r\n]*\|.*\|[^\S\r\n]*(?:\r?\n|$))+))*$/gm
        },
        codeSpan: {
            codeSpanWithEscapes: /(?<!`)`([^`]+)`(?!`)/g
        },
        other: {
            trimStartPattern: /^\s*/,
            codeBlocksAndInlineCode: /(```[\s\S]*?```|`[^`]*`)/g,
            escapedOrUnescapedAngleBrackets: /(\\?)[<>]/g
        }
    },
    // Regular Regex extracted from the source code of marked.
    marked: {
        del: {
            pattern: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/
        }
    }
};