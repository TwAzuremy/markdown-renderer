import { marked } from "marked";

import { rules } from "../Rules";
import { templates } from "./Templates";
import { tokenizer } from "./Tokenizer";

const renderer = {
    space({ type, raw }) {
        const space = raw.replace(rules.renderer.space.newLines, templates.space(type))
            .replace(rules.renderer.space.anotherLines, "");

        return space;
    },
    blockquote({ type, tokens }) {
        const isEmptyContent = !tokens.length;

        const content = isEmptyContent ?
            this.parser.parse([{
                type: "paragraph",
                tokens: [{
                    type: "text",
                    text: ""
                }]
            }]) :
            this.parser.parse(tokens);

        return templates.blockquote(type, content);
    },
    paragraph({ type, tokens }) {
        return templates.paragraph(type, this.parser.parseInline(tokens));
    },
    br({ type }) {
        return templates.br(type);
    },
    text({ text }) {
        return templates.text(text);
    }
};

marked.use({
    async: true,
    pedantic: true,
    breaks: true,
    gfm: true,
    renderer,
    tokenizer
});

export class Markdown {
    static async parse(src) {
        return await marked.parse(
            rules.tokenizer.br(src)
        );
    }
}