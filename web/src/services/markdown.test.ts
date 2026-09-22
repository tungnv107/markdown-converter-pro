import { describe, expect, it } from 'vitest'
import { calculateDocumentStats, csvToMarkdown, extractHeadings, htmlToMarkdown, jsonToMarkdown, markdownToHtml, markdownToText, sanitizeHtml, slugify, xmlToMarkdown } from './markdown'

describe('markdown service', () => {
  it('renders GFM and removes unsafe HTML', async () => {
    const html = await markdownToHtml('# Title\n\n- [x] Done\n\n<script>alert(1)</script>')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('type="checkbox"')
    expect(html).not.toContain('<script>')
  })

  it('converts HTML to Markdown', () => {
    expect(htmlToMarkdown('<h2>Hello</h2><p><strong>World</strong></p>')).toContain('## Hello')
    expect(htmlToMarkdown('<strong>World</strong>')).toContain('**World**')
  })

  it('sanitizes unsafe HTML', () => {
    const safe = sanitizeHtml('<img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a>')
    expect(safe).not.toContain('onerror')
    expect(safe).not.toContain('<script')
    expect(safe).not.toContain('javascript:')
  })

  it('converts Markdown to plain text', async () => {
    const text = await markdownToText('# Hello\n\n**World**')
    expect(text).toMatch(/Hello\n+World/)
    expect(text).not.toContain('**')
  })

  it('extracts headings with line positions', () => {
    expect(extractHeadings('# A\ntext\n## B')).toEqual([
      { id: 'a', level: 1, text: 'A', line: 1 },
      { id: 'b', level: 2, text: 'B', line: 3 },
    ])
  })

  it('calculates document statistics', () => {
    expect(calculateDocumentStats('one two\nthree')).toMatchObject({ words: 3, characters: 13, lines: 2 })
  })

  it('creates safe filenames from Vietnamese titles', () => {
    expect(slugify('Hướng dẫn Markdown Đẹp')).toBe('huong-dan-markdown-dep')
  })

  it('converts structured JSON to Markdown', () => {
    const markdown = jsonToMarkdown(JSON.stringify({ title: 'Guide', items: [{ name: 'A', status: true }, { name: 'B', status: false }] }))
    expect(markdown).toContain('JSON Document')
    expect(markdown).toContain('title')
    expect(markdown).toContain('| name | status |')
  })

  it('converts XML elements and attributes to Markdown', () => {
    const markdown = xmlToMarkdown('<catalog version="1"><book><title>Markdown</title></book></catalog>')
    expect(markdown).toContain('# catalog')
    expect(markdown).toContain('version')
    expect(markdown).toContain('## book')
    expect(markdown).toContain('### title')
  })

  it('converts CSV to a GFM table', () => {
    const markdown = csvToMarkdown('Name,Role\nAlice,Developer\nBob,Designer')
    expect(markdown).toContain('| Name | Role |')
    expect(markdown).toContain('| Alice | Developer |')
  })
})
