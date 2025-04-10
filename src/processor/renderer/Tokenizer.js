import { rtrim } from "../../utils/StringUtils";

function addEmptyPlaceholder(blockquotes) {
    // 从后往前遍历，从倒数第二个元素开始
    for (let i = blockquotes.length - 2; i >= 0; i--) {
        const current = blockquotes[i];
        const next = blockquotes[i + 1];
        // 正则表达式匹配以 > 开头，后面跟随0个或多个空格的情况
        const regex = /^>\s*$/;
        // 检查当前元素和下一个元素是否都符合模式
        if (regex.test(current) && regex.test(next)) {
            // 在当前元素后追加 [EMPTY]
            blockquotes[i] = current + "[EMPTY]";
        }
    }
    return blockquotes;
}

export const tokenizer = {
    blockquote(src) {
        const cap = this.rules.block.blockquote.exec(src);
        if (cap) {
            let lines = addEmptyPlaceholder(rtrim(cap[0], '\n').split('\n'));
            let raw = '';
            let text = '';
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

                const currentRaw = currentLines.join('\n');
                const currentText = currentRaw
                    // precede setext continuation with 4 spaces so it isn't a setext
                    .replace(this.rules.other.blockquoteSetextReplace, '\n    $1')
                    .replace(this.rules.other.blockquoteSetextReplace2, '');
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

                if (lastToken?.type === 'code') {
                    // blockquote continuation cannot be preceded by a code block
                    break;
                } else if (lastToken?.type === 'blockquote') {
                    // include continuation in nested blockquote
                    const oldToken = lastToken;
                    const newText = oldToken.raw + '\n' + lines.join('\n');
                    const newToken = this.blockquote(newText);
                    tokens[tokens.length - 1] = newToken;

                    raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
                    text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
                    break;
                } else if (lastToken?.type === 'list') {
                    // include continuation in nested list
                    const oldToken = lastToken;
                    const newText = oldToken.raw + '\n' + lines.join('\n');
                    const newToken = this.list(newText);
                    tokens[tokens.length - 1] = newToken;

                    raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
                    text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
                    lines = newText.substring(tokens.at(-1).raw.length).split('\n');
                    continue;
                }
            }

            return {
                type: 'blockquote',
                raw,
                tokens,
                text,
            };
        }
    }
};