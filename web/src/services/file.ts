import { htmlToMarkdown } from './markdown'
import type { Format } from '../types'

const textExtensions = new Set(['md', 'markdown', 'txt', 'html', 'htm', 'json', 'xml', 'csv'])

export const SUPPORTED_FILE_ACCEPT = '.md,.markdown,.txt,.html,.htm,.pdf,.docx,.json,.xml,.csv'
export const MAX_IMPORT_FILE_SIZE_MB = 50

export interface ImportedFile {
  content: string
  format: Format
  fileName: string
}

export async function importFile(file: File): Promise<ImportedFile> {
  if (file.size > MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum supported size is ${MAX_IMPORT_FILE_SIZE_MB} MB.`)
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (extension === 'pdf') {
    return { content: await pdfToMarkdown(file), format: 'pdf', fileName: file.name }
  }

  if (extension === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    return { content: htmlToMarkdown(result.value), format: 'docx', fileName: file.name }
  }

  if (!textExtensions.has(extension)) throw new Error('This file format is not supported.')
  const content = await file.text()
  if (extension === 'html' || extension === 'htm') return { content, format: 'html', fileName: file.name }
  if (extension === 'txt') return { content, format: 'text', fileName: file.name }
  if (extension === 'json') return { content, format: 'json', fileName: file.name }
  if (extension === 'xml') return { content, format: 'xml', fileName: file.name }
  if (extension === 'csv') return { content, format: 'csv', fileName: file.name }
  return { content, format: 'markdown', fileName: file.name }
}

async function pdfToMarkdown(file: File): Promise<string> {
  const pdfjs = await loadPdfJs()
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_URL

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await loadingTask.promise
  const sections: string[] = [`# ${stripExtension(file.name)}`]

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const lines = new Map<number, Array<{ x: number; text: string }>>()

    for (const item of textContent.items) {
      if (!('str' in item) || !('transform' in item) || !item.str.trim()) continue
      const x = item.transform[4]
      const y = Math.round(item.transform[5] / 3) * 3
      const line = lines.get(y) ?? []
      line.push({ x, text: item.str })
      lines.set(y, line)
    }

    const pageText = [...lines.entries()]
      .sort(([yA], [yB]) => yB - yA)
      .map(([, items]) => items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim())
      .filter(Boolean)
      .join('\n\n')

    sections.push(`## Page ${pageNumber}\n\n${pageText || '_No extractable text found on this page._'}`)
  }

  return sections.join('\n\n')
}

const PDF_JS_VERSION = '4.10.38'
const PDF_JS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.min.mjs`
const PDF_JS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.worker.min.mjs`

interface PdfJsModule {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument(options: { data: Uint8Array }): { promise: Promise<PdfDocument> }
}

interface PdfDocument {
  numPages: number
  getPage(pageNumber: number): Promise<PdfPage>
}

interface PdfPage {
  getTextContent(): Promise<{ items: PdfTextContentItem[] }>
}

type PdfTextContentItem =
  | { str: string; transform: number[] }
  | { type: string }

async function loadPdfJs(): Promise<PdfJsModule> {
  try {
    return await import(/* @vite-ignore */ PDF_JS_MODULE_URL) as PdfJsModule
  } catch {
    throw new Error('Unable to load the PDF converter. Check your internet connection and try again.')
  }
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'PDF document'
}
