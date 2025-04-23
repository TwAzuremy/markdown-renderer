import { escapeString } from "../../utils/StringUtils";

const restorer = {
    code(element) {
        const pre = element.querySelector("pre");
        const language = pre?.className.match(/language-(.+)/)?.[1] || "";

        return `\`\`\`${language}\n${pre?.textContent?.trim() ?? ""}\n\`\`\``;
    },
    blockquote(element, depth = 1) {
        const prefix = "> ".repeat(depth);
        return Array.from(element.children).map(child =>
            child.tagName === "BLOCKQUOTE" ?
                restorer.blockquote(child, depth + 1) :
                `${prefix}${elementParser(child.dataset.type, child)}`
        ).join(`\n${prefix}\n`);
    },
    custom(element) {
        const childrens = Array.from(element.children);

        const prefixTag = childrens[0].textContent;
        const suffixTag = childrens[2]?.textContent;

        const content = childrens[1] ? childrenParser(Array.from(childrens[1].children)) : "";

        return prefixTag + content + suffixTag;
    },
    hr(element) {
        return element.dataset.raw;
    },
    list(element, depth = 0) {
        const tagName = element.tagName;

        return Array.from(element.children)
            .map((li, index) =>
                restorer.listItem(li, depth, tagName === "OL", index))
            .join("\n\n");
    },
    listItem(liElement, depth, isOrdered = false, index) {
        const checkbox = liElement.querySelector("input[type=\"checkbox\"]");
        let prefix = (isOrdered ? `${index + 1}.` : "-") +
            (checkbox ? ` [${checkbox.checked ? "x" : " "}]` : "");

        const content = Array.from(liElement.children).map((children, index) => {
            if (checkbox && index === 0) return "";

            if (children.tagName === "UL" || children.tagName === "OL") {
                return "\n\n" + restorer.list(children, depth + 1);
            }

            return elementParser(children.dataset.type, children);
        }).join("");

        return "    ".repeat(depth) + prefix + " " + content;
    },
    heading(element) {
        const depth = parseInt(element.tagName.charAt(1), 10);

        return "#".repeat(depth) + " " + element.textContent;
    },
    paragraph(element) {
        return childrenParser(Array.from(element.children));
    },
    table(element) {
        const rows = Array.from(element.querySelectorAll("tr"));
        const [header, ...body] = rows;

        const headers = Array.from(header.children).map(th =>
            childrenParser(Array.from(th.children))
        ).join(" | ");

        const aligns = Array.from(header.children).map(th => {
            const align = th.align;

            return align === "center" ? ":---:" :
                align === "right" ? "---:" :
                    align === "left" ? ":---" : "---";
        }).join(" | ");

        const bodyContent = body.map(tr =>
            Array.from(tr.children).map(td =>
                childrenParser(Array.from(td.children))
            ).join(" | ")
        ).join(" |\n| ");

        return `| ${headers} |\n| ${aligns} |\n| ${bodyContent} |`;
    },
    br(element) {
        return element.dataset.purposes === "breaks" ? "  \n" : "[EMPTY]";
    },
    text(element) {
        const firstChild = element.firstElementChild;
        if (firstChild?.tagName === "BR") return restorer.br(firstChild);

        return escapeString(element.textContent);
    },
    default(element) {
        return escapeString(element.textContent);
    }
}

function childrenParser(children) {
    return children.map(child => elementParser(child.dataset.type, child)).join("");
}

export function elementParser(type, element) {
    const parser = restorer[type] || restorer.default;

    return parser(element);
}