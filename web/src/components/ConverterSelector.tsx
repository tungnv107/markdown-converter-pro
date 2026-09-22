import { ArrowLeftRight, Paperclip, ShieldCheck } from 'lucide-react'
import type { Format } from '../types'

const inputFormats: Array<{ value: Format; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'text', label: 'Plain Text' },
  { value: 'pdf', label: 'PDF file' },
  { value: 'docx', label: 'DOCX file' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'csv', label: 'CSV' },
]

const outputFormats: Array<{ value: Format; label: string }> = [
  { value: 'html', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'text', label: 'Plain Text' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
]

interface Props {
  from: Format
  to: Format
  onFromChange: (value: Format) => void
  onToChange: (value: Format) => void
  onSwap: () => void
  onAttachFile: () => void
}

export function ConverterSelector({ from, to, onFromChange, onToChange, onSwap, onAttachFile }: Props) {
  const reversible = ['markdown', 'html', 'text'].includes(from) && ['markdown', 'html', 'text'].includes(to)
  return (
    <section className="converter-bar" id="converter" aria-label="Converter options">
      <div className="converter-fields">
        <label>
          <span>Input</span>
          <select value={from} onChange={(event) => onFromChange(event.target.value as Format)}>
            {inputFormats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <button className="swap-button" type="button" onClick={onSwap} disabled={!reversible} aria-label="Swap input and output formats" title="Swap formats">
          <ArrowLeftRight size={17} />
        </button>
        <label>
          <span>Output</span>
          <select value={to} onChange={(event) => onToChange(event.target.value as Format)}>
            {outputFormats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <button className="attach-button" type="button" onClick={onAttachFile} aria-label="Attach input file" title="Attach PDF, DOCX, JSON, XML, CSV, HTML, TXT or Markdown file">
          <Paperclip size={16} />
          <span>Attach file</span>
        </button>
      </div>
      <div className="privacy-note"><ShieldCheck size={16} /> Your document is processed locally in your browser.</div>
    </section>
  )
}
