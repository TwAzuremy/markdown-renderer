export const rules = {
    renderer: {
        space: {
            anotherLines: /\n{2}/g,
            newLines: /\n{4}/g,
        },
        list: {
            pattern: /^\s*([-*+]|\d+\.\s)/,
            orderedListItem: /^\d+\.\s+/,
            unorderedListItem: /^[*+-]\s+/
        },
        blockquote: {
            blockQuotePattern: /^(?:(>\s*)+)/,
            blockquoteEmptyLine: /^>\s*$/
        },
        code: {
            pattern: /(```[\s\S]*?```)/g,
            codeBlockOpening: /^```[^\r\n]*\n/,
            codeFenceEndLookahead: /```(?=\n|$)/g,
            codeFenceWithLanguage: /```[^\n]*\n/g
        },
        codeSpan: {
            codeSpanWithEscapes: /(?<!`)`([^`]+)`(?!`)/g
        },
        other: {
            trimStartPattern: /^\s*/,
            codeBlocksAndInlineCode: /(```[\s\S]*?```|`[^`]*`)/g,
            escapedOrUnescapedAngleBrackets: /(\\?)[<>]/g,
            escapeRegexPattern: /[.*+?^${}()|[\]\\]/g
        }
    }
};