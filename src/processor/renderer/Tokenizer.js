import { rtrim } from "../../utils/StringUtils";
import { rules } from "../Rules";

/**
 * Adds a placeholder `[EMPTY]` to blockquotes that are followed by another blockquote with no content in between.
 *
 * This function iterates through an array of blockquotes, starting from the second-to-last element and moving backward. 
 * It checks whether two consecutive blockquotes match a specific pattern and appends `[EMPTY]` to the current blockquote if they do.
 *
 * @param {string[]} blockquotes - An array of blockquote strings.
 * @returns {string[]} - The updated array of blockquotes, with `[EMPTY]` added where necessary.
 */
function addEmptyPlaceholder(blockquotes) {
    // Traverse the blockquotes array from the second-to-last element backward
    for (let i = blockquotes.length - 2; i >= 0; i--) {
        const current = blockquotes[i];
        const next = blockquotes[i + 1];
        // Regular expression to match a blockquote that starts with ">" followed by zero or more spaces
        const regex = rules.renderer.blockquote.blockquoteEmptyLine;
        // Check if both the current and the next blockquote match the pattern
        if (regex.test(current) && regex.test(next)) {
            // Append "[EMPTY]" to the current blockquote
            blockquotes[i] = current + "[EMPTY]";
        }
    }
    return blockquotes;
}

/**
 * Fixes the syntax of a code block in markdown format.
 * It checks if the input string matches a code block opening structure (````xxx\n`), 
 * and attempts to repair the structure by ensuring it ends with a valid closing sequence (```).
 *
 * @param {{0: string, 1: string, input: string}} cap - An object representing the captured match in the regular expression.
 *    - cap[0]: The entire matched string.
 *    - cap[1]: The second capturing group of the match.
 *    - input: The original input string being processed.
 * @returns {{0: string, 1: string, input: string}} - The updated match object with potentially fixed code block.
 */
function fixCap(cap) {
    // Check if cap[0] matches the opening structure "```xxx\n"
    if (!rules.renderer.code.codeBlockOpening.test(cap[0])) {
        // Return the original object if it does not match
        return cap;
    }

    // Remove the beginning of the cap[0] part
    const newInput = cap.input.slice(cap[0].length);

    // Search for the first occurrence of "```\n" (A) or "```xxx\n" (B)
    const matchA = /```(?=\n|$)/g.exec(newInput);
    const indexA = matchA ? matchA.index : Infinity;
    const matchB = /```[^\n]*\n/g.exec(newInput);
    const indexB = matchB ? matchB.index : Infinity;

    if (indexA < indexB) {
        // Construct a regular expression to match the closing structure
        const escapedStart = cap[0].replace(rules.renderer.other.escapeRegexPattern, '\\$&');
        const match = cap.input.match(new RegExp(`^${escapedStart}(.*?)\`\`\``, 's'));

        if (match) {
            // Update cap[0] and cap[1], keeping the input unchanged
            const content = match[1];

            cap[0] = cap[0] + content + "```";
            cap[1] = cap[0];
        }
    }

    return cap;
}

export const tokenizer = {
    paragraph(src) {
        // [Modifications] Fixed the issue of separating "Markdown Code Block".
        const cap = fixCap(this.rules.block.paragraph.exec(src));

        if (cap) {
            const text = cap[1].charAt(cap[1].length - 1) === '\n'
                ? cap[1].slice(0, -1)
                : cap[1];
            return {
                type: 'paragraph',
                raw: cap[0],
                text,
                tokens: this.lexer.inline(text),
            };
        }
    },
    blockquote(src) {
        const cap = this.rules.block.blockquote.exec(src);
        if (cap) {
            // [Modifications] Keep the blank lines in it.
            let lines = addEmptyPlaceholder(rtrim(cap[0], '\n').split('\n'));
            let raw = '';
            let text = '';
            const tokens = [];

            while (lines.length > 0) {
                let inBlockquote = false;
                const currentLines = [];

                let i;
                for (i = 0; i < lines.length; i++) {
                    // get lines up to a continuation
                    if (this.rules.other.blockquoteStart.test(lines[i])) {
                        currentLines.push(lines[i]);
                        inBlockquote = true;
                    } else if (!inBlockquote) {
                        currentLines.push(lines[i]);
                    } else {
                        break;
                    }
                }
                lines = lines.slice(i);

                const currentRaw = currentLines.join('\n');
                const currentText = currentRaw
                    // precede setext continuation with 4 spaces so it isn't a setext
                    .replace(this.rules.other.blockquoteSetextReplace, '\n    $1')
                    .replace(this.rules.other.blockquoteSetextReplace2, '');
                raw = raw ? `${raw}\n${currentRaw}` : currentRaw;
                text = text ? `${text}\n${currentText}` : currentText;

                // parse blockquote lines as top level tokens
                // merge paragraphs if this is a continuation
                const top = this.lexer.state.top;
                this.lexer.state.top = true;
                this.lexer.blockTokens(currentText, tokens, true);
                this.lexer.state.top = top;

                // if there is no continuation then we are done
                if (lines.length === 0) {
                    break;
                }

                const lastToken = tokens.at(-1);

                if (lastToken?.type === 'code') {
                    // blockquote continuation cannot be preceded by a code block
                    break;
                } else if (lastToken?.type === 'blockquote') {
                    // include continuation in nested blockquote
                    const oldToken = lastToken;
                    const newText = oldToken.raw + '\n' + lines.join('\n');
                    const newToken = this.blockquote(newText);
                    tokens[tokens.length - 1] = newToken;

                    raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
                    text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
                    break;
                } else if (lastToken?.type === 'list') {
                    // include continuation in nested list
                    const oldToken = lastToken;
                    const newText = oldToken.raw + '\n' + lines.join('\n');
                    const newToken = this.list(newText);
                    tokens[tokens.length - 1] = newToken;

                    raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
                    text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
                    lines = newText.substring(tokens.at(-1).raw.length).split('\n');
                    continue;
                }
            }

            return {
                type: 'blockquote',
                raw,
                tokens,
                text,
            };
        }
    }
};