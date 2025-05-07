import { elementParser } from "./ElementParser";

export class HTML {
    /**
     * Revert the HTML DOM to a markdown list of paragraph strings split by paragraph.
     * If the editor itself is passed, then the child elements are traversed for parsing, otherwise it is parsed directly.
     * 
     * @param {HTMLElement} element 
     * @returns {[String]} 
     */
    static async parse(element) {
        if (!element.classList.contains("markdown-editor")) return [this.parseParagraph(element)];

        const paragraphs = Array.from(element.children);

        const result = paragraphs.map(paragraph => {
            return this.parseParagraph(paragraph);
        });

        return result;
    }

    /**
     * Parsing paragraphs.
     * 
     * @param {HTMLElement} paragraphElement 
     * @returns {string} markdown paragraph string.
     */
    static parseParagraph(paragraphElement) {
        const type = paragraphElement.dataset.type;

        return elementParser(type, paragraphElement);
    }
}