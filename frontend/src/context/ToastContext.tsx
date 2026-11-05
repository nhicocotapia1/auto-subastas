// Notificaciones globales (éxito / error / info) para informar el resultado de cada acción
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tipo = 'exito' | 'error' | 'info'
interface Toast { id: number; tipo: Tipo; mensaje: string }
interface ToastCtx { notificar: (mensaje: string, tipo?: Tipo) => void }

const Ctx = createContext<ToastCtx>({ notificar: () => {} })

const ESTILOS: Record<Tipo, { clase: string; Icono: typeof Info }> = {
  exito: { clase: 'border-green-200 bg-green-50 text-green-800', Icono: CheckCircle2 },
  error: { clase: 'border-red-200 bg-red-50 text-red-800', Icono: XCircle },
  info: { clase: 'border-navy-200 bg-navy-50 text-navy-800', Icono: Info },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const cerrar = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  const notificar = useCallback((mensaje: string, tipo: Tipo = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-3), { id, tipo, mensaje }])
    setTimeout(() => cerrar(id), tipo === 'error' ? 6000 : 4000)
  }, [])

  return (
    <Ctx.Provider value={{ notificar }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-3 sm:items-end sm:pr-6" aria-live="polite">
        {toasts.map(({ id, tipo, mensaje }) => {
          const { clase, Icono } = ESTILOS[tipo]
          return (
            <div key={id} role={tipo === 'error' ? 'alert' : 'status'}
              className={`animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg ${clase}`}>
              <Icono className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1">{mensaje}</p>
              <button onClick={() => cerrar(id)} aria-label="Cerrar notificación" className="opacity-60 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(Ctx)
