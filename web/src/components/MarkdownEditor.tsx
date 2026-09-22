import { useMemo, useRef, type MutableRefObject } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import type { AppSettings } from '../types'
import type { InsertAction } from './MarkdownToolbar'

interface Props {
  value: string
  onChange: (value: string) => void
  settings: AppSettings
  dark: boolean
  onScrollRatio?: (ratio: number) => void
  editorRef?: MutableRefObject<ReactCodeMirrorRef | null>
}

export function MarkdownEditor({ value, onChange, settings, dark, onScrollRatio, editorRef }: Props) {
  const localRef = useRef<ReactCodeMirrorRef | null>(null)
  const ref = editorRef ?? localRef
  const extensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    settings.wordWrap ? EditorView.lineWrapping : [],
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: `${settings.editorFontSize}px`,
        fontFamily: settings.editorFontFamily,
      },
      '.cm-scroller': { overflow: 'auto', lineHeight: '1.65' },
      '.cm-content': { padding: '16px 18px' },
      '.cm-gutters': { backgroundColor: 'transparent', borderRight: '1px solid var(--border)' },
    }),
    EditorView.updateListener.of((update) => {
      if (!update.view.scrollDOM || !onScrollRatio) return
      const element = update.view.scrollDOM
      const denominator = element.scrollHeight - element.clientHeight
      const ratio = denominator <= 0 ? 0 : element.scrollTop / denominator
      onScrollRatio(Math.max(0, Math.min(1, ratio)))
    }),
  ], [settings.editorFontSize, settings.editorFontFamily, settings.wordWrap, onScrollRatio])

  return (
    <CodeMirror
      ref={ref}
      value={value}
      height="100%"
      extensions={extensions}
      theme={dark ? oneDark : 'light'}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        searchKeymap: true,
        tabSize: settings.tabSize,
      }}
      onChange={onChange}
      aria-label="Markdown editor"
    />
  )
}

export function applyInsertAction(ref: ReactCodeMirrorRef | null, action: InsertAction): void {
  const view = ref?.view
  if (!view) return
  const range = view.state.selection.main
  const selected = view.state.sliceDoc(range.from, range.to)
  const templates: Record<InsertAction, { before: string; after: string; fallback: string }> = {
    heading: { before: '# ', after: '', fallback: 'Heading' },
    bold: { before: '**', after: '**', fallback: 'bold text' },
    italic: { before: '*', after: '*', fallback: 'italic text' },
    strike: { before: '~~', after: '~~', fallback: 'strikethrough' },
    code: { before: '`', after: '`', fallback: 'code' },
    link: { before: '[', after: '](https://example.com)', fallback: 'link text' },
    image: { before: '![', after: '](https://example.com/image.png)', fallback: 'alt text' },
    quote: { before: '> ', after: '', fallback: 'Quote' },
    bullet: { before: '- ', after: '', fallback: 'List item' },
    ordered: { before: '1. ', after: '', fallback: 'List item' },
    task: { before: '- [ ] ', after: '', fallback: 'Task' },
    table: { before: '', after: '', fallback: '| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |' },
    rule: { before: '\n---\n', after: '', fallback: '' },
  }
  const template = templates[action]
  const body = selected || template.fallback
  const replacement = `${template.before}${body}${template.after}`
  const cursorFrom = range.from + template.before.length
  const cursorTo = cursorFrom + body.length
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: replacement },
    selection: selected ? { anchor: cursorFrom, head: cursorTo } : { anchor: cursorFrom, head: cursorTo },
  })
  view.focus()
}
