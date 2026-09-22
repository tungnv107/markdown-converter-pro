import { extractTitle, markdownToHtml, markdownToText, slugify } from './markdown'

export function downloadBlob(content: BlobPart, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function suggestedFilename(markdown: string, extension: string): string {
  return `${slugify(extractTitle(markdown)) || 'document'}.${extension}`
}

export async function exportMarkdown(markdown: string): Promise<void> {
  downloadBlob(markdown, suggestedFilename(markdown, 'md'), 'text/markdown;charset=utf-8')
}

export async function exportText(markdown: string): Promise<void> {
  downloadBlob(await markdownToText(markdown), suggestedFilename(markdown, 'txt'), 'text/plain;charset=utf-8')
}

export async function exportHtml(markdown: string): Promise<void> {
  const body = await markdownToHtml(markdown)
  const title = extractTitle(markdown)
  const documentHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${exportCss}</style></head><body><main>${body}</main></body></html>`
  downloadBlob(documentHtml, suggestedFilename(markdown, 'html'), 'text/html;charset=utf-8')
}

export async function exportPdf(markdown: string): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default
  const target = document.createElement('article')
  target.className = 'pdf-export-document'
  target.innerHTML = await markdownToHtml(markdown)
  Object.assign(target.style, {
    width: '794px', padding: '48px 54px', color: '#16181d', background: '#fff',
    fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.65',
  })
  document.body.appendChild(target)
  try {
    await html2pdf().set({
      margin: [12, 12, 14, 12],
      filename: suggestedFilename(markdown, 'pdf'),
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['pre', 'table', 'blockquote'] },
    }).from(target).save()
  } finally {
    target.remove()
  }
}

export async function exportDocx(markdown: string): Promise<void> {
  const docx = await import('docx')
  const children = buildDocxChildren(markdown, docx)
  const documentFile = new docx.Document({
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{
          level: 0,
          format: docx.LevelFormat.DECIMAL,
          text: '%1.',
          alignment: docx.AlignmentType.START,
          style: { paragraph: { indent: { left: 720, hanging: 260 } } },
        }],
      }],
    },
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children,
    }],
  })
  const blob = await docx.Packer.toBlob(documentFile)
  downloadBlob(blob, suggestedFilename(markdown, 'docx'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}

function buildDocxChildren(markdown: string, docx: typeof import('docx')): Array<import('docx').Paragraph | import('docx').Table> {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const output: Array<import('docx').Paragraph | import('docx').Table> = []
  let inCode = false
  let code: string[] = []

  const flushCode = () => {
    if (!code.length) return
    output.push(new docx.Paragraph({
      children: [new docx.TextRun({ text: code.join('\n'), font: 'Consolas', size: 20 })],
      shading: { type: docx.ShadingType.CLEAR, fill: 'F3F4F6' },
      spacing: { before: 160, after: 160 },
    }))
    code = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (/^```/.test(line)) {
      if (inCode) flushCode()
      inCode = !inCode
      continue
    }
    if (inCode) {
      code.push(line)
      continue
    }

    if (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const header = parseTableRow(line)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(parseTableRow(lines[index]))
        index += 1
      }
      index -= 1
      output.push(new docx.Table({
        width: { size: 100, type: docx.WidthType.PERCENTAGE },
        rows: [
          new docx.TableRow({
            children: header.map((cell) => new docx.TableCell({
              children: [new docx.Paragraph({ children: [new docx.TextRun({ text: cell, bold: true })] })],
            })),
          }),
          ...rows.map((row) => new docx.TableRow({
            children: row.map((cell) => new docx.TableCell({
              children: [new docx.Paragraph({ children: inlineRuns(cell, docx) })],
            })),
          })),
        ],
      }))
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      const levels = [docx.HeadingLevel.HEADING_1, docx.HeadingLevel.HEADING_2, docx.HeadingLevel.HEADING_3]
      output.push(new docx.Paragraph({ heading: levels[heading[1].length - 1], children: inlineRuns(heading[2], docx) }))
      continue
    }

    const unordered = /^\s*[-*+]\s+(.+)$/.exec(line)
    if (unordered) {
      output.push(new docx.Paragraph({ bullet: { level: 0 }, children: inlineRuns(unordered[1], docx) }))
      continue
    }

    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line)
    if (ordered) {
      output.push(new docx.Paragraph({ numbering: { reference: 'default-numbering', level: 0 }, children: inlineRuns(ordered[1], docx) }))
      continue
    }

    const quote = /^>\s?(.+)$/.exec(line)
    if (quote) {
      output.push(new docx.Paragraph({ indent: { left: 540 }, children: inlineRuns(quote[1], docx) }))
      continue
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      output.push(new docx.Paragraph({ border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: 'C7CBD1' } } }))
      continue
    }

    output.push(new docx.Paragraph({ children: inlineRuns(line, docx), spacing: { after: line ? 100 : 20 } }))
  }
  flushCode()
  return output
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
}

function inlineRuns(value: string, docx: typeof import('docx')): import('docx').TextRun[] {
  const parts = value.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) return new docx.TextRun({ text: part.slice(2, -2), bold: true })
    if (part.startsWith('*') && part.endsWith('*')) return new docx.TextRun({ text: part.slice(1, -1), italics: true })
    if (part.startsWith('`') && part.endsWith('`')) return new docx.TextRun({ text: part.slice(1, -1), font: 'Consolas', shading: { type: docx.ShadingType.CLEAR, fill: 'F3F4F6' } })
    return new docx.TextRun(part)
  })
}

function escapeHtml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[char] ?? char))
}

const exportCss = `body{margin:0;color:#1f2328;background:#fff;font:16px/1.65 system-ui,sans-serif}main{max-width:840px;margin:0 auto;padding:48px 24px}h1,h2,h3{line-height:1.25}pre{overflow:auto;padding:16px;background:#f6f8fa;border-radius:8px}code{font-family:ui-monospace,monospace}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d0d7de;padding:8px 12px;text-align:left}blockquote{margin-left:0;padding-left:16px;border-left:4px solid #d0d7de;color:#59636e}img{max-width:100%}`
