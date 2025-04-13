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
 * Parses a code block string to separate the language and content.
 * 
 * This function extracts the programming language (if specified) and the content of the code block 
 * from a string that may contain code block delimiters like ``` (common in Markdown).
 * 
 * - If the code block has a language specified (e.g., ```javascript), it will be extracted.
 * - If the language is not specified, the code block"s content is returned with an empty language field.
 * - The function also removes the code block delimiters from the content if present.
 * 
 * @param {string} code - The raw string of the code block to be parsed.
 * @returns {Object} An object containing two properties:
 * - `language`: The language of the code block, or an empty string if not specified.
 * - `content`: The content of the code block, with the delimiters removed.
 */
function parseCodeBlock(code) {
    const match = code.match(rules.renderer.code.separateLanguageAndCode);

    if (match) {
        const language = match ? match[1].trim() || "" : "";
        const content = match ? match[2] || "" : "";

        return {
            language: language || "",
            content: content
        };
    }

    // Handle cases where the code block doesn"t match the expected pattern (e.g., malformed code block)
    return {
        language: "",
        // Remove any remaining code block delimiters (```)
        content: code.replace(/^```|```$/g, "")
    };
}

/**
 * From the marked source code of helpers.ts.
 * 
 * @param {string} tableRow 
 * @param {number} count 
 * @returns 
 */
function splitCells(tableRow, count = 0) {
    // ensure that every cell-delimiting pipe has a space
    // before it to distinguish it from an escaped pipe
    const row = tableRow.replace(/\|/g, (match, offset, str) => {
        let escaped = false;
        let curr = offset;
        while (--curr >= 0 && str[curr] === "\\") escaped = !escaped;
        if (escaped) {
            // odd number of slashes means | is escaped
            // so we leave it alone
            return "|";
        } else {
            // add space before unescaped |
            return " |";
        }
    }),
        cells = row.split(/ \|/);
    let i = 0;

    // First/last cell in a row cannot be empty if it has no leading/trailing pipe
    if (!cells[0].trim()) {
        cells.shift();
    }
    if (cells.length > 0 && !cells.at(-1)?.trim()) {
        cells.pop();
    }

    if (count) {
        if (cells.length > count) {
            cells.splice(count);
        } else {
            while (cells.length < count) cells.push("");
        }
    }

    for (; i < cells.length; i++) {
        // leading or trailing whitespace is ignored per the gfm spec
        cells[i] = cells[i].trim().replace(/\\\|/g, "|");
    }
    return cells;
}

export const tokenizer = {
    code(src) {
        // [Modifications] Replace the matching Regex.
        const cap = rules.renderer.code.pattern.exec(src);

        if (cap) {
            // [Modifications] Separating the programming language from the code.
            const { language, content } = parseCodeBlock(cap[0]);

            return {
                type: "code",
                raw: cap[0],
                codeBlockStyle: "indented",
                text: content,
                language
            };
        }
    },
    blockquote(src) {
        const cap = this.rules.block.blockquote.exec(src);

        if (cap) {
            // [Modifications] Keep the blank lines in it.
            let lines = addEmptyPlaceholder(rtrim(cap[0], "\n").split("\n"));
            let raw = "";
            let text = "";
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

                const currentRaw = currentLines.join("\n");
                const currentText = currentRaw
                    // precede setext continuation with 4 spaces so it isn"t a setext
                    .replace(this.rules.other.blockquoteSetextReplace, "\n    $1")
                    .replace(this.rules.other.blockquoteSetextReplace2, "");
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

                if (lastToken?.type === "code") {
                    // blockquote continuation cannot be preceded by a code block
                    break;
                } else if (lastToken?.type === "blockquote") {
                    // include continuation in nested blockquote
                    const oldToken = lastToken;
                    const newText = oldToken.raw + "\n" + lines.join("\n");
                    const newToken = this.blockquote(newText);
                    tokens[tokens.length - 1] = newToken;

                    raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
                    text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
                    break;
                } else if (lastToken?.type === "list") {
                    // include continuation in nested list
                    const oldToken = lastToken;
                    const newText = oldToken.raw + "\n" + lines.join("\n");
                    const newToken = this.list(newText);
                    tokens[tokens.length - 1] = newToken;

                    raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
                    text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
                    lines = newText.substring(tokens.at(-1).raw.length).split("\n");
                    continue;
                }
            }

            return {
                type: "blockquote",
                raw,
                tokens,
                text,
            };
        }
    },
    html(src) {
        const cap = new RegExp(rules.renderer.html.blockPattern).exec(src);

        if (cap) {
            const tagName = cap[2] ?? cap[6];

            return {
                type: "html",
                raw: cap[0],
                block: true,
                single: !!!cap[4],
                tag: tagName,
                text: cap[4] ?? "",
                tokens: this.lexer.blockTokens(cap[4] ?? "", [])
            }
        }
    },
    table(src) {
        // [Modifications] Replace the new regex, the original one is invalid.
        const cap = new RegExp(rules.renderer.table.pattern).exec(src);

        if (!cap) {
            return;
        }

        if (!this.rules.other.tableDelimiter.test(cap[2])) {
            // delimiter row must have a pipe (|) or colon (:) otherwise it is a setext heading
            return;
        }

        const headers = splitCells(cap[1]);
        const aligns = cap[2].replace(this.rules.other.tableAlignChars, "").split("|");
        const rows = cap[3]?.trim() ? cap[3].replace(this.rules.other.tableRowBlankLine, "").split("\n") : [];

        const item = {
            type: "table",
            raw: cap[0],
            header: [],
            align: [],
            rows: [],
        };

        if (headers.length !== aligns.length) {
            // header and align columns must be equal, rows can be different.
            return;
        }

        for (const align of aligns) {
            if (this.rules.other.tableAlignRight.test(align)) {
                item.align.push("right");
            } else if (this.rules.other.tableAlignCenter.test(align)) {
                item.align.push("center");
            } else if (this.rules.other.tableAlignLeft.test(align)) {
                item.align.push("left");
            } else {
                item.align.push(null);
            }
        }

        for (let i = 0; i < headers.length; i++) {
            // [Modifications] Insert empty placeholders for better editing.
            const text = headers[i] ? headers[i] : "[EMPTY]";

            item.header.push({
                text,
                tokens: this.lexer.inline(text),
                header: true,
                align: item.align[i],
            });
        }

        for (const row of rows) {
            item.rows.push(splitCells(row, item.header.length).map((cell, i) => {
                // [Modifications] Insert empty placeholders for better editing.
                const text = cell ? cell : "[EMPTY]";

                return {
                    text,
                    tokens: this.lexer.inline(text),
                    header: false,
                    align: item.align[i],
                };
            }));
        }

        return item;
    },
    tag(src) {
        const cap = new RegExp(rules.renderer.html.inlinePattern).exec(src);
        const blockCap = new RegExp(rules.renderer.html.blockPattern).exec(src);

        if (blockCap) {
            return this.html(src);
        }

        if (cap) {
            const tagName = cap[2] ?? cap[6];

            return {
                type: "html",
                raw: cap[0],
                block: false,
                single: !!!cap[4],
                tag: tagName,
                text: cap[4] ?? "",
                tokens: this.lexer.inline(cap[4] ?? "")
            }
        }
    },
    del(src) {
        // [Modifications] Replace the matching Regex.
        const cap = rules.marked.del.pattern.exec(src);

        if (cap) {
            return {
                type: "del",
                raw: cap[0],
                text: cap[2],
                tokens: this.lexer.inlineTokens(cap[2]),
            };
        }
    }
};