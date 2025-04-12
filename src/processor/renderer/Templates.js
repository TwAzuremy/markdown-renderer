const MarkdownClassname = {
    block: "markdown-block",
    inline: "markdown-inline",
    symbol: "markdown-symbol",
    structure: "markdown-structure",
    taskList: "markdown-task-list"
};

/**
 * Replaces the outer <span> tags with a specified new tag name.
 * 
 * This function takes an HTML string and a new tag name, and replaces the opening
 * `<span>` tag and the closing `</span>` tag with the provided new tag name.
 * 
 * The function performs the following steps:
 * 1. Replaces the opening `<span>` tag with the new tag.
 * 2. Replaces the closing `</span>` tag with the corresponding closing tag of the new tag name.
 * 
 * The function supports optional attributes within the `<span>` tag and ensures they are preserved when replacing the tag.
 * 
 * @param {string} htmlString - The HTML string containing the `<span>` tag to be replaced.
 * @param {string} newTagName - The new tag name to replace `<span>` with.
 * @returns {string} - The modified HTML string with the outer `<span>` tags replaced by the new tag name.
 */
function replaceOuterSpanRegex(htmlString, newTagName) {
    // Replace the opening "<span" tag with the new tag name, preserving any attributes
    const replacedOpen = htmlString.replace(
        /^<span(\s+[^>]*?)?>/i, `<${newTagName}$1>`
    );

    // Replace the closing "</span>" tag with the new tag name
    const replacedClose = replacedOpen.replace(
        /<\/span>$/i, `</${newTagName}>`
    );

    return replacedClose;
}

/**
 * Wraps a text inside a span with a symbol as a prefix and suffix, using a custom tag and type.
 * 
 * This function takes in a `type`, `text`, `symbol`, and `tag`, then returns an HTML structure with:
 * - The `text` wrapped in a `<span>` element with a custom tag, replaced from a `<span>` tag using `replaceOuterSpanRegex`.
 * - A symbol added as a prefix and suffix, each inside a nested `<span>` element.
 * 
 * The final output contains:
 * - A wrapper `<span>` with a class name defined by `MarkdownClassname.inline` and a `data-type` attribute set to the provided `type`.
 * - The symbol (`symbol`) placed at both the prefix and suffix of the `text`.
 * 
 * The function is useful for adding inline symbolic styling to text, commonly used in Markdown-like rendering systems.
 * 
 * @param {string} type - A type identifier for the inline element, used as a `data-type` attribute.
 * @param {string} text - The content to be wrapped with symbols.
 * @param {string} symbol - The symbol to appear at both the start and end of the `text`.
 * @param {string} tag - The tag to replace the outer `<span>` of `text` with, using `replaceOuterSpanRegex`.
 * @returns {string} - The HTML structure with the symbol-wrapped text and custom tag.
 */
function simpleClosedSymbol(type, text, symbol, tag) {
    const inlineText = replaceOuterSpanRegex(text, tag);

    return `<span class="${MarkdownClassname.inline}" data-type="${type}"><span class="${MarkdownClassname.symbol}" data-position="prefix">${symbol}</span>${inlineText}<span class="${MarkdownClassname.symbol}" data-position="suffix">${symbol}</span></span>`
}

export const templates = {
    // Block-level renderer methods
    code(type, content, language) {
        // TODO [新增] 考虑输入语言的地方如何放置
        return `<div class="${MarkdownClassname.block}" data-type="${type}" data-language="${language}"><pre class="markdown-code language-${language}">${content}</pre></div>`;
    },
    blockquote(type, content) {
        return `<blockquote class="${MarkdownClassname.block}" data-type="${type}">${content}</blockquote>`;
    },
    hr(type, raw) {
        return `<hr class="${MarkdownClassname.block}" data-type="${type}" data-raw="${raw}">`;
    },
    list(type, body, tag) {
        return `<${tag} class="${MarkdownClassname.block}" data-type="${type}">${body}</${tag}>`;
    },
    listitem(type, content, isTask = false) {
        return `<li class="${isTask ? "task-item" : ""}" data-type="${type}">${content}</li>`;
    },
    checkbox(checked) {
        return `<input class="${MarkdownClassname.taskList}" type="checkbox" ${checked ? "checked" : ""}>`
    },
    heading(type, text, depth, marker) {
        return `<h${depth} id="${"#".repeat(depth) + marker}" class="${MarkdownClassname.block}" data-type="${type}">${text}</h${depth}>`;
    },
    paragraph(type, content) {
        return `<p class="${MarkdownClassname.block}" data-type="${type}">${content}</p>`;
    },
    // Inline-level renderer methods
    strong(type, text, symbol) {
        return simpleClosedSymbol(type, text, symbol, type);
    },
    em(type, text, symbol) {
        return simpleClosedSymbol(type, text, symbol, type);
    },
    codespan(type, text, symbol) {
        return simpleClosedSymbol(type, text, symbol, "code");
    },
    br(type) {
        return `<br class="${MarkdownClassname.inline}" data-purposes="breaks" data-type="${type}">`;
    },
    del(type, text, symbol) {
        return simpleClosedSymbol(type, text, symbol, type);
    },
    link(type, text, href, title, structures = ["", ""]) {
        return `<span class="${MarkdownClassname.inline}" data-type="${type}"><span class="${MarkdownClassname.structure}" data-position="prefix">${structures[0]}</span><a href="${href}" ${title ? `title="${title}"` : ""}>${text}</a><span class="${MarkdownClassname.structure}" data-position="suffix">${structures[1]}</span></span>`;
    },
    image(type, alt, href, title, structure) {
        return `<span class="${MarkdownClassname.inline}" data-type="${type}"><span class="${MarkdownClassname.structure}" data-position="prefix">${structure}</span><img src="${href}" alt="${alt}" ${title ? `title="${title}"` : ""}></span>`;
    },
    text(text) {
        return `<span class="${MarkdownClassname.inline}" data-type="text">${text || `<br>`}</span>`;
    }
};