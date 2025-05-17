import "./css/markdown-editor.scss";

import { memo, useEffect, useRef, useState } from "react";
import { Markdown } from "../processor/renderer/Renderer";

const MarkdownEditor = memo(({ src }) => {
    const editorRef = useRef(null);
    const [paragraphs, setParagraphs] = useState("");

    useEffect(() => {
        ; (async () => {
            const parts = await Markdown.parse(src);
            const accumulatedContent = parts.join("");

            requestAnimationFrame(() => setParagraphs(accumulatedContent));
        })();
    }, [src]);

    return (
        <div
            className={"markdown-editor"}
            ref={editorRef}
            dangerouslySetInnerHTML={{ __html: paragraphs }}
            suppressContentEditableWarning
            contentEditable>
        </div>
    );
});

export default MarkdownEditor;