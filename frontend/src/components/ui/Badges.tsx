// Etiquetas semánticas: el color siempre va acompañado de texto explícito (sección 7.1)
import { ESTADO_SUBASTA, NIVEL_DANIO, TIPO_LOTE } from '../../lib/format'

export function DanioBadge({ nivel, solido = false }: { nivel?: string | null; solido?: boolean }) {
  if (!nivel || !NIVEL_DANIO[nivel]) return null
  const n = NIVEL_DANIO[nivel]
  if (solido) {
    const fondo = nivel === 'leve' ? 'bg-exito' : nivel === 'medio' ? 'bg-ambar' : 'bg-carmesi'
    return <span className={`chip ${fondo} text-white shadow`}>{n.texto}</span>
  }
  return (
    <span className={`chip ${n.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${n.punto}`} />
      {n.texto}
    </span>
  )
}

export function TipoBadge({ tipo }: { tipo: string }) {
  return <span className="chip bg-navy-700 text-white">{TIPO_LOTE[tipo] ?? tipo}</span>
}

export function EstadoBadge({ estado }: { estado: string }) {
  const e = ESTADO_SUBASTA[estado] ?? { texto: estado, clase: 'bg-slate-100 text-slate-600' }
  return <span className={`chip ${e.clase}`}>{e.texto}</span>
}
