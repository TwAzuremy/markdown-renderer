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

\`\`\`
<!-- 装配 Bean -->
<bean name="xxxMapperImpl" class="[package].dao.impl.xxxMapperImpl"/>
<bean name="xxxAspect" class="[package].aspect.xxxAspect"/>

<!-- 配置 aop -->
<aop:config>
    <!-- 在哪些地方 (包.类.方法) 做增加 -->
    <aop:pointcut id="xxxMapperImplPoint" expression="execution(* [package].dao.impl.xxxMapperImpl..*(..))"/>
    <!-- 做什么增强 -->
    <aop:aspect id="logAspect" ref="xxxAspect">
        <!-- 在什么时机 (方法前置 / 方法后置) -->
        <aop:around pointcut-ref="xxxMapperImplPoint" method="around"/>
    </aop:aspect>
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
