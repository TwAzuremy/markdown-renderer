import { escapeString, toCamelCase } from "../../utils/StringUtils";
import { rules } from "../Rules";
import { templates } from "./Templates";

/**
 * Recursively concatenates the `text` properties of an array of token objects, potentially handling nested tokens.
 *
 * This function processes each token in the input `tokens` array. If a token contains nested tokens (indicated by the `tokens` property),
 * it will recursively concatenate their `text` properties. The recursion continues until all nested tokens are processed.
 * If a token does not have nested tokens, its `text` property is directly added to the result.
 *
 * To prevent excessive recursion (which might lead to stack overflow), a maximum recursion depth (`maxDepth`) is enforced.
 * If the recursion depth exceeds this limit, an error is thrown.
 *
 * @param {Array} tokens - The array of token objects to be processed. Each token can have a `text` property and optionally a `tokens` property (which is an array of nested tokens).
 * @param {number} [depth=0] - The current depth of recursion, used to track the recursion level.
 * @param {number} [maxDepth=1000] - The maximum allowed depth for recursion. If the recursion exceeds this limit, an error is thrown.
 * @returns {string} - A single concatenated string of all `text` properties from the tokens and their nested tokens.
 * @throws {Error} - Throws an error if the recursion depth exceeds `maxDepth`.
 */
const concatTexts = (tokens, depth = 0, maxDepth = 1000) => {
    if (depth > maxDepth) throw new Error("There are too many nested tokens.");

    return tokens.reduce(
        (acc, { text, tokens }) =>
            acc + (tokens ? concatTexts(tokens, depth + 1) : text || ""), "");
};

/**
 * Extracts HTML tags from a given HTML string.
 * 
 * This function uses a regular expression to capture the start tag, 
 * content inside the tag, and the end tag from the provided HTML string.
 * 
 * @param {string} htmlStr - The HTML string to parse.
 * @returns {Object|null} - An object containing the start tag, content, 
 *                          and end tag if a match is found; 
 *                          otherwise, null if no match is found.
 */
function getHTMLTags(htmlStr) {
    // Regex pattern to match HTML tags (start, content, and end)
    const regex = new RegExp(rules.renderer.html.pattern);
    const match = htmlStr.match(regex);

    if (match) {
        return {
            // Start tag (including attributes)
            startTag: match[1],
            content: match[3],
            endTag: `</${match[2]}>`
        };
    } else {
        // If no match is found, return null or handle the error as needed
        return null;
    }
}

export const renderer = {
    // Block-level renderer methods
    code({ type, text, language }) {
        return templates.code(type, escapeString(text), language);
    },
    blockquote({ type, tokens }) {
        return templates.blockquote(type, this.parser.parse(tokens));
    },
    html(tokens) {
        if (tokens.single) {
            return templates.htmlSingle(tokens.type, tokens.block, tokens.raw);
        }

        const { startTag, endTag } = getHTMLTags(tokens.raw);
        const content = this.parser[tokens.block ? "parse" : "parseInline"](tokens.tokens);

        return templates.html(tokens.block, [startTag, endTag], content, tokens.tag);
    },
    hr({ type, raw }) {
        return templates.hr(type, raw);
    },
    list({ type, items, ordered }) {
        const li = items.map(this.listitem).join("");
        const tag = ordered ? "ol" : "ul";

        return templates.list(type, li, tag);
    },
    listitem({ type, tokens, task, checked = false }) {
        if (task) {
            const checkbox = this.checkbox(checked);

            return templates.listitem(type, checkbox + this.parser.parse(tokens), task);
        }

        return templates.listitem(type, this.parser.parse(tokens));
    },
    checkbox(checked) {
        return templates.checkbox(checked);
    },
    heading({ type, tokens, depth }) {
        const text = this.parser.parseInline(tokens);

        // Title ID preprocessing
        const unmarkedText = concatTexts(tokens);
        const marker = toCamelCase(unmarkedText);

        return templates.heading(type, text, depth, marker);
    },
    paragraph({ type, tokens }) {
        return templates.paragraph(type, this.parser.parseInline(tokens));
    },
    table(token) {
        // header
        const header = this.tablerow({
            text: token.header.map(j => this.tablecell(j)).join("")
        });

        let body = token.rows.map(row =>
            this.tablerow({
                text: row.map(k => this.tablecell(k)).join("")
            })
        ).join("");

        body = body ? `<tbody>${body}</tbody>` : "";

        return templates.table(token.type, header, body);
    },
    tablerow({ text }) {
        return templates.tablerow(text);
    },
    tablecell(token) {
        const content = this.parser.parseInline(token.tokens);
        const type = token.header ? "th" : "td";

        return templates.tablecell(type, content, token.align);
    },
    // Inline-level renderer methods
    strong({ type, text, raw, tokens }) {
        const symbol = raw.split(text)[0];

        return templates.strong(type, this.parser.parseInline(tokens), symbol);
    },
    em({ type, text, raw, tokens }) {
        const symbol = raw.split(text)[0];

        return templates.em(type, this.parser.parseInline(tokens), symbol);
    },
    codespan({ type, text, raw }) {
        const symbol = raw.split(text)[0];
        const content = templates.text(escapeString(text));

        return templates.codespan(type, content, symbol);
    },
    br({ type }) {
        return templates.br(type);
    },
    del({ type, text, raw, tokens }) {
        const symbol = raw.split(text)[0];

        return templates.del(type, this.parser.parseInline(tokens), symbol);
    },
    link({ type, text, raw, tokens, href, title = null }) {
        const structures = raw.split(text);

        return templates.link(
            type,
            this.parser.parseInline(tokens),
            href,
            title,
            structures
        );
    },
    image({ type, text, raw, href, title = null }) {
        return templates.image(type, text, href, title, raw);
    },
    text({ text, tokens }) {
        return tokens ? this.parser.parseInline(tokens) : templates.text(text);
    },
};
