import { Gavel, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { capitalizar, clp, TIPO_LOTE } from '../../lib/format'
import type { LoteResumen } from '../../types'
import { DanioBadge, EstadoBadge } from '../ui/Badges'
import { Countdown } from './Countdown'
import { LoteImagen } from './LoteImagen'

export function LoteCard({ lote }: { lote: LoteResumen }) {
  const activa = lote.estado_subasta === 'activa'
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/lote/${lote.id_subasta}`} className="relative block aspect-[16/10] overflow-hidden">
        <LoteImagen url={lote.portada_url} tipo={lote.tipo_lote} alt={lote.titulo} className="transition duration-300 group-hover:scale-105" />
        <div className="absolute left-2 top-2 flex gap-1">
          {lote.tipo_lote === 'pieza_desarme'
            ? <span className="chip bg-carmesi text-white shadow">Desarme / {capitalizar(lote.categoria_pieza)}</span>
            : <DanioBadge nivel={lote.nivel_danio} solido />}
        </div>
        {!activa && <div className="absolute right-2 top-2"><EstadoBadge estado={lote.estado_subasta} /></div>}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-base font-bold leading-tight">
          <Link to={`/lote/${lote.id_subasta}`} className="hover:underline">{lote.titulo}</Link>
        </h3>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" /> {lote.region} · {TIPO_LOTE[lote.tipo_lote]}
        </p>
        {activa ? <Countdown hasta={lote.fecha_termino} /> : <span className="text-xs text-slate-500">Remate cerrado</span>}

        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{lote.total_posturas ? 'Precio actual' : 'Precio base'}</p>
            <p className="text-2xl font-extrabold text-exito">{clp(lote.precio_actual)}</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-slate-500"><Gavel className="h-3.5 w-3.5" />{lote.total_posturas}</span>
        </div>

        <Link to={`/lote/${lote.id_subasta}`}
          className="mt-3 rounded-lg bg-navy-700 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-navy-800">
          {activa ? 'Ver y pujar' : 'Ver detalle'}
        </Link>
      </div>
    </article>
  )
}
