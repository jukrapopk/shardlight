import { useState, type ReactNode } from 'react';
import { copyToClipboard } from './clipboard';

/**
 * A tiny JS/JSX highlighter. Each alternative names the token class it maps to
 * (`.tok-<group>`); anything between matches is left as plain text. Ordered so
 * strings and comments win over the punctuation that appears inside them.
 */
const TOKEN =
  /(?<comment>\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(?<string>'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(?<tag>[A-Z][\w$]*)|(?<keyword>\b(?:import|from|const|let|var|function|return|new|true|false|null|undefined|export|default)\b)|(?<call>[a-zA-Z_$][\w$]*(?=\())|(?<key>[a-zA-Z_$][\w$]*(?=\s*[:=](?!=)))|(?<number>\b\d+(?:\.\d+)?\b)|(?<punct>[{}()[\];,.<>/=:+\-*!])/g;

/** Split a snippet into coloured tokens. */
function highlight(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(code.slice(cursor, index));

    const token = Object.entries(match.groups ?? {}).find(([, value]) => value !== undefined);
    nodes.push(
      token ? (
        <span key={key++} className={`tok tok-${token[0]}`}>
          {match[0]}
        </span>
      ) : (
        match[0]
      ),
    );
    cursor = index + match[0].length;
  }

  if (cursor < code.length) nodes.push(code.slice(cursor));
  return nodes;
}

/** A highlighted code block with a copy button tucked into its top strip. */
export function Code({ code, wrap = false }: { code: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await copyToClipboard(code)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className={wrap ? 'code wrap' : 'code'}>
      <button type="button" className="code-copy" onClick={copy} aria-label="Copy code">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>{highlight(code)}</pre>
    </div>
  );
}
