export const rules = {
    renderer: {
        space: {
            anotherLines: /\n{2}/g,
            newLines: /\n{4}/g,
        },
        list: {
            leadingWhitespaceRe: /^\s*/,
        }
    }
};