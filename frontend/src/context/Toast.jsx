import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-leaf-600" />,
  error: <XCircle className="h-5 w-5 text-alert" />,
  info: <Info className="h-5 w-5 text-ink-soft" />,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((type, message) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t.slice(-2), { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3800)
  }, [])

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex max-w-md animate-rise items-start gap-3 rounded-2xl border border-paper-edge bg-white px-4 py-3 text-[15px] shadow-lift">
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
