import "./css/markdown-editor.scss";

import { Fragment, memo, useEffect, useRef, useState } from "react";
import parse from 'html-react-parser';
import { Markdown } from "../processor/renderer/Renderer";

const MarkdownEditor = memo(({
    src,
    loadingComponent,
    errorComponent,
    settings = { chunkSize: 5 }
}) => {
    const editorRef = useRef(null);

    const [chunks, setChunks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const renderChunks = async () => {
            try {
                const parts = await Markdown.parse(src);

                const renderNextChunk = (index = 0) => {
                    // If the component is unmounted or we've reached the end of the chunks, stop the process
                    if (!isMounted || index >= parts.length) {
                        setIsLoading(false);
                        return;
                    }

                    // Determine the end index for the current chunk
                    const endIndex = Math.min(index + settings.chunkSize, parts.length);

                    // Append the current chunk to the chunks state
                    setChunks(prev => [...prev, ...parts.slice(index, endIndex)]);
                    // Request the next animation frame to continue rendering the next chunk
                    requestAnimationFrame(() => renderNextChunk(endIndex));
                }

                renderNextChunk();
            } catch (error) {
                if (isMounted) {
                    setIsLoading(false);
                    setIsError(true);
                }
            }
        }

        renderChunks();

        // Cleanup function to set the isMounted flag to false when the component is unmounted
        return () => {
            isMounted = false;
        }
    }, [src]);

    return (
        <div
            className={"markdown-editor"}
            ref={editorRef}
            suppressContentEditableWarning
            contentEditable={!isLoading}>
            {/* TODO: The more sloppy Loading and Error forms will be redesigned in the future. */}
            {isLoading &&
                <div className={"markdown-renderer__loading"}>
                    {loadingComponent || <p>Loading...</p>}
                </div>}
            {isError &&
                <div className={"markdown-renderer__error"}>
                    {errorComponent || <p>Error loading content</p>}
                </div>}
            {chunks.map((html, index) => (
                <Fragment key={index}>
                    {parse(html)}
                </Fragment>
            ))}
        </div>
    );
});

export default MarkdownEditor;