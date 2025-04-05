import { processMarkdownBreaks } from "../utils/StringUtils";

export const rules = {
    renderer: {
        space: {
            anotherLines: /\n{2}/g,
            newLines: /\n{4}/g,
        }
    },
    tokenizer: {
        br(src) {
            return processMarkdownBreaks(src);
        },
        brPlaceholder: "\uFFFF",
        removeBRPlacehoder: /\uFFFF+/g
    }
};