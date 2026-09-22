import { ListTree } from 'lucide-react'
import type { HeadingItem } from '../types'

export function DocumentOutline({ headings, onJump }: { headings: HeadingItem[]; onJump: (line: number) => void }) {
  if (!headings.length) return null
  return (
    <aside className="outline" aria-label="Document outline">
      <div className="outline-title"><ListTree size={15} /> Outline</div>
      <div className="outline-items">
        {headings.map((heading) => (
          <button
            key={`${heading.id}-${heading.line}`}
            type="button"
            style={{ paddingLeft: `${10 + (heading.level - 1) * 12}px` }}
            onClick={() => onJump(heading.line)}
            title={heading.text}
          >
            {heading.text}
          </button>
        ))}
      </div>
    </aside>
  )
}
