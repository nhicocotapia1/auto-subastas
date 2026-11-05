import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'exito' | 'peligro' | 'fantasma'
type Tamano = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
  icono?: ReactNode
}

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-navy-700 text-white hover:bg-navy-800 shadow-sm',
  secundario: 'border border-navy-300 bg-white text-navy-700 hover:bg-navy-50',
  exito: 'bg-exito text-white hover:bg-green-700 shadow-sm',
  peligro: 'border border-red-300 bg-white text-carmesi hover:bg-red-50',
  fantasma: 'text-navy-700 hover:bg-navy-50',
}
const TAMANOS: Record<Tamano, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export function Button({ variante = 'primario', tamano = 'md', cargando, icono, children, className = '', disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`}
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : icono}
      {children}
    </button>
  )
}
