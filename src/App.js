import './App.css';

import MarkdownEditor from './components/MarkdownEditor';

const markdown = `# Markdown Example

---

**Bold Text**
*Italic Text*
***Bold and Italic***

~~Delete Line~~
<u>Under Line</u>

[LINK](https://markdown.com.cn/basic-syntax/ "Markdown Tutorials")

![IMAGE](https://t.alcy.cc/pc "From ALCY")

- Unordered Listings ( Element 1 )

    - Sublists ( Element 1 )

    - Sublists ( Element 2 )

- Unordered Listings ( Element 2 )

1. Ordered Lists

2. Ordered Lists

- [x] Task 1

- [ ] Task 2

> Blockquote
>
> > Sub Blockquote

\`Inline Code\`

\`\`\`java
public class Test {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
\`\`\`

| Id   |  Username  | Description |
| :--- | :--------: | ----------: |
| 01   |   Azuremy  |  developers |
| 02   | Baka Yufan |      mascot |`;

function App() {
    return (
        <div className="App">
            <MarkdownEditor src={markdown} />
        </div>
    );
}

export default App;
