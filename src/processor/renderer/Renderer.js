import { marked } from "marked";

// import { rules } from "../Rules";
import { templates } from "./Templates";
import { tokenizer } from "./Tokenizer";
import { rules } from "../Rules";

const renderer = {
    paragraph({ type, tokens }) {
        return templates.paragraph(type, this.parser.parseInline(tokens));
    },
    text({ text, tokens }) {
        return tokens ? this.parser.parseInline(tokens) :
            templates.text(text);
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
            if (/^\s*([-*+]|\d+\.\s)/.test(nextLine)) return match;

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

function mergeListItems(arr) {
    const mergedArray = [];
    let currentType = null;
    let buffer = [];

    const flushBuffer = () => {
        if (buffer.length) {
            mergedArray.push(buffer.join('\n\n'));
            buffer = [];
        }
    };

    for (const item of arr) {
        const trimmed = item.replace(rules.renderer.list.leadingWhitespaceRe, '');
        let type = null;

        if (/^[*+-]\s+/.test(trimmed)) {
            type = 'unordered';
        } else if (/^\d+\.\s+/.test(trimmed)) {
            type = 'ordered';
        }

        if (type) {
            if (type !== currentType) {
                flushBuffer();
                currentType = type;
            }
            buffer.push(item);
        } else {
            flushBuffer();
            currentType = null;
            mergedArray.push(item);
        }
    }
    flushBuffer();

    return mergedArray;
}

function splitFromEnd(str, limit = Infinity) {
    // Step 1: 识别所有代码块和行内代码的边界
    const codeBoundaries = [];
    const codeRegex = /(```[\s\S]*?```|`[^`]*`)/g;
    let match;
    while ((match = codeRegex.exec(str)) !== null) {
        codeBoundaries.push({ start: match.index, end: match.index + match[0].length });
    }

    // Step 2: 找到所有有效的双换行符位置（不在代码块内）
    const splitPositions = [];
    const newlineRegex = /\n{2}/g;
    while ((match = newlineRegex.exec(str)) !== null) {
        const pos = match.index;
        const isInCode = codeBoundaries.some(b => pos >= b.start && pos < b.end);
        if (!isInCode) splitPositions.push(pos);
    }

    // Step 3: 从后向前分割字符串
    const parts = [];
    let remaining = str;
    let count = 1;

    // 按逆序处理分割位置（从后往前）
    splitPositions.sort((a, b) => b - a).forEach(pos => {
        if (count >= limit) return;
        if (pos >= remaining.length) return;

        parts.push(remaining.slice(pos + 2)); // +2 跳过两个换行符
        remaining = remaining.slice(0, pos);
        count++;
    });

    parts.push(remaining);
    return parts.reverse();
}

// 假设 parse 是异步解析函数，list 是原始数组
async function processList(list) {
    // 使用 map 遍历列表，生成 Promise 数组
    const promises = list.map(item => {
        let processed = item;

        if (processed.trim() === '') {
            processed += '[EMPTY]';
        }

        if (processed.endsWith('\n')) {
            processed += '[EMPTY]';
        }

        return marked.parse(processed);
    });
    // 等待所有 Promise 完成
    const results = await Promise.all(promises);
    return results;
}

function escapeAngleBrackets(src) {
    // 处理代码块 (```code```)
    let processed = src.replace(/```([\s\S]*?)```/g, (_, code) =>
        '```' + escapeCodeContent(code) + '```'
    );

    // 处理行内代码 (`code`)
    processed = processed.replace(/`((?:\\`|\\\\|[^`\\]|\\[^`\\])*?)`/g, (_, code) =>
        '`' + escapeCodeContent(code) + '`'
    );

    return processed;
}

function escapeCodeContent(content) {
    return content.replace(/(\\?)[<>]/g, (m, esc) => esc ? m : `\\${m}`);
}

export class Markdown {
    static async parse(src) {
        const startTime = performance.now();

        const preStartTime = performance.now();
        const preprocessText = replaceNewlines(src);
        const preEndTime = performance.now();
        console.log(`软换行替换耗时: ${preEndTime - preStartTime} 毫秒`);

        const escapeStartTime = performance.now();
        const escapeAngleBracketsText = escapeAngleBrackets(preprocessText);
        const escapeEndTime = performance.now();
        console.log(`尖括号转义耗时: ${escapeEndTime - escapeStartTime}`);

        const sepStartTime = performance.now();
        const paragraphSeparation = splitFromEnd(escapeAngleBracketsText);
        const sepEndTime = performance.now();
        console.log(`段落分离耗时: ${sepEndTime - sepStartTime} 毫秒`);

        const mergeStartTime = performance.now();
        const amendedParagraphs = mergeListItems(paragraphSeparation);
        const mergeEndTime = performance.now();
        console.log(`列表合并修复耗时: ${mergeEndTime - mergeStartTime} 毫秒`);

        const endTime = performance.now();
        console.log(`预处理总耗时: ${endTime - startTime} 毫秒`);

        const parseStartTime = performance.now();
        const result = await processList(amendedParagraphs);
        const parseEndTime = performance.now();
        console.log(`异步解析总耗时: ${parseEndTime - parseStartTime} 毫秒`);

        return result;
    }
}