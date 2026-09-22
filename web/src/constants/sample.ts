export const SAMPLE_MARKDOWN = `# Markdown Converter Pro

Convert **Markdown** into beautifully formatted content — privately in your browser.

## Features

- Live Preview
- GitHub Flavored Markdown
- Syntax Highlighting
- Tables and Task Lists
- PDF and DOCX Export

## Task List

- [x] Write Markdown
- [x] Preview content
- [ ] Export document

## Code

\`\`\`javascript
function hello(name) {
  return \`Hello \${name}\`;
}

console.log(hello("Markdown"));
\`\`\`

## Table

| Feature | Status |
| --- | --- |
| Markdown | Ready |
| HTML | Ready |
| PDF | Ready |

> Markdown keeps structured writing simple, portable, and readable.
`

export const DEFAULT_SETTINGS = {
  theme: 'system',
  editorFontSize: 14,
  editorFontFamily: 'JetBrains Mono, Consolas, monospace',
  tabSize: 2,
  wordWrap: true,
  autoSave: true,
  syncScroll: true,
  previewFontSize: 16,
  previewLineHeight: 1.72,
  previewMaxWidth: 860,
} as const
