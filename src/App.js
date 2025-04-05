import './App.css';
import MarkdownEditor from './components/MarkdownEditor';

const markdown = `# Hello World

**This is Bold Text**
*This is Italic Text*

- Line 1
    Sub Line
    - Line 2

- [x] Check 1
    Sub Check
    - [ ] Check 2

1. Line 1
    Sub Line
    1. Line 2

Inline Text
\`Code span\``;

function App() {
    return (
        <div className="App">
            <MarkdownEditor src={markdown} />
        </div>
    );
}

export default App;
