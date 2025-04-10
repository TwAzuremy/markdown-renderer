import './App.css';
import MarkdownEditor from './components/MarkdownEditor';

const markdown = `# Hello World

This is **Bold Text**
This is *Italic Text*


> Hello
>
> World
> > This is a nested blockquote

- Line 1
    Sub Line

- Line 2

1. Line 1
    Sub Line

1. Line 2

Inline Text
\`Code span\`

\`\`\`xml
<!-- 装配 Bean -->
<bean name="xxxMapperImpl" class="[package].dao.impl.xxxMapperImpl"/>
<bean name="xxxAspect" class="[package].aspect.xxxAspect"/>

<!-- 配置 aop -->
<aop:config>
    Hello World
</aop:config>
\`\`\``;

function App() {
    return (
        <div className="App">
            <MarkdownEditor src={markdown} />
        </div>
    );
}

export default App;
