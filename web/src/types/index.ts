export type TextFormat = 'markdown' | 'html' | 'text' | 'json' | 'xml' | 'csv'
export type ExportFormat = 'pdf' | 'docx'
export type Format = TextFormat | ExportFormat
export type ThemeMode = 'light' | 'dark' | 'system'

export interface HeadingItem {
  id: string
  level: number
  text: string
  line: number
}

export interface DocumentStats {
  words: number
  characters: number
  lines: number
  readingMinutes: number
}

export interface AppSettings {
  theme: ThemeMode
  editorFontSize: number
  editorFontFamily: string
  tabSize: 2 | 4
  wordWrap: boolean
  autoSave: boolean
  syncScroll: boolean
  previewFontSize: number
  previewLineHeight: number
  previewMaxWidth: number
}

export interface ToastMessage {
  id: number
  text: string
  tone?: 'default' | 'success' | 'error'
}
