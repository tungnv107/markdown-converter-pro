import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import DOMPurify from 'dompurify'
import type { DocumentStats, Format, HeadingItem } from '../types'

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeHighlight)
  .use(rehypeStringify)

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
})
turndown.use(gfm)
turndown.remove(['script', 'style', 'iframe', 'object'])

export async function markdownToHtml(markdown: string): Promise<string> {
  return String(await markdownProcessor.process(markdown))
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(sanitizeHtml(html))
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['srcdoc'],
  })
}

export async function markdownToText(markdown: string): Promise<string> {
  const html = await markdownToHtml(markdown)
  return htmlToPlainText(html)
}

export function htmlToPlainText(html: string): string {
  const container = document.createElement('div')
  container.innerHTML = sanitizeHtml(html)

  container.querySelectorAll('br').forEach((element) => element.replaceWith(document.createTextNode('\n')))
  container.querySelectorAll('th, td').forEach((element) => element.append(document.createTextNode('\t')))
  container.querySelectorAll('h1,h2,h3,h4,h5,h6,p,div,li,blockquote,pre,tr,hr').forEach((element) => {
    element.append(document.createTextNode('\n'))
  })

  return (container.textContent ?? '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\t+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function plainTextToMarkdown(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n')
}

export function jsonToMarkdown(input: string): string {
  let value: unknown
  try {
    value = JSON.parse(input)
  } catch {
    throw new Error('Invalid JSON. Please check the file or pasted content.')
  }
  return renderJsonValue(value, 1, 'JSON Document').trim()
}

export function xmlToMarkdown(input: string): string {
  const parser = new DOMParser()
  const documentNode = parser.parseFromString(input, 'application/xml')
  if (documentNode.querySelector('parsererror')) {
    throw new Error('Invalid XML. Please check the file or pasted content.')
  }
  return renderXmlElement(documentNode.documentElement, 1).trim()
}

export function csvToMarkdown(input: string): string {
  const rows = parseCsv(input)
  if (!rows.length) return ''
  const width = Math.max(...rows.map((row) => row.length))
  const normalized = rows.map((row) => [...row, ...Array(Math.max(0, width - row.length)).fill('')])
  const header = normalized[0]
  const body = normalized.slice(1)
  const escapeCell = (cell: string) => cell.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
  return [
    `| ${header.map(escapeCell).join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  ].join('\n')
}

export function extractHeadings(markdown: string): HeadingItem[] {
  return markdown.split(/\r?\n/).flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) return []
    const text = match[2].replace(/[*_`~\[\]]/g, '').trim()
    return [{
      id: slugify(text) || `heading-${index + 1}`,
      level: match[1].length,
      text,
      line: index + 1,
    }]
  })
}

export function calculateDocumentStats(value: string): DocumentStats {
  const normalized = value.trim()
  const words = normalized ? normalized.split(/\s+/u).filter(Boolean).length : 0
  return {
    words,
    characters: value.length,
    lines: value ? value.split(/\r?\n/).length : 1,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / 220)),
  }
}

export function extractTitle(markdown: string): string {
  return extractHeadings(markdown).find((item) => item.level === 1)?.text ?? 'document'
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function convertText(input: string, from: Format, to: Format): Promise<string> {
  if (to === 'pdf' || to === 'docx') {
    throw new Error(`${to.toUpperCase()} is an export format.`)
  }

  const markdown = from === 'markdown' || from === 'pdf' || from === 'docx'
    ? input
    : from === 'html'
      ? htmlToMarkdown(input)
      : from === 'text'
        ? plainTextToMarkdown(input)
        : from === 'json'
          ? jsonToMarkdown(input)
          : from === 'xml'
            ? xmlToMarkdown(input)
            : from === 'csv'
              ? csvToMarkdown(input)
              : (() => { throw new Error(`Input format ${from} is not supported.`) })()

  if (to === 'markdown') return markdown
  if (to === 'html') return markdownToHtml(markdown)
  if (to === 'text') return markdownToText(markdown)

  const text = await markdownToText(markdown)
  if (to === 'json') {
    return JSON.stringify({ title: extractTitle(markdown), markdown, text }, null, 2)
  }
  if (to === 'xml') {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n  <title>${escapeXml(extractTitle(markdown))}</title>\n  <content>${escapeXml(text)}</content>\n</document>`
  }
  throw new Error(`Conversion from ${from} to ${to} is not supported.`)
}

function renderJsonValue(value: unknown, level: number, label?: string): string {
  const safeLevel = Math.min(level, 6)
  const heading = label ? `${'#'.repeat(safeLevel)} ${escapeMarkdownInline(label)}\n\n` : ''

  if (isScalar(value)) return `${heading}${formatScalar(value)}\n\n`

  if (Array.isArray(value)) {
    if (value.length && value.every((item) => isPlainRecord(item))) {
      const records = value as Array<Record<string, unknown>>
      const keys = [...new Set(records.flatMap((record) => Object.keys(record)))]
      if (keys.length && records.every((record) => keys.every((key) => isScalar(record[key])))) {
        return `${heading}${renderRecordTable(records, keys)}\n\n`
      }
    }
    return `${heading}${value.map((item, index) => {
      if (isScalar(item)) return `- ${formatScalar(item)}`
      return renderJsonValue(item, safeLevel + 1, `Item ${index + 1}`)
    }).join('\n\n')}\n\n`
  }

  const record = value as Record<string, unknown>
  return `${heading}${Object.entries(record).map(([key, item]) => {
    if (isScalar(item)) return `- **${escapeMarkdownInline(key)}:** ${formatScalar(item)}`
    return renderJsonValue(item, safeLevel + 1, key)
  }).join('\n\n')}\n\n`
}

function renderXmlElement(element: Element, level: number): string {
  const safeLevel = Math.min(level, 6)
  const attributes = [...element.attributes]
    .map((attribute) => `- **${escapeMarkdownInline(attribute.name)}:** ${escapeMarkdownInline(attribute.value)}`)
  const directText = [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
  const parts = [`${'#'.repeat(safeLevel)} ${escapeMarkdownInline(element.tagName)}`]
  if (attributes.length) parts.push(attributes.join('\n'))
  if (directText) parts.push(directText)
  for (const child of [...element.children]) parts.push(renderXmlElement(child, safeLevel + 1))
  return `${parts.join('\n\n')}\n\n`
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      cell = ''
      if (row.some((value) => value.length)) rows.push(row)
      row = []
    } else {
      cell += char
    }
  }
  row.push(cell.trim())
  if (row.some((value) => value.length)) rows.push(row)
  return rows
}

function renderRecordTable(records: Array<Record<string, unknown>>, keys: string[]): string {
  const escape = (value: unknown) => formatScalar(value).replace(/\|/g, '\\|')
  return [
    `| ${keys.map(escapeMarkdownInline).join(' | ')} |`,
    `| ${keys.map(() => '---').join(' | ')} |`,
    ...records.map((record) => `| ${keys.map((key) => escape(record[key])).join(' | ')} |`),
  ].join('\n')
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isScalar(value: unknown): boolean {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

function formatScalar(value: unknown): string {
  if (value === null) return '`null`'
  if (typeof value === 'string') return escapeMarkdownInline(value)
  return `\`${String(value)}\``
}

function escapeMarkdownInline(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+.!|>-])/g, '\\$1')
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  }[char] ?? char))
}
