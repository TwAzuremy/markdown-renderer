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
            codeBlockRegex: /^```[\s\S]*```[ \n]*$/
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
        },
        other: {
            codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm
        }
    }
};