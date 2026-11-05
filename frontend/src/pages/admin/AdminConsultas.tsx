// Pantalla 9 – Consultas funcionales: JOIN ($lookup), operadores y GROUP BY ($group) presentadas en el frontend
import { Code2, Database, Play } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ErrorState, Spinner } from '../../components/ui/Feedback'
import { capitalizar, clp, fechaHora } from '../../lib/format'
import { adminApi } from '../../services/api'
import type { Reporte } from '../../types'

interface Param { nombre: string; etiqueta: string; tipo: 'number' | 'estados'; defecto: string }
interface Consulta { id: string; titulo: string; descripcion: string; operadores: string[]; params: Param[] }

const CONSULTAS: Consulta[] = [
  {
    id: 'actividad-lotes', titulo: 'Actividad por lote',
    descripcion: 'Cantidad de posturas, monto máximo, promedio y postores distintos por cada lote, uniendo posturas con subastas.',
    operadores: ['$lookup (JOIN)', '$group (GROUP BY)', '$match + $gte (HAVING)', '$addToSet / $size', '$sort'],
    params: [{ nombre: 'min_posturas', etiqueta: 'Mínimo de posturas', tipo: 'number', defecto: '1' }],
  },
  {
    id: 'ranking-compradores', titulo: 'Ranking de compradores',
    descripcion: 'Top 10 compradores más activos en los últimos N días, uniendo posturas con la colección usuarios.',
    operadores: ['$match + $gte (WHERE)', '$group (GROUP BY)', '$lookup (JOIN)', '$sort + $limit'],
    params: [{ nombre: 'dias', etiqueta: 'Últimos días', tipo: 'number', defecto: '30' }],
  },
  {
    id: 'lotes-region', titulo: 'Lotes por región',
    descripcion: 'Cantidad de lotes, precio promedio y valor total agrupados por región y tipo de lote.',
    operadores: ['$match + $in + $gte (WHERE … IN)', '$group compuesto', '$avg / $sum', '$sort'],
    params: [
      { nombre: 'estados', etiqueta: 'Estados', tipo: 'estados', defecto: 'activa,finalizada,adjudicada' },
      { nombre: 'precio_min', etiqueta: 'Precio mínimo ($)', tipo: 'number', defecto: '0' },
    ],
  },
  {
    id: 'demanda-marca', titulo: 'Demanda por marca',
    descripcion: 'Lotes y posturas por marca de vehículo dentro de un rango de años.',
    operadores: ['$match + $gte/$lte (BETWEEN)', '$ne (<>)', '$group (GROUP BY)', '$divide'],
    params: [
      { nombre: 'anio_min', etiqueta: 'Año desde', tipo: 'number', defecto: '2015' },
      { nombre: 'anio_max', etiqueta: 'Año hasta', tipo: 'number', defecto: String(new Date().getFullYear()) },
    ],
  },
  {
    id: 'recaudacion-vendedor', titulo: 'Recaudación por vendedor',
    descripcion: 'Monto total y sobreprecio obtenido por cada vendedor en remates finalizados o adjudicados.',
    operadores: ['$match + $in', '$group + $sum', '$subtract', '$lookup (JOIN)'],
    params: [],
  },
]

const ESTADOS = ['activa', 'finalizada', 'adjudicada', 'desierta', 'cancelada']

function formatear(clave: string, v: unknown): string {
  if (v == null) return '—'
  if (/_id$/.test(clave)) return String(v)
  if (typeof v === 'number' && /(monto|precio|valor|oferta|sobreprecio)/.test(clave)) return clp(v)
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fechaHora(v)
  if (typeof v === 'number') return v.toLocaleString('es-CL')
  return String(v)
}

