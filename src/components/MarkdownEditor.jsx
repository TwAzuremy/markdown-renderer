import "./css/markdown-editor.scss";

import { memo, useEffect, useRef, useState } from "react";
import { Markdown } from "../processor/renderer/Renderer";
import { HTML } from "../processor/restorer/Restorer";

const MarkdownEditor = memo(({ src }) => {
    const editorRef = useRef(null);
    const [content, setContent] = useState(null);

    useEffect(() => {
        ; (async () => {
            const parts = await Markdown.parse(src);
            const accumulatedContent = parts.join("");

            requestAnimationFrame(() => setContent(accumulatedContent));
        })();
    }, [src]);

    // TODO [TEST] Used only for test data, this code will be deleted when the test is completed.
    // Note: This uses a null judgment, and removes this code if you want to test rendering null data.
    useEffect(() => {
        if (content) {
            ; (async () => {
                const src = await HTML.parse(editorRef.current);
                console.log(src);
            })();
        }
    }, [content]);

    return (
        <div
            className={"markdown-editor"}
            ref={editorRef}
            contentEditable
            dangerouslySetInnerHTML={{ __html: content }}></div>
    );
});

export default MarkdownEditor;