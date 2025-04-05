const markdownParagraphClassname = "markdown-block";
const markdownInlineTextClassname = "markdown-inline";

export const templates = {
    space(type = "space") {
        return `<p class="${markdownParagraphClassname}" data-type="${type}"><br></p>`;
    },
    blockquote(type, content) {
        return `<blockquote class="${markdownParagraphClassname}" data-type="${type}">${content}</blockquote>`;
    },
    paragraph(type, content) {
        return `<p class="${markdownParagraphClassname}" data-type="${type}">${content}</p>`;
    },
    br(type) {
        return `<br class="${markdownInlineTextClassname}" data-type="${type}">`;
    },
    text(text) {
        return `<span class="${markdownInlineTextClassname}" data-type="text">${text || "<br>"}</span>`;
    }
};