// Panel de filtros multicriterio (RF01). Se usa como barra lateral en escritorio y como Drawer en móvil.
import { Filter, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { FiltrosCatalogo } from '../../services/api'
import type { OpcionesFiltros } from '../../types'
import { Button } from '../ui/Button'

interface Props {
  opciones: OpcionesFiltros | null
  valor: FiltrosCatalogo
  onAplicar: (f: FiltrosCatalogo) => void
  onLimpiar: () => void
}

const CATEGORIAS = [
  { v: 'todos', t: 'Todos' },
  { v: 'vehiculo_completo', t: 'Vehículo completo' },
  { v: 'pieza_desarme', t: 'Piezas / Desarme' },
]
const NIVELES = [
  { v: 'leve', t: 'Leve' },
  { v: 'medio', t: 'Medio' },
  { v: 'perdida_total', t: 'Pérdida total' },
]

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-slate-100 py-3 first:border-0 first:pt-0">
      <legend className="mb-2 text-sm font-bold text-navy-800">{titulo}</legend>
      {children}
    </fieldset>
  )
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 accent-navy-700" />
      {children}
    </label>
  )
}

export function FiltrosPanel({ opciones, valor, onAplicar, onLimpiar }: Props) {
  const [f, setF] = useState(valor)
  useEffect(() => setF(valor), [valor])

  const min = opciones?.anio_min ?? 2000
  const max = opciones?.anio_max ?? new Date().getFullYear()
  const desde = f.anio_min ?? min
  const hasta = f.anio_max ?? max

  const toggle = (campo: 'marca' | 'nivel_danio' | 'region', v: string) =>
    setF((p) => ({ ...p, [campo]: p[campo].includes(v) ? p[campo].filter((x) => x !== v) : [...p[campo], v] }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onAplicar({ ...f, page: 1 }) }} className="flex flex-col">
      <Seccion titulo="Categoría">
        {CATEGORIAS.map((c) => (
          <label key={c.v} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-slate-700">
            <input type="radio" name="categoria" checked={f.categoria === c.v} onChange={() => setF({ ...f, categoria: c.v })}
              className="h-4 w-4 accent-navy-700" />
            {c.t}
          </label>
        ))}
      </Seccion>

      <Seccion titulo={`Año: ${desde} - ${hasta}`}>
        <label className="text-xs text-slate-500">Desde
          <input type="range" min={min} max={max} value={desde}
            onChange={(e) => setF({ ...f, anio_min: Math.min(Number(e.target.value), hasta) })}
            className="w-full accent-exito" />
        </label>
        <label className="text-xs text-slate-500">Hasta
          <input type="range" min={min} max={max} value={hasta}
            onChange={(e) => setF({ ...f, anio_max: Math.max(Number(e.target.value), desde) })}
            className="w-full accent-exito" />
        </label>
        <p className="text-[11px] text-slate-400">El rango de años aplica a vehículos completos.</p>
      </Seccion>

      <Seccion titulo="Marca">
        {(opciones?.marcas ?? []).map((m) => (
          <Check key={m} checked={f.marca.includes(m)} onChange={() => toggle('marca', m)}>{m}</Check>
        ))}
      </Seccion>

      <Seccion titulo="Nivel de daño">
        {NIVELES.map((n) => (
          <Check key={n.v} checked={f.nivel_danio.includes(n.v)} onChange={() => toggle('nivel_danio', n.v)}>{n.t}</Check>
        ))}
      </Seccion>

      <Seccion titulo="Región">
        {(opciones?.regiones ?? []).map((r) => (
          <Check key={r} checked={f.region.includes(r)} onChange={() => toggle('region', r)}>{r}</Check>
        ))}
      </Seccion>

      <Seccion titulo="Modalidad">
        <Check checked={f.solo_activas} onChange={() => setF({ ...f, solo_activas: !f.solo_activas })}>Solo subastas activas</Check>
      </Seccion>

      <div className="mt-2 flex gap-2">
        <Button type="submit" className="flex-1" icono={<SlidersHorizontal className="h-4 w-4" />}>Aplicar</Button>
        <Button type="button" variante="secundario" onClick={onLimpiar}>Limpiar</Button>
      </div>
    </form>
  )
}

export function FiltrosHeader() {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
      <Filter className="h-4 w-4" /> Filtros
    </h2>
  )
}
