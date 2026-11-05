import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: ReactNode
  icono?: ReactNode
  children: ReactNode
  pie?: ReactNode
  ancho?: string
}

export function Modal({ abierto, onCerrar, titulo, icono, children, pie, ancho = 'max-w-md' }: Props) {
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true"
        className={`animate-fade-in w-full ${ancho} rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          {icono}
          <h2 className="flex-1 text-lg font-bold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{pie}</div>}
      </div>
    </div>
  )
}
