const MarkdownClassname = {
    block: "markdown-block",
    inline: "markdown-inline"
};

export const templates = {
    paragraph(type, content) {
        return `<p class="${MarkdownClassname.block}" data-type="${type}">${content}</p>`;
    },
    text(text) {
        return `<span class="${MarkdownClassname.inline}" data-type="text">${text || "<br>"}</span>`;
    }
};