import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { AppSettings, ThemeMode } from '../types'

interface Props {
  open: boolean
  settings: AppSettings
  onChange: (settings: AppSettings) => void
  onRestoreDraft: () => void
  onClose: () => void
}

export function SettingsDialog({ open, settings, onChange, onRestoreDraft, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => onChange({ ...settings, [key]: value })
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="dialog-header">
          <div><strong id="settings-title">Settings</strong><span>Editor, preview and privacy preferences</span></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
        </div>
        <div className="settings-grid">
          <label><span>Theme</span><select value={settings.theme} onChange={(e) => update('theme', e.target.value as ThemeMode)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
          <label><span>Editor font size</span><select value={settings.editorFontSize} onChange={(e) => update('editorFontSize', Number(e.target.value))}>{[12,13,14,15,16,18,20].map((v)=><option key={v}>{v}</option>)}</select></label>
          <label><span>Editor font</span><select value={settings.editorFontFamily} onChange={(e) => update('editorFontFamily', e.target.value)}><option>JetBrains Mono, Consolas, monospace</option><option>Fira Code, Consolas, monospace</option><option>Consolas, monospace</option><option>Monaco, monospace</option><option>ui-monospace, monospace</option></select></label>
          <label><span>Tab size</span><select value={settings.tabSize} onChange={(e) => update('tabSize', Number(e.target.value) as 2 | 4)}><option value={2}>2 spaces</option><option value={4}>4 spaces</option></select></label>
          <label><span>Preview font size</span><input type="range" min="13" max="22" value={settings.previewFontSize} onChange={(e) => update('previewFontSize', Number(e.target.value))} /><em>{settings.previewFontSize}px</em></label>
          <label><span>Preview line height</span><input type="range" min="1.3" max="2" step="0.05" value={settings.previewLineHeight} onChange={(e) => update('previewLineHeight', Number(e.target.value))} /><em>{settings.previewLineHeight.toFixed(2)}</em></label>
          <label><span>Preview max width</span><input type="range" min="600" max="1100" step="20" value={settings.previewMaxWidth} onChange={(e) => update('previewMaxWidth', Number(e.target.value))} /><em>{settings.previewMaxWidth}px</em></label>
          <Toggle label="Word wrap" checked={settings.wordWrap} onChange={(v) => update('wordWrap', v)} />
          <Toggle label="Auto save" checked={settings.autoSave} onChange={(v) => update('autoSave', v)} />
          <Toggle label="Sync scrolling" checked={settings.syncScroll} onChange={(v) => update('syncScroll', v)} />
        </div>
        <div className="dialog-footer">
          <button type="button" onClick={onRestoreDraft}>Restore saved draft</button>
          <span>Drafts are stored only in this browser.</span>
        </div>
      </section>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button className={`switch ${checked ? 'on' : ''}`} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  )
}
