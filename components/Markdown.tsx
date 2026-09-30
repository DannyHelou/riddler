'use client';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** Plain Markdown (prompts, hints). No KaTeX here: math renders in the debrief only (§6.5). */
export function Md({ children, className, style }: { children: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`md ${className ?? ''}`} style={style}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

/** Markdown with KaTeX math, for the debrief's "Show the math". */
export function MathMd({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`md math-block ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}>
        {children.replace(/\$\$([^$]+?)\$\$/g, (_m, tex: string) => `\n\n$$\n${tex.trim()}\n$$\n\n`)}
      </ReactMarkdown>
    </div>
  );
}