export default function AdminConsultas() {
  const [activa, setActiva] = useState(CONSULTAS[0])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [res, setRes] = useState<Reporte | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [codigo, setCodigo] = useState<'mql' | 'sql'>('mql')

  const ejecutar = useCallback(async (c: Consulta, vals: Record<string, string>) => {
    setCargando(true)
    setError(null)
    try {
      const params = Object.fromEntries(c.params.map((p) => [p.nombre, vals[p.nombre] ?? p.defecto]))
      setRes(await adminApi.reporte(c.id, params))
    } catch (e) {
      setError((e as Error).message)
      setRes(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const iniciales = Object.fromEntries(activa.params.map((p) => [p.nombre, p.defecto]))
    setValores(iniciales)
    ejecutar(activa, iniciales)
  }, [activa, ejecutar])

  const columnas = res?.resultados.length
    ? Object.keys(res.resultados[0]).sort((a, b) => Number(/_id$|^(marca|region|nombre|vendedor)$/.test(b)) - Number(/_id$|^(marca|region|nombre|vendedor)$/.test(a)))
    : []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><Database className="h-6 w-6" />Consultas de la base de datos</h1>
        <p className="text-sm text-slate-500">Consultas de agregación en MongoDB con su equivalente SQL relacional.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {CONSULTAS.map((c) => (
          <button key={c.id} role="tab" aria-selected={activa.id === c.id} onClick={() => setActiva(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${activa.id === c.id ? 'bg-navy-700 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200'}`}>
            {c.titulo}
          </button>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-bold">{activa.titulo}</h2>
        <p className="text-sm text-slate-600">{activa.descripcion}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {activa.operadores.map((o) => <span key={o} className="chip bg-navy-50 font-mono text-navy-700 ring-1 ring-navy-100">{o}</span>)}
        </div>

        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); ejecutar(activa, valores) }}>
          {activa.params.map((p) => p.tipo === 'number' ? (
            <div key={p.nombre}>
              <label className="label" htmlFor={p.nombre}>{p.etiqueta}</label>
              <input id={p.nombre} type="number" className="input w-36" value={valores[p.nombre] ?? ''} onChange={(e) => setValores({ ...valores, [p.nombre]: e.target.value })} />
            </div>
          ) : (
            <fieldset key={p.nombre}>
              <legend className="label">{p.etiqueta}</legend>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => {
                  const lista = (valores[p.nombre] ?? '').split(',').filter(Boolean)
                  const on = lista.includes(e)
                  return (
                    <label key={e} className="flex items-center gap-1 text-sm">
                      <input type="checkbox" className="accent-navy-700" checked={on}
                        onChange={() => setValores({ ...valores, [p.nombre]: (on ? lista.filter((x) => x !== e) : [...lista, e]).join(',') })} />
                      {capitalizar(e)}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
          <Button type="submit" cargando={cargando} icono={<Play className="h-4 w-4" />}>Ejecutar consulta</Button>
        </form>
      </section>

      {error ? <ErrorState mensaje={error} /> : cargando && !res ? <Spinner texto="Ejecutando consulta…" /> : res && (
        <>
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h3 className="text-sm font-bold">Resultado</h3>
              <span className="text-xs text-slate-500">{res.resultados.length} fila(s)</span>
            </div>
            {res.resultados.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">La consulta no devolvió resultados con estos parámetros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabla w-full">
                  <thead><tr>{columnas.map((c) => <th key={c}>{capitalizar(c)}</th>)}</tr></thead>
                  <tbody>
                    {res.resultados.map((fila, i) => (
                      <tr key={i}>{columnas.map((c) => <td key={c} className="whitespace-nowrap">{formatear(c, fila[c])}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Code2 className="h-4 w-4" />Consulta ejecutada</h3>
              <div className="flex rounded-lg bg-navy-50 p-0.5 text-xs font-semibold">
                {(['mql', 'sql'] as const).map((t) => (
                  <button key={t} onClick={() => setCodigo(t)} className={`rounded-md px-3 py-1 ${codigo === t ? 'bg-navy-700 text-white' : 'text-navy-700'}`}>
                    {t === 'mql' ? 'MongoDB (MQL)' : 'SQL equivalente'}
                  </button>
                ))}
              </div>
            </div>
            <pre className="code-block max-h-[420px]">{codigo === 'mql' ? res.mql : res.sql}</pre>
          </section>
        </>
      )}
    </div>
  )
}
