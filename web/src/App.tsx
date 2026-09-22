import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { redo, undo } from '@codemirror/commands'
import { openSearchPanel } from '@codemirror/search'
import { FilePlus2, FileUp, FolderOpen, LoaderCircle, Maximize2, Redo2, Search, Trash2, Undo2 } from 'lucide-react'
import { AppHeader } from './components/AppHeader'
import { ConverterSelector } from './components/ConverterSelector'
import { MarkdownToolbar, type InsertAction } from './components/MarkdownToolbar'
import { MarkdownEditor, applyInsertAction } from './components/MarkdownEditor'
import { PreviewPanel } from './components/PreviewPanel'
import { DocumentOutline } from './components/DocumentOutline'
import { SettingsDialog } from './components/SettingsDialog'
import { ToastStack } from './components/Toast'
import { SeoSection } from './components/SeoSection'
import { SAMPLE_MARKDOWN, DEFAULT_SETTINGS } from './constants/sample'
import { usePersistentState } from './hooks/usePersistentState'
import { calculateDocumentStats, convertText, extractHeadings, sanitizeHtml } from './services/markdown'
import { importFile, SUPPORTED_FILE_ACCEPT } from './services/file'
import { downloadBlob, exportDocx, exportHtml, exportMarkdown, exportPdf, exportText, suggestedFilename } from './services/export'
import type { AppSettings, Format, ToastMessage } from './types'

const DRAFT_KEY = 'markdown-converter-pro:draft'
const SETTINGS_KEY = 'markdown-converter-pro:settings'

function readInitialRoute(): { from: Format; to: Format } {
  const params = new URLSearchParams(window.location.search)
  const rawFrom = params.get('from')
  const rawTo = params.get('to')
  const from: Format = rawFrom && ['markdown', 'html', 'text', 'pdf', 'docx', 'json', 'xml', 'csv'].includes(rawFrom) ? rawFrom as Format : 'markdown'
  const path = window.location.pathname
  const pathMap: Record<string, { from: Format; to: Format }> = {
    '/markdown-to-html': { from: 'markdown', to: 'html' },
    '/html-to-markdown': { from: 'html', to: 'markdown' },
    '/markdown-to-pdf': { from: 'markdown', to: 'pdf' },
    '/markdown-to-docx': { from: 'markdown', to: 'docx' },
    '/pdf-to-markdown': { from: 'pdf', to: 'markdown' },
    '/docx-to-markdown': { from: 'docx', to: 'markdown' },
    '/json-to-markdown': { from: 'json', to: 'markdown' },
    '/xml-to-markdown': { from: 'xml', to: 'markdown' },
    '/csv-to-markdown': { from: 'csv', to: 'markdown' },
    '/markdown-editor': { from: 'markdown', to: 'html' },
  }
  if (pathMap[path]) return pathMap[path]
  const to: Format = rawTo && ['markdown', 'html', 'text', 'json', 'xml', 'pdf', 'docx'].includes(rawTo) ? rawTo as Format : 'html'
  return { from, to }
}

export default function App() {
  const initialRoute = useMemo(readInitialRoute, [])
  const [settingsRaw, setSettingsRaw] = usePersistentState<Partial<AppSettings>>(SETTINGS_KEY, DEFAULT_SETTINGS)
  const settings: AppSettings = { ...DEFAULT_SETTINGS, ...settingsRaw }
  const setSettings = (value: AppSettings) => setSettingsRaw(value)
  const initialDraft = localStorage.getItem(DRAFT_KEY)
  const startsWithFileInput = ['pdf', 'docx', 'json', 'xml', 'csv'].includes(initialRoute.from)
  const [content, setContent] = useState(startsWithFileInput ? '' : (initialDraft ?? SAMPLE_MARKDOWN))
  const [from, setFrom] = useState<Format>(initialRoute.from)
  const [to, setTo] = useState<Format>(initialRoute.to)
  const [html, setHtml] = useState('')
  const [output, setOutput] = useState('')
  const [previewMode, setPreviewMode] = useState<'preview' | 'source'>('preview')
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor')
  const [split, setSplit] = useState(50)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [scrollRatio, setScrollRatio] = useState(0)
  const [isDirty, setIsDirty] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editorRef = useRef<ReactCodeMirrorRef | null>(null)
  const editorPanelRef = useRef<HTMLElement | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const previewPanelRef = useRef<HTMLDivElement | null>(null)

  const dark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const stats = useMemo(() => calculateDocumentStats(content), [content])
  const headings = useMemo(() => ['markdown', 'pdf', 'docx'].includes(from) ? extractHeadings(content) : [], [content, from])

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'default') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, text, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 2400)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    const labels: Record<Format, string> = {
      markdown: 'Markdown',
      html: 'HTML',
      text: 'Plain Text',
      json: 'JSON',
      xml: 'XML',
      csv: 'CSV',
      pdf: 'PDF',
      docx: 'DOCX',
    }
    document.title = `${labels[from]} to ${labels[to]} Converter | Markdown Converter Pro`
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (meta) meta.content = `Convert ${labels[from]} to ${labels[to]} locally in your browser with live preview and private document processing.`

    const routePaths = new Set([
      '/markdown-to-html', '/html-to-markdown', '/markdown-to-pdf', '/markdown-to-docx', '/markdown-editor',
      '/pdf-to-markdown', '/docx-to-markdown', '/json-to-markdown', '/xml-to-markdown', '/csv-to-markdown',
    ])
    if (!routePaths.has(window.location.pathname)) {
      const url = new URL(window.location.href)
      url.searchParams.set('from', from)
      url.searchParams.set('to', to)
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [from, to])

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const sourceHtml = from === 'html'
          ? sanitizeHtml(content)
          : await convertText(content, from, 'html')
        setHtml(sourceHtml)
        if (to === 'pdf' || to === 'docx') {
          setOutput(sourceHtml)
        } else {
          setOutput(await convertText(content, from, to))
        }
      } catch (error) {
        setOutput(error instanceof Error ? error.message : 'Unable to convert document.')
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [content, from, to])

  useEffect(() => {
    if (!settings.autoSave) return
    if (['pdf', 'docx', 'json', 'xml', 'csv'].includes(from) && !content) return
    const timer = window.setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, content)
      setIsDirty(false)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [content, from, settings.autoSave])

  const updateContent = (value: string) => {
    setContent(value)
    setIsDirty(true)
  }

  const handleFromChange = (value: Format) => {
    setFrom(value)
    setSourceFileName(null)
    if (['pdf', 'docx', 'json', 'xml', 'csv'].includes(value)) {
      setTo('markdown')
      setContent('')
    }
    if (value === 'html' && to === 'html') setTo('markdown')
    if (value === 'text' && to === 'text') setTo('markdown')
  }

  const handleSwap = async () => {
    if (!['markdown', 'html', 'text'].includes(to)) return
    try {
      const converted = await convertText(content, from, to)
      const nextFrom = to
      const nextTo = from
      setContent(converted)
      setFrom(nextFrom)
      setTo(nextTo)
      notify('Formats swapped', 'success')
    } catch {
      notify('This conversion cannot be reversed.', 'error')
    }
  }

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(previewMode === 'source' || !['html', 'pdf', 'docx'].includes(to) ? output : output)
      notify('Copied to clipboard', 'success')
    } catch {
      notify('Unable to copy to clipboard.', 'error')
    }
  }

  const downloadCurrent = async () => {
    try {
      const markdownSource = from === 'markdown' ? content : await convertText(content, from, 'markdown')
      if (to === 'html') {
        if (from === 'markdown') await exportHtml(content)
        else downloadBlob(output, suggestedFilename(markdownSource, 'html'), 'text/html;charset=utf-8')
      } else if (to === 'text') {
        if (from === 'markdown') await exportText(content)
        else downloadBlob(output, suggestedFilename(markdownSource, 'txt'), 'text/plain;charset=utf-8')
      } else if (to === 'pdf') await exportPdf(markdownSource)
      else if (to === 'docx') await exportDocx(markdownSource)
      else if (to === 'json') downloadBlob(output, suggestedFilename(markdownSource, 'json'), 'application/json;charset=utf-8')
      else if (to === 'xml') downloadBlob(output, suggestedFilename(markdownSource, 'xml'), 'application/xml;charset=utf-8')
      else await exportMarkdown(output)
      notify('Download started', 'success')
    } catch {
      notify('Unable to export document. Please try again.', 'error')
    }
  }

  const openFile = async (file: File) => {
    setIsImporting(true)
    setSourceFileName(file.name)
    try {
      const imported = await importFile(file)
      setContent(imported.content)
      setFrom(imported.format)
      setTo(imported.format === 'markdown' ? 'html' : 'markdown')
      setSourceFileName(imported.fileName)
      notify(`Opened ${file.name}`, 'success')
    } catch (error) {
      setSourceFileName(null)
      notify(error instanceof Error ? error.message : 'Unable to open this file.', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard.read) {
        setContent(await navigator.clipboard.readText())
        notify('Clipboard pasted', 'success')
        return
      }
      const items = await navigator.clipboard.read()
      const htmlItem = items.find((item) => item.types.includes('text/html'))
      if (htmlItem) {
        const blob = await htmlItem.getType('text/html')
        const htmlText = await blob.text()
        setContent(await convertText(htmlText, 'html', 'markdown'))
        setFrom('markdown')
        setTo('html')
      } else {
        setContent(await navigator.clipboard.readText())
      }
      notify('Clipboard pasted', 'success')
    } catch {
      notify('Clipboard access was not available.', 'error')
    }
  }

  const jumpToLine = (line: number) => {
    const view = editorRef.current?.view
    if (!view) return
    const docLine = view.state.doc.line(Math.min(line, view.state.doc.lines))
    view.dispatch({ selection: { anchor: docLine.from }, scrollIntoView: true })
    view.focus()
  }

  const onToolbarAction = (action: InsertAction) => applyInsertAction(editorRef.current, action)

  const resizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = workspaceRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const onMove = (move: PointerEvent) => {
      const next = ((move.clientX - rect.left) / rect.width) * 100
      setSplit(Math.min(72, Math.max(28, next)))
    }
    const done = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', done)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', done)
    event.preventDefault()
  }

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        void (async () => {
          try {
            const markdown = from === 'markdown' ? content : await convertText(content, from, 'markdown')
            await exportMarkdown(markdown)
            notify('Markdown downloaded', 'success')
          } catch {
            notify('Unable to download Markdown.', 'error')
          }
        })()
      }
      if (event.key.toLowerCase() === 'b') { event.preventDefault(); onToolbarAction('bold') }
      if (event.key.toLowerCase() === 'i') { event.preventDefault(); onToolbarAction('italic') }
      if (event.key.toLowerCase() === 'k') { event.preventDefault(); onToolbarAction('link') }
      if (event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); setMobileTab((tab) => tab === 'editor' ? 'preview' : 'editor') }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  })

  const cycleTheme = () => {
    const next = settings.theme === 'system' ? 'light' : settings.theme === 'light' ? 'dark' : 'system'
    setSettings({ ...settings, theme: next })
  }

  return (
    <>
    <div className="app-shell">
      <AppHeader theme={settings.theme} onThemeCycle={cycleTheme} onSettings={() => setSettingsOpen(true)} />
      <ConverterSelector from={from} to={to} onFromChange={handleFromChange} onToChange={setTo} onSwap={handleSwap} onAttachFile={() => fileInputRef.current?.click()} />

      <main className="main-area" id="editor">
        <div className="mobile-tabs">
          <button className={mobileTab === 'editor' ? 'active' : ''} type="button" onClick={() => setMobileTab('editor')}>Editor</button>
          <button className={mobileTab === 'preview' ? 'active' : ''} type="button" onClick={() => setMobileTab('preview')}>Preview</button>
        </div>

        <div
          className="workspace"
          ref={workspaceRef}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files[0]
            if (file) void openFile(file)
          }}
        >
          <section ref={editorPanelRef} className={`workspace-panel editor-panel mobile-${mobileTab === 'editor' ? 'show' : 'hide'}`} style={{ width: `${split}%` }}>
            <div className="panel-heading">
              <div><strong>{formatLabel(from)}{sourceFileName ? ` · ${sourceFileName}` : ''}</strong><span>{isDirty && !settings.autoSave ? '● Unsaved' : 'Saved locally'}</span></div>
              <div className="panel-actions">
                <button className="toolbar-icon" type="button" onClick={() => { setContent(''); setIsDirty(true) }} aria-label="New document" title="New"><FilePlus2 size={16} /></button>
                <button className="toolbar-icon" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Open file" title="Open file"><FolderOpen size={16} /></button>
                <button className="toolbar-icon desktop-only" type="button" onClick={() => { const view = editorRef.current?.view; if (view) undo(view) }} aria-label="Undo" title="Undo"><Undo2 size={16} /></button>
                <button className="toolbar-icon desktop-only" type="button" onClick={() => { const view = editorRef.current?.view; if (view) redo(view) }} aria-label="Redo" title="Redo"><Redo2 size={16} /></button>
                <button className="toolbar-icon desktop-only" type="button" onClick={() => { const view = editorRef.current?.view; if (view) openSearchPanel(view) }} aria-label="Find and replace" title="Find and replace"><Search size={16} /></button>
                <button className="toolbar-icon" type="button" onClick={() => { if (content && window.confirm('Clear the editor?')) updateContent('') }} aria-label="Clear editor" title="Clear"><Trash2 size={16} /></button>
                <button className="toolbar-icon desktop-only" type="button" onClick={() => editorPanelRef.current?.requestFullscreen()} aria-label="Fullscreen editor" title="Fullscreen editor"><Maximize2 size={16} /></button>
              </div>
            </div>
            {['markdown', 'pdf', 'docx'].includes(from) && <MarkdownToolbar onAction={onToolbarAction} />}
            <div className="editor-stack">
              {isImporting ? (
                <div className="file-drop-state importing" role="status" aria-live="polite">
                  <LoaderCircle className="spin" size={32} />
                  <strong>Converting file to Markdown…</strong>
                  <span>{sourceFileName ?? 'Reading document locally in your browser.'}</span>
                </div>
              ) : (from === 'pdf' || from === 'docx') && !content ? (
                <button className="file-drop-state" type="button" onClick={() => fileInputRef.current?.click()}>
                  <FileUp size={32} />
                  <strong>Attach a {formatLabel(from)} file</strong>
                  <span>Click to choose a file, or drag and drop it into this workspace.</span>
                </button>
              ) : (
                <>
                  <MarkdownEditor value={content} onChange={updateContent} settings={settings} dark={dark} onScrollRatio={setScrollRatio} editorRef={editorRef} />
                  <DocumentOutline headings={headings} onJump={jumpToLine} />
                </>
              )}
            </div>
            <div className="status-bar">
              <span>Lines {stats.lines}</span><span>Words {stats.words}</span><span>Characters {stats.characters}</span>
              <span className="status-spacer" />
              <button type="button" onClick={handlePaste}>Paste</button>
              <span>{stats.readingMinutes ? `${stats.readingMinutes} min read` : '0 min read'}</span>
            </div>
          </section>

          <div className="split-handle desktop-only" onPointerDown={resizeStart} role="separator" aria-orientation="vertical" aria-label="Resize editor and preview" />

          <div ref={previewPanelRef} className={`preview-wrap mobile-${mobileTab === 'preview' ? 'show' : 'hide'}`} style={{ width: `${100 - split}%` }}>
            <PreviewPanel
              html={html}
              source={output}
              markdown={content}
              mode={previewMode}
              to={to}
              settings={settings}
              scrollRatio={scrollRatio}
              onModeChange={setPreviewMode}
              onCopy={copyOutput}
              onDownload={downloadCurrent}
              onFullscreen={() => previewPanelRef.current?.requestFullscreen()}
            />
          </div>
        </div>
      </main>

      <footer id="tools" className="app-footer">
        <span>Markdown Converter Pro · Privacy-first Markdown tools.</span>
        <nav aria-label="Footer navigation">
          <a href="#privacy">Privacy</a>
          <a href="https://github.com/microsoft/markitdown" target="_blank" rel="noreferrer">GitHub</a>
          <a href="#converter-page-title">About</a>
        </nav>
      </footer>

      <div className="mobile-action-bar">
        <button type="button" className={mobileTab === 'editor' ? 'active' : ''} onClick={() => setMobileTab('editor')}>Edit</button>
        <button type="button" className={mobileTab === 'preview' ? 'active' : ''} onClick={() => setMobileTab('preview')}>Preview</button>
        <button type="button" onClick={copyOutput}>Copy</button>
        <button type="button" onClick={downloadCurrent}>Export</button>
      </div>

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept={SUPPORTED_FILE_ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void openFile(file)
          event.currentTarget.value = ''
        }}
      />
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onRestoreDraft={() => {
          const draft = localStorage.getItem(DRAFT_KEY)
          if (draft === null) {
            notify('No saved draft was found.')
            return
          }
          setContent(draft)
          setIsDirty(false)
          notify('Saved draft restored', 'success')
          setSettingsOpen(false)
        }}
        onClose={() => setSettingsOpen(false)}
      />
      <ToastStack toasts={toasts} />
    </div>
    <SeoSection from={from} to={to} />
    </>
  )
}

function formatLabel(format: Format): string {
  const labels: Record<Format, string> = {
    markdown: 'Markdown',
    html: 'HTML',
    text: 'Plain Text',
    json: 'JSON',
    xml: 'XML',
    csv: 'CSV',
    pdf: 'PDF (extracted Markdown)',
    docx: 'DOCX (extracted Markdown)',
  }
  return labels[format]
}
