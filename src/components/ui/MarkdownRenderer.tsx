import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!content) return null;

  // Split content by code blocks to separate formatted text and syntax highlighting block wrappers
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-slate-800 dark:text-slate-200 text-sm leading-relaxed tracking-wide">
      {parts.map((part, index) => {
        // Is this part a code block?
        if (part.startsWith("```")) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const language = match ? match[1] : "code";
          const codeText = match ? match[2].trim() : part.slice(3, -3).trim();

          return (
            <div
              key={index}
              className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 shadow-md max-w-full font-mono text-xs"
            >
              {/* Code block header */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-slate-400 font-sans text-[11px] font-semibold">
                <span className="uppercase tracking-widest">{language || "text"}</span>
                <button
                  onClick={() => handleCopyCode(codeText, index)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  title="Copy code to clipboard"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              {/* Code content */}
              <pre className="p-4 overflow-x-auto whitespace-pre leading-normal">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        }

        // Otherwise, render general formatted text block (split by line breaks for headers, lists, and paragraphs)
        const lines = part.split("\n");
        const renderedLines: React.ReactNode[] = [];
        let inList = false;
        let listItems: string[] = [];

        const flushList = (keyPrefix: number) => {
          if (listItems.length > 0) {
            renderedLines.push(
              <ul key={`list-${keyPrefix}`} className="list-disc pl-6 space-y-1.5 my-2">
                {listItems.map((li, liIdx) => (
                  <li key={liIdx} className="text-slate-700 dark:text-slate-300">
                    {parseInlineMarkdown(li)}
                  </li>
                ))}
              </ul>
            );
            listItems = [];
            inList = false;
          }
        };

        lines.forEach((line, lineIdx) => {
          const trimmed = line.trim();

          // 1. Headers (e.g. ###, ##, #)
          if (trimmed.startsWith("### ")) {
            flushList(lineIdx);
            renderedLines.push(
              <h3 key={lineIdx} className="text-base font-bold font-display text-slate-900 dark:text-white mt-4 mb-2">
                {parseInlineMarkdown(trimmed.slice(4))}
              </h3>
            );
          } else if (trimmed.startsWith("## ")) {
            flushList(lineIdx);
            renderedLines.push(
              <h2 key={lineIdx} className="text-lg font-bold font-display text-slate-900 dark:text-white mt-5 mb-2.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                {parseInlineMarkdown(trimmed.slice(3))}
              </h2>
            );
          } else if (trimmed.startsWith("# ")) {
            flushList(lineIdx);
            renderedLines.push(
              <h1 key={lineIdx} className="text-xl font-extrabold font-display text-slate-900 dark:text-white mt-6 mb-3">
                {parseInlineMarkdown(trimmed.slice(2))}
              </h1>
            );
          }
          // 2. Unordered lists (e.g. - , * )
          else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            inList = true;
            listItems.push(trimmed.slice(2));
          }
          // 3. Simple table rows (e.g. | col 1 | col 2 |)
          else if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            flushList(lineIdx);
            // Treat as raw structural row for now
            const cells = trimmed.split("|").map(c => c.trim()).filter(Boolean);
            const isHeader = lineIdx === 0 || (lines[lineIdx - 1] && lines[lineIdx - 1].startsWith("|-"));
            if (trimmed.includes("---")) {
              // skip alignment separator lines
              return;
            }
            renderedLines.push(
              <div key={lineIdx} className="overflow-x-auto my-1.5">
                <table className="min-w-full border-collapse border border-slate-200 dark:border-slate-800 text-xs">
                  <tbody>
                    <tr className={isHeader ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""}>
                      {cells.map((cell, cellIdx) => (
                        <td key={cellIdx} className="border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-300">
                          {parseInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          }
          // 4. Regular paragraphs / lines
          else if (trimmed === "") {
            flushList(lineIdx);
          } else {
            if (inList) {
              // continue listing if no blank line but doesn't start with bullet
              listItems.push(trimmed);
            } else {
              renderedLines.push(
                <p key={lineIdx} className="my-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {parseInlineMarkdown(trimmed)}
                </p>
              );
            }
          }
        });

        // Flush any trailing list items
        flushList(lines.length);

        return <div key={index}>{renderedLines}</div>;
      })}
    </div>
  );
}

/**
 * Parses simple inline styles like bold, links, inline code and lists
 */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split by inline code segments first: `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md font-mono text-xs bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 border border-slate-200/50 dark:border-slate-700/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Split by bold styles next: **bold**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={index}>
        {boldParts.map((bp, bpIdx) => {
          if (bp.startsWith("**") && bp.endsWith("**")) {
            return (
              <strong key={bpIdx} className="font-bold text-slate-900 dark:text-white">
                {parseLinksAndText(bp.slice(2, -2))}
              </strong>
            );
          }
          return <span key={bpIdx}>{parseLinksAndText(bp)}</span>;
        })}
      </span>
    );
  });
}

/**
 * Regex parses hyperlinks: [text](url)
 */
function parseLinksAndText(text: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }
    const [_, linkText, url] = match;
    parts.push(
      <a
        key={matchIndex}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-violet-600 dark:text-violet-400 hover:underline font-semibold"
      >
        {linkText}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
