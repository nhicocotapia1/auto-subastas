// Pantalla 4 – Historial del comprador «Mis Pujas» (Figura 8)
import { ArrowRight, Calendar, CheckCircle2, Clock, Gavel, MapPin, TrendingDown, Trophy, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoteImagen } from '../components/subastas/LoteImagen'
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback'
import { clp, fecha, TIPO_LOTE } from '../lib/format'
import { subastasApi } from '../services/api'
import type { EstadoOferta, MiPuja } from '../types'

const ESTADOS: Record<EstadoOferta, { texto: string; clase: string; Icono: typeof Clock }> = {
  lider: { texto: 'Vas ganando', clase: 'bg-green-50 text-exito ring-green-200', Icono: CheckCircle2 },
  superada: { texto: 'Superada', clase: 'bg-amber-50 text-ambar ring-amber-200', Icono: TrendingDown },
  ganada: { texto: 'Ganado', clase: 'bg-green-50 text-exito ring-green-200', Icono: Trophy },
  no_adjudicado: { texto: 'No adjudicado', clase: 'bg-slate-100 text-slate-600 ring-slate-200', Icono: XCircle },
  cancelada: { texto: 'Lote dado de baja', clase: 'bg-red-50 text-carmesi ring-red-200', Icono: XCircle },
}

export default function MisPujas() {
  const [datos, setDatos] = useState<MiPuja[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'activas' | 'cerradas'>('todas')

  const cargar = useCallback(() => {
    setError(null)
    subastasApi.misPujas().then((r) => setDatos(r.data)).catch((e) => setError(e.message))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const lista = (datos ?? []).filter((p) =>
    filtro === 'todas' ? true : filtro === 'activas' ? p.estado_subasta === 'activa' : p.estado_subasta !== 'activa')

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <Gavel className="h-9 w-9 text-exito" />
        <div>
          <h1 className="text-3xl font-extrabold">Mis Pujas</h1>
          <p className="text-sm text-slate-500">Historial de participaciones ordenadas de la más reciente a la más antigua</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2" role="tablist">
        {(['todas', 'activas', 'cerradas'] as const).map((f) => (
          <button key={f} role="tab" aria-selected={filtro === f} onClick={() => setFiltro(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${filtro === f ? 'bg-navy-700 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200'}`}>
            {f}
          </button>
        ))}
      </div>

      {error ? <ErrorState mensaje={error} onReintentar={cargar} /> : !datos ? <Spinner texto="Cargando tus pujas…" /> : lista.length === 0 ? (
        <EmptyState icono={<Gavel className="h-14 w-14" />} titulo="Aún no tienes pujas aquí"
          texto="Cuando hagas una postura en un remate aparecerá en este historial con su estado actualizado."
          accion={<Link to="/" className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white">Explorar catálogo</Link>} />
      ) : (
        <div className="space-y-3">
          {lista.map((p) => {
            const e = ESTADOS[p.estado_oferta]
            return (
              <article key={p.subasta_id} className="card flex flex-col gap-4 p-3 sm:flex-row sm:items-center">
                <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg sm:w-36">
                  <LoteImagen url={p.portada_url} tipo={p.tipo_lote} alt={p.descripcion_lote} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="font-bold">{p.descripcion_lote}</h2>
                  <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{p.region} · {TIPO_LOTE[p.tipo_lote]}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500"><Calendar className="h-3.5 w-3.5" />Fecha de puja: {fecha(p.fecha_hora_postura)} · {p.cantidad_posturas} postura(s)</p>
                  <span className={`chip ring-1 ${e.clase}`}><e.Icono className="h-3.5 w-3.5" />{e.texto}</span>
                </div>
                <div className="sm:w-40">
                  <p className="text-xs text-slate-500">{p.estado_subasta === 'activa' ? 'Tu oferta actual' : 'Tu oferta final'}</p>
                  <p className="text-2xl font-extrabold text-exito">{clp(p.monto_postura)}</p>
                  {p.estado_oferta === 'superada' && <p className="text-xs text-ambar">Precio líder: {clp(p.precio_actual)}</p>}
                </div>
                <Link to={`/lote/${p.subasta_id}`}
                  className="flex items-center justify-center gap-1 rounded-lg border border-navy-300 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">
                  Ver detalle <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            )
          })}
        </div>
      )}

      <div className="mt-6 flex flex-col items-center justify-between gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-navy-800 to-navy-600 p-5 text-white sm:flex-row">
        <div className="flex items-center gap-3">
          <Gavel className="h-10 w-10" />
          <div>
            <p className="text-lg font-bold">Encuentra <span className="text-exito">grandes oportunidades</span></p>
            <p className="text-sm text-navy-100">Subasta de vehículos y repuestos al mejor precio</p>
          </div>
        </div>
        <Link to="/" className="flex items-center gap-1 rounded-lg bg-exito px-4 py-2.5 text-sm font-bold">Ver catálogo <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  )
}
