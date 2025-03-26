import './App.css';
import MarkdownEditor from './components/MarkdownEditor';

const markdown = `# Hello World

**This is Bold Text**
*This is Italic Text*

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
