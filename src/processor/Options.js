import { tokenizer } from "./renderer/Tokenizer";
import { renderer } from "./renderer/TokensRenderer";

export const RENDER_OPTIONS = {
    async: true,
    pedantic: true,
    breaks: true,
    gfm: true,
    renderer,
    tokenizer
}