import { Highlight, themes } from 'prism-react-renderer';

export default function Code({ code, language = 'javascript', marked = [] }) {
  const lines = new Set(marked);
  return (
    <Highlight theme={themes.vsDark} code={code.replace(/\n$/, '')} language={language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={`code ${className}`} style={style}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })} className={lines.has(i + 1) ? 'line marked' : 'line'}>
              <span className="ln">{i + 1}</span>
              {line.map((token, k) => <span key={k} {...getTokenProps({ token })} />)}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
