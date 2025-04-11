import { templates } from "./Templates";

export const renderer = {
    paragraph({ type, tokens }) {
        return templates.paragraph(type, this.parser.parseInline(tokens));
    },
    text({ text, tokens }) {
        return tokens ? this.parser.parseInline(tokens) : templates.text(text);
    }
};