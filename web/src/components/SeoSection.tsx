import { LockKeyhole, Zap } from 'lucide-react'
import type { Format } from '../types'

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

export function SeoSection({ from, to }: { from: Format; to: Format }) {
  const fromLabel = labels[from]
  const toLabel = labels[to]
  return (
    <section className="seo-section" aria-labelledby="converter-page-title">
      <div className="seo-inner">
        <div className="seo-kicker"><Zap size={14} /> Fast, local conversion</div>
        <h1 id="converter-page-title">{fromLabel} to {toLabel} Converter</h1>
        <p className="seo-lead">
          Convert {fromLabel} to {toLabel} directly in your browser with live preview,
          clean document export, and no account required.
        </p>
        <div className="seo-grid">
          <div id="privacy">
            <h2>Private by design</h2>
            <p><LockKeyhole size={16} /> Core editing, conversion, import and export run locally in the browser.</p>
          </div>
          <div>
            <h2>GitHub Flavored Markdown</h2>
            <p>Tables, task lists, strikethrough, autolinks and highlighted fenced code blocks are supported.</p>
          </div>
        </div>
        <div className="faq">
          <h2>Frequently asked questions</h2>
          <details>
            <summary>Is my document uploaded?</summary>
            <p>No. The core converter processes document content in your browser and stores autosave drafts in localStorage.</p>
          </details>
          <details>
            <summary>Can I download the converted document?</summary>
            <p>Yes. Markdown, HTML, plain text, PDF and DOCX downloads are available from the converter.</p>
          </details>
          <details>
            <summary>Does it support content pasted from Microsoft Word?</summary>
            <p>Yes. Rich HTML clipboard content is cleaned and converted to Markdown while preserving common document structure.</p>
          </details>
          <details>
            <summary>Can I open a DOCX file?</summary>
            <p>Yes. DOCX import is converted locally through HTML and normalized into Markdown for editing.</p>
          </details>
        </div>
      </div>
    </section>
  )
}
