import { Github, Moon, Settings, Sun } from 'lucide-react'
import type { ThemeMode } from '../types'

interface Props {
  theme: ThemeMode
  onThemeCycle: () => void
  onSettings: () => void
}

export function AppHeader({ theme, onThemeCycle, onSettings }: Props) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">M↓</div>
        <div className="brand-copy">
          <strong>Markdown Converter Pro</strong>
          <span>Local · Privacy-first</span>
        </div>
      </div>
      <nav className="header-nav" aria-label="Primary navigation">
        <a href="#converter">Converter</a>
        <a href="#editor">Editor</a>
        <a href="#tools">Tools</a>
      </nav>
      <div className="header-actions">
        <a className="icon-button" href="https://github.com/microsoft/markitdown" target="_blank" rel="noreferrer" aria-label="Open Microsoft MarkItDown on GitHub" title="GitHub">
          <Github size={18} />
        </a>
        <button className="icon-button" type="button" onClick={onSettings} aria-label="Open settings" title="Settings">
          <Settings size={18} />
        </button>
        <button className="icon-button" type="button" onClick={onThemeCycle} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  )
}
