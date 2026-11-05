// Componentes de estado: carga, error, vacío y alertas en línea
import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

export function Spinner({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-navy-600">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm font-medium">{texto}</span>
    </div>
  )
}

export function ErrorState({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <AlertCircle className="h-10 w-10 text-carmesi" />
      <p className="max-w-md text-sm text-slate-600">{mensaje}</p>
      {onReintentar && (
        <Button variante="secundario" onClick={onReintentar} icono={<RefreshCw className="h-4 w-4" />}>Reintentar</Button>
      )}
    </div>
  )
}

export function EmptyState({ icono, titulo, texto, accion }: { icono: ReactNode; titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-navy-300">{icono}</div>
      <h3 className="text-xl font-bold">{titulo}</h3>
      <p className="max-w-md text-sm text-slate-500">{texto}</p>
      {accion}
    </div>
  )
}

type TipoAlerta = 'error' | 'exito' | 'info'
const ALERTAS: Record<TipoAlerta, { clase: string; Icono: typeof Info }> = {
  error: { clase: 'border-red-200 bg-red-50 text-red-800', Icono: AlertCircle },
  exito: { clase: 'border-green-200 bg-green-50 text-green-800', Icono: CheckCircle2 },
  info: { clase: 'border-navy-200 bg-navy-50 text-navy-800', Icono: Info },
}

export function Alerta({ tipo = 'info', children }: { tipo?: TipoAlerta; children: ReactNode }) {
  const { clase, Icono } = ALERTAS[tipo]
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${clase}`}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  )
}
