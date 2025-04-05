import { rules } from "../processor/Rules";

/**
 * Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
 * /c*$/ is vulnerable to REDOS.
 *
 * @param {String} str
 * @param {String} c
 * @param {Boolean} invert Remove suffix of non-c chars instead. Default falsey.
 */
export function rtrim(str, c, invert) {
    const l = str.length;
    if (l === 0) {
        return '';
    }

    // Length of suffix matching the invert condition.
    let suffLen = 0;

    // Step left until we fail to match the invert condition.
    while (suffLen < l) {
        const currChar = str.charAt(l - suffLen - 1);
        if (currChar === c && !invert) {
            suffLen++;
        } else if (currChar !== c && invert) {
            suffLen++;
        } else {
            break;
        }
    }

    return str.slice(0, l - suffLen);
}

export function mergeBlockquotes(input) {
    const lines = input.split('\n');
    const result = [];
    let i = 0;

    while (i < lines.length) {
        const currentLine = lines[i];

        // 匹配两个及以上 `>` 的嵌套结构
        const isNested = /^(>\s*){2,}/.test(currentLine);
        if (isNested) {
            result.push(currentLine);
            i++;
            continue;
        }

        // 提取当前行内容（移除开头的 `>`）
        const currentContent = currentLine.replace(/^>*/, '');

        // 空行直接保留
        if (currentContent === '') {
            result.push(currentLine);
            i++;
            continue;
        }

        // 检查下一行是否可合并
        let canMerge = false;
        let separator = rules.tokenizer.brPlaceholder.repeat(3);
        let nextContent = '';
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];

            // 下一行必须是单层块引用
            if (nextLine.startsWith('>') && !/^>\s*>/.test(nextLine)) {
                nextContent = nextLine.replace(/^>\s*/, '');
                canMerge = nextContent !== '';

                // 根据下一行 `>` 后是否有空格选择连接符
                if (canMerge) {
                    const hasSpaceAfterQuote = /^>\s+/.test(nextLine);
                    separator = hasSpaceAfterQuote ? separator : rules.tokenizer.brPlaceholder.repeat(2);
                }
            }
        }

        // 合并或保留当前行
        if (canMerge) {
            result.push(`>${currentContent}${separator}${nextContent}`);
            i += 2;
        } else {
            result.push(currentLine);
            i++;
        }
    }

    return result.join('\n');
}

export function processMarkdownBreaks(src) {
    const lines = src.split('\n');
    const result = [];
    let inCodeBlock = false;    // 是否在代码块内
    let prevIsList = false;     // 上一条是否是列表项（对应你最初的需求）
    let inBlockquote = false;   // 是否在引用块内
    let prevLine = '';          // 用于检测连续换行

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd(); // 保留行尾空格

        // 检测代码块开关
        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            result.push(line);
            continue;
        }

        // 检测引用块（以 > 开头）
        const isBlockquote = line.startsWith('>');
        if (isBlockquote) {
            inBlockquote = true;
        } else if (line === '') {
            inBlockquote = false; // 空行退出引用块
        }

        // 需要处理的逻辑
        if (!inCodeBlock && !inBlockquote) {
            // 判断列表项（匹配 - / 数字 / * 开头，允许缩进）
            const isList = /^[ \t]*([-*] |\d+\. |[a-z]\. )/.test(line);

            // 排除列表项本身
            if (isList) {
                prevIsList = true;
                result.push(line);
                continue;
            }

            // 排除列表项的下一行（你的条件2）
            if (prevIsList) {
                prevIsList = false;
                result.push(line);
                continue;
            }

            // 处理换行符逻辑
            if (line !== '' && i < lines.length - 1) {
                const nextLine = lines[i + 1].trim();
                // 满足：当前行非空、下一行非空、不是连续换行
                if (nextLine !== '' && line !== prevLine) {
                    result.push(line + '\\'); // 添加转义符
                    prevLine = line;
                    continue;
                }
            }
        }

        // 默认情况直接追加
        result.push(line);
        prevLine = line;
    }

    return result.join('\n');
}