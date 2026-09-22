import { CheckCircle2, CircleAlert, Info } from 'lucide-react'
import type { ToastMessage } from '../types'

export function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'error' ? CircleAlert : toast.tone === 'success' ? CheckCircle2 : Info
        return <div key={toast.id} className={`toast ${toast.tone ?? 'default'}`}><Icon size={17} /><span>{toast.text}</span></div>
      })}
    </div>
  )
}
