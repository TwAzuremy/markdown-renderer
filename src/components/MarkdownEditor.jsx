import "./css/markdown-editor.scss";

import { memo, useEffect, useRef, useState } from "react";
import ContentEditable from 'react-contenteditable';
import { Markdown } from "../processor/renderer/Renderer";

const MarkdownEditor = memo(({ src }) => {
    const editorRef = useRef(null);
    const [content, setContent] = useState(null);

    useEffect(() => {
        (async () => {
            const parts = await Markdown.parse(src);
            const accumulatedContent = parts.join("");

            requestAnimationFrame(() => setContent(accumulatedContent));
        })();
    }, [src]);

    return (
        <ContentEditable
            className={"markdown-editor"}
            innerRef={editorRef}
            html={content}
            tagName={"div"}
        />
    );
});

export default MarkdownEditor;