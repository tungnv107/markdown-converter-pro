import { Clipboard, Code2, Download, Eye, Maximize2 } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import type { AppSettings, Format } from '../types'

interface Props {
  html: string
  source: string
  markdown: string
  mode: 'preview' | 'source'
  to: Format
  settings: AppSettings
  scrollRatio: number
  onModeChange: (mode: 'preview' | 'source') => void
  onCopy: () => void
  onDownload: () => void
  onFullscreen: () => void
}

export function PreviewPanel({ html, source, markdown, mode, to, settings, scrollRatio, onModeChange, onCopy, onDownload, onFullscreen }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const canRender = to === 'markdown' || to === 'html' || to === 'pdf' || to === 'docx'
  const renderedHtml = useMemo(() => decorateCodeBlocks(html), [html])

  useEffect(() => {
    if (!settings.syncScroll || mode !== 'preview' || !ref.current) return
    const element = ref.current
    const max = element.scrollHeight - element.clientHeight
    if (max > 0) element.scrollTop = max * scrollRatio
  }, [scrollRatio, settings.syncScroll, mode])

  return (
    <section className="workspace-panel preview-panel" aria-label="Converted output">
      <div className="panel-heading">
        <div>
          <strong>{canRender ? 'Preview' : to.toUpperCase()}</strong>
          <span>{to === 'html' || to === 'markdown' ? 'Rendered output' : 'Converted output'}</span>
        </div>
        <div className="panel-actions">
          {canRender && (
            <div className="segmented" aria-label="Preview display mode">
              <button className={mode === 'preview' ? 'active' : ''} type="button" onClick={() => onModeChange('preview')}><Eye size={15} /> Preview</button>
              <button className={mode === 'source' ? 'active' : ''} type="button" onClick={() => onModeChange('source')}><Code2 size={15} /> Source</button>
            </div>
          )}
          <button className="toolbar-icon" type="button" onClick={onCopy} aria-label="Copy output" title="Copy output"><Clipboard size={16} /></button>
          <button className="toolbar-icon" type="button" onClick={onDownload} aria-label="Download output" title="Download"><Download size={16} /></button>
          <button className="toolbar-icon desktop-only" type="button" onClick={onFullscreen} aria-label="Fullscreen output" title="Fullscreen"><Maximize2 size={16} /></button>
        </div>
      </div>
      <div
        ref={ref}
        className="preview-scroll"
        style={{ fontSize: `${settings.previewFontSize}px`, lineHeight: settings.previewLineHeight }}
        onClick={(event) => {
          const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy-code]')
          if (!button) return
          const code = button.closest('.code-block')?.querySelector('pre code')?.textContent ?? ''
          void navigator.clipboard.writeText(code).then(() => {
            const original = button.textContent
            button.textContent = 'Copied'
            window.setTimeout(() => { button.textContent = original }, 1200)
          })
        }}
      >
        {!markdown.trim() ? (
          <div className="empty-state">
            <Code2 size={30} />
            <strong>Nothing to preview yet</strong>
            <span>Start typing Markdown on the left.</span>
          </div>
        ) : canRender && mode === 'preview' ? (
          <article className="markdown-body" style={{ maxWidth: settings.previewMaxWidth }} dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        ) : (
          <pre className="source-view"><code>{source}</code></pre>
        )}
      </div>
    </section>
  )
}

function decorateCodeBlocks(html: string): string {
  if (!html || typeof DOMParser === 'undefined') return html
  const documentNode = new DOMParser().parseFromString(`<main>${html}</main>`, 'text/html')
  documentNode.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code')
    if (!code || pre.parentElement?.classList.contains('code-block')) return
    const languageClass = [...code.classList].find((item) => item.startsWith('language-'))
    const language = languageClass?.slice('language-'.length) || 'text'
    const wrapper = documentNode.createElement('div')
    wrapper.className = 'code-block'
    const header = documentNode.createElement('div')
    header.className = 'code-block-header'
    const label = documentNode.createElement('span')
    label.textContent = language
    const copy = documentNode.createElement('button')
    copy.type = 'button'
    copy.setAttribute('data-copy-code', 'true')
    copy.setAttribute('aria-label', `Copy ${language} code`)
    copy.textContent = 'Copy'
    header.append(label, copy)
    pre.replaceWith(wrapper)
    wrapper.append(header, pre)
  })
  return documentNode.querySelector('main')?.innerHTML ?? html
}
