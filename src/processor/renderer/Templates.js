import { escapeString } from "../../utils/StringUtils";

const MarkdownClassname = {
    block: "markdown-block",
    inline: "markdown-inline",
    symbol: "markdown-symbol",
    structure: "markdown-structure",
    taskList: "markdown-task-list",
    custom: "markdown-custom-element"
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

/**
 * Adds a class (or multiple classes) to the specified HTML tag in a string.
 * This function assumes the input is a valid HTML string and attempts to add the 
 * specified class(es) to the first occurrence of the specified tag's class list.
 * 
 * If the HTML string doesn't contain the specified tag or the operation fails, 
 * the original HTML string is returned unmodified.
 * 
 * @param {string} htmlString - The input HTML string containing the tag to which classes should be added.
 * @param {string} className - The class name (or space-separated list of class names) to be added to the element.
 * @param {string} tagName - The name of the HTML tag to which classes should be added.
 * @returns {string} - The modified HTML string with the class(es) added to the specified tag, or the original string if no modification is made.
 */
function addClassToHtmlTag(htmlString, className, tagName) {
    // Return original string if no tag is found.
    if (!tagName) return htmlString;

    const tempDiv = document.createElement('div');

    try {
        // Add closing tag for parsing.
        tempDiv.innerHTML = htmlString + `</${tagName}>`;
    } catch (e) {
        return htmlString;
    }

    const element = tempDiv.firstElementChild;
    if (!element) return htmlString;

    // Split by spaces and filter out empty strings.
    const classes = className.split(/\s+/).filter(c => c);
    // Add classes to the element.
    element.classList.add(...classes);

    const newHtml = element.outerHTML;
    const startTagEndIndex = newHtml.indexOf('>');

    return startTagEndIndex === -1 ? htmlString : newHtml.substring(0, startTagEndIndex + 1);
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
    htmlSingle(type, block, content) {
        const escapeContent = escapeString(content)

        return block ? `<p class="${MarkdownClassname.block}" data-type="${type}"><span class="${MarkdownClassname.symbol}" data-type="prefix">${escapeContent}</span>${content}</p>` : `<span class="${MarkdownClassname.inline}" data-type="${type}"><span class="${MarkdownClassname.symbol}" data-type="prefix">${escapeContent}</span>${content}</span>`;
    },
    html(block, tags, content, tagName) {
        const prefixTag = escapeString(tags[0]);
        const suffixTag = escapeString(tags[1]);

        tags[0] = addClassToHtmlTag(tags[0], `${MarkdownClassname.custom}`, tagName);

        const childElement = `<span class="${MarkdownClassname.symbol}" data-type="prefix">${prefixTag}</span>${tags[0]}${content}${tags[1]}<span class="${MarkdownClassname.symbol}" data-type="suffix">${suffixTag}</span>`;

        if (block) {
            return `<div class="${MarkdownClassname.block}" data-type="custom">${childElement}</div>`;
        } else {
            return `<span class="${MarkdownClassname.inline}" data-type="custom">${childElement}</span>`;
        }
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
    table(type, header, body) {
        return `<table class="${MarkdownClassname.block}" data-type="${type}"><thead>${header}</thead>${body}</table>`
    },
    tablerow(text) {
        return `<tr>${text}</tr>`;
    },
    tablecell(type, content, align) {
        const tag = align
            ? `<${type} align="${align}">`
            : `<${type}>`;

        return `${tag}${content}</${type}>`;
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
        const isEmpty = !text || text === "[EMPTY]";

        return `<span class="${MarkdownClassname.inline}" data-type="text">${isEmpty ? `<br class="empty-placeholder">` : text}</span>`;
    }
};