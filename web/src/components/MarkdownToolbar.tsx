import {
  Bold, Code2, Heading1, Image, Italic, Link, List, ListChecks, ListOrdered,
  Minus, Quote, Strikethrough, Table2,
} from 'lucide-react'

export type InsertAction = 'heading' | 'bold' | 'italic' | 'strike' | 'code' | 'link' | 'image' | 'quote' | 'bullet' | 'ordered' | 'task' | 'table' | 'rule'

const actions: Array<{ id: InsertAction; label: string; icon: typeof Bold }> = [
  { id: 'heading', label: 'Heading', icon: Heading1 },
  { id: 'bold', label: 'Bold', icon: Bold },
  { id: 'italic', label: 'Italic', icon: Italic },
  { id: 'strike', label: 'Strikethrough', icon: Strikethrough },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'link', label: 'Link', icon: Link },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'quote', label: 'Quote', icon: Quote },
  { id: 'bullet', label: 'Bullet list', icon: List },
  { id: 'ordered', label: 'Numbered list', icon: ListOrdered },
  { id: 'task', label: 'Task list', icon: ListChecks },
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'rule', label: 'Horizontal rule', icon: Minus },
]

export function MarkdownToolbar({ onAction }: { onAction: (action: InsertAction) => void }) {
  return (
    <div className="markdown-toolbar" role="toolbar" aria-label="Markdown formatting">
      {actions.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className="toolbar-icon" onClick={() => onAction(id)} aria-label={label} title={label}>
          <Icon size={16} />
        </button>
      ))}
    </div>
  )
}
