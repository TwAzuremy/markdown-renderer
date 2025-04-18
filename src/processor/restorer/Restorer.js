import { elementParser } from "./ElementParser";

export class HTML {
    /**
     * @param {HTMLElement} element 
     */
    static async parse(element) {
        const paragraphs = Array.from(element.children);

        const result = paragraphs.map(paragraph => {
            return this.parseParagraph(paragraph);
        });

        return result;
    }

    static parseParagraph(paragraphElement) {
        const type = paragraphElement.dataset.type;

        return elementParser(type, paragraphElement);
    }
}