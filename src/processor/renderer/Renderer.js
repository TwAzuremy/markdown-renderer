import { marked } from "marked";

// import { rules } from "../Rules";
import { templates } from "./Templates";
import { tokenizer } from "./Tokenizer";

/**
 * 使用DOM API安全地替换HTML中文本节点的空格
 * @param {string} html - 原始HTML字符串
 * @returns {string} 处理后的HTML字符串
 */
function replaceTextSpaces(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        { acceptNode: node => node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP }
    );

    while (walker.nextNode()) {
        walker.currentNode.nodeValue = walker.currentNode.nodeValue.replace(/ /g, '&nbsp;');
    }

    return tempDiv.innerHTML;
}

const renderer = {
    paragraph({ type, tokens }) {
        return templates.paragraph(type, this.parser.parseInline(tokens));
    },
    text({ text, tokens }) {
        return tokens ? this.parser.parseInline(tokens) :
            templates.text(replaceTextSpaces(text));
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

function replaceNewlines(text) {
    // 辅助函数：获取行的嵌套层级（行首的 > 数量）
    const getLevel = (line) => {
        const trimmed = line.replace(/^\s*/, '');
        const match = trimmed.match(/>/g);

        return match ? match.length : 0;
    };

    // 行有效性验证（包含新条件）
    const isValidLine = (line) => {
        if (line.length === 0) return false; // 空行直接排除

        // 检查是否Blockquote行
        const trimmed = line.replace(/^\s*/, '');
        const isBlockquote = trimmed.startsWith('>');

        if (isBlockquote) {
            // 提取Blockquote内容和层级
            const gtContent = trimmed.match(/^(?:(>\s*)+)/)?.[0] || '';
            const remaining = trimmed.slice(gtContent.length);

            // 必须包含非空内容或两个以上连续空格
            return remaining.includes('  ') || /\S/.test(remaining);
        }
        return true; // 普通行只需非空
    };

    // 分割代码块
    const codeBlockSplit = text.split(/(```[\s\S]*?```)/g);

    for (let i = 0; i < codeBlockSplit.length; i++) {
        if (i % 2 === 1) continue; // 跳过代码块

        codeBlockSplit[i] = codeBlockSplit[i].replace(/\n/g, (match, offset, str) => {
            // 获取当前行内容
            const lineStart = str.lastIndexOf('\n', offset - 1) + 1;
            const currentLine = str.slice(lineStart, offset);

            // 新条件验证
            if (!isValidLine(currentLine)) return match;

            // 原有条件验证
            const nextPos = offset + 1;
            if (str[nextPos] === '\n') return match; // 连续换行

            // 获取下一行
            const nextLineEnd = str.indexOf('\n', nextPos);
            const nextLine = str.slice(nextPos, nextLineEnd === -1 ? undefined : nextLineEnd);

            // 排除列表项
            if (/^\s*([-*]|\d+\.\s)/.test(nextLine)) return match;

            // 处理Blockquote嵌套
            if (str[nextPos] === '>') {
                // 检查>后内容有效性
                const afterGT = nextLine.slice(1);
                if (!(/\S| {2}/.test(afterGT))) return match;

                // 层级一致性检查
                if (getLevel(currentLine) !== getLevel(nextLine)) return match;
            }

            return '  \n'; // 满足所有条件
        });
    }

    return codeBlockSplit.join('');
}

export class Markdown {
    static async parse(src) {
        const test = replaceNewlines(src);
        console.log(test.replace(/ {2}\n/g, "[软换行]\n"));

        return await marked.parse(test);
    }
}