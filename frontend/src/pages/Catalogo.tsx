// Pantalla 1 – Catálogo general de lotes con filtros multicriterio (Figura 4 y 11)
import { ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { FiltrosHeader, FiltrosPanel } from '../components/subastas/FiltrosPanel'
import { LoteCard } from '../components/subastas/LoteCard'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback'
import { subastasApi, type FiltrosCatalogo } from '../services/api'
import type { Catalogo as CatalogoT, OpcionesFiltros } from '../types'

const INICIAL: FiltrosCatalogo = {
  categoria: 'todos', marca: [], nivel_danio: [], region: [], solo_activas: true, q: '', orden: 'termina_pronto', page: 1,
}

function contarActivos(f: FiltrosCatalogo, op: OpcionesFiltros | null) {
  let n = f.marca.length + f.nivel_danio.length + f.region.length
  if (f.categoria !== 'todos') n++
  if (f.solo_activas) n++
  if ((f.anio_min && f.anio_min !== op?.anio_min) || (f.anio_max && f.anio_max !== op?.anio_max)) n++
  return n
}

export default function Catalogo() {
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(INICIAL)
  const [opciones, setOpciones] = useState<OpcionesFiltros | null>(null)
  const [datos, setDatos] = useState<CatalogoT | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => { subastasApi.filtros().then(setOpciones).catch(() => setOpciones(null)) }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await subastasApi.catalogo(filtros))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])

  const aplicar = (f: FiltrosCatalogo) => { setFiltros({ ...f, q: busqueda }); setDrawer(false) }
  const limpiar = () => { setFiltros(INICIAL); setBusqueda(''); setDrawer(false) }
  const activos = contarActivos(filtros, opciones)

  return (
    <div className="flex gap-6">
      {/* Barra lateral de filtros (escritorio) */}
      <aside className="card hidden h-fit w-64 shrink-0 p-4 lg:sticky lg:top-24 lg:block">
        <FiltrosHeader />
        <FiltrosPanel opciones={opciones} valor={filtros} onAplicar={aplicar} onLimpiar={limpiar} />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Catálogo de remates</h1>
            <p className="text-sm text-slate-500">
              {datos ? `${datos.total_items} lote(s) encontrados` : 'Vehículos siniestrados y repuestos en desarme'}
            </p>
          </div>
          <div className="flex gap-2">
            <form className="relative flex-1 sm:w-64" onSubmit={(e) => { e.preventDefault(); setFiltros({ ...filtros, q: busqueda, page: 1 }) }}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Buscar marca, modelo o pieza" value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar" />
            </form>
            <select className="input w-auto" value={filtros.orden} aria-label="Ordenar"
              onChange={(e) => setFiltros({ ...filtros, orden: e.target.value, page: 1 })}>
              <option value="termina_pronto">Termina pronto</option>
              <option value="recientes">Más recientes</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
            </select>
          </div>
        </div>

        {/* Botón de filtros (móvil) */}
        <div className="mb-4 flex justify-center lg:hidden">
          <button onClick={() => setDrawer(true)}
            className="flex items-center gap-2 rounded-full bg-navy-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg">
            <SlidersHorizontal className="h-4 w-4" /> Filtrar ({activos} activos)
          </button>
        </div>

        {cargando ? (
          <Spinner texto="Cargando lotes…" />
        ) : error ? (
          <ErrorState mensaje={error} onReintentar={cargar} />
        ) : !datos || datos.data.length === 0 ? (
          <EmptyState
            icono={<SearchX className="h-16 w-16" strokeWidth={1.3} />}
            titulo="No se encontraron lotes"
            texto="No se encontraron lotes que coincidan con los filtros aplicados."
            accion={<Button onClick={limpiar}>Restablecer filtros</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {datos.data.map((l) => <LoteCard key={l.id_subasta} lote={l} />)}
            </div>
            {datos.total_pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button variante="secundario" tamano="sm" disabled={filtros.page <= 1}
                  onClick={() => setFiltros({ ...filtros, page: filtros.page - 1 })} icono={<ChevronLeft className="h-4 w-4" />}>Anterior</Button>
                <span className="text-sm text-slate-600">Página {datos.page} de {datos.total_pages}</span>
                <Button variante="secundario" tamano="sm" disabled={filtros.page >= datos.total_pages}
                  onClick={() => setFiltros({ ...filtros, page: filtros.page + 1 })}>Siguiente <ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer de filtros (móvil) */}
      {drawer && (
        <div className="fixed inset-0 z-50 bg-navy-900/40 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="animate-slide-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between">
              <FiltrosHeader />
              <button onClick={() => setDrawer(false)} aria-label="Cerrar filtros"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <FiltrosPanel opciones={opciones} valor={filtros} onAplicar={aplicar} onLimpiar={limpiar} />
          </div>
        </div>
      )}
    </div>
  )
}
