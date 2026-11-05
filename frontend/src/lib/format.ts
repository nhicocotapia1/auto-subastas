// Utilidades de formato (pesos chilenos, fechas y textos)

export const clp = (n: number | null | undefined) =>
  n == null ? '—' : '$' + Math.round(n).toLocaleString('es-CL')

export const fecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const fechaHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

/** "hace 5 min", "hace 2 h" */
export function haceCuanto(iso: string): string {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seg < 60) return 'hace un momento'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  return `hace ${Math.floor(seg / 86400)} d`
}

/** Tiempo restante en formato 03h 24m 06s (o 2d 05h 10m) */
export function tiempoRestante(iso: string, ahora = Date.now()): { texto: string; terminado: boolean; urgente: boolean } {
  const ms = new Date(iso).getTime() - ahora
  if (ms <= 0) return { texto: 'Finalizada', terminado: true, urgente: false }
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const p = (x: number) => String(x).padStart(2, '0')
  const texto = d > 0 ? `${d}d ${p(h)}h ${p(m)}m` : `${p(h)}h ${p(m)}m ${p(ss)}s`
  return { texto, terminado: false, urgente: ms < 3600 * 1000 }
}

export const NIVEL_DANIO: Record<string, { texto: string; clase: string; punto: string }> = {
  leve: { texto: 'Leve', clase: 'bg-green-50 text-exito ring-1 ring-green-200', punto: 'bg-exito' },
  medio: { texto: 'Medio', clase: 'bg-amber-50 text-ambar ring-1 ring-amber-200', punto: 'bg-ambar' },
  perdida_total: { texto: 'Pérdida total', clase: 'bg-red-50 text-carmesi ring-1 ring-red-200', punto: 'bg-carmesi' },
}

export const TIPO_LOTE: Record<string, string> = {
  vehiculo_completo: 'Vehículo completo',
  pieza_desarme: 'Pieza desarme',
}

export const ESTADO_SUBASTA: Record<string, { texto: string; clase: string }> = {
  activa: { texto: 'Activa', clase: 'bg-green-50 text-exito ring-1 ring-green-200' },
  finalizada: { texto: 'Finalizada', clase: 'bg-amber-50 text-ambar ring-1 ring-amber-200' },
  adjudicada: { texto: 'Adjudicada', clase: 'bg-navy-50 text-navy-700 ring-1 ring-navy-200' },
  desierta: { texto: 'Desierta', clase: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  cancelada: { texto: 'Dada de baja', clase: 'bg-red-50 text-carmesi ring-1 ring-red-200' },
}

export const ROLES: Record<string, string> = {
  comprador: 'Comprador',
  vendedor_tasador: 'Vendedor / Tasador',
  administrador: 'Administrador',
}

export const capitalizar = (s?: string | null) =>
  s ? (s.charAt(0).toUpperCase() + s.slice(1)).replace(/_/g, ' ') : ''

export const VISTAS: Record<string, string> = {
  frontal: 'Frontal', motor: 'Motor', chasis: 'Chasis', habitaculo: 'Habitáculo',
  lateral: 'Lateral', trasera: 'Trasera', superior: 'Superior', detalle: 'Detalle',
}
