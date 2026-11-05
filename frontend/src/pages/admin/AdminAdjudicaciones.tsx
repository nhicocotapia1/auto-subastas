// Pantalla 8 – Adjudicación y cierre de remates (RF05)
import { FileCheck2, Gavel, Timer, Trophy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EstadoBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { Alerta, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { clp, fechaHora } from '../../lib/format'
import { adminApi } from '../../services/api'
import type { Adjudicacion, LoteAdmin } from '../../types'

export default function AdminAdjudicaciones() {
  const { notificar } = useToast()
  const [cerradas, setCerradas] = useState<Adjudicacion[] | null>(null)
  const [activas, setActivas] = useState<LoteAdmin[]>([])
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<{ tipo: 'adjudicar' | 'cerrar'; id: number; titulo: string } | null>(null)
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      const [c, a] = await Promise.all([adminApi.adjudicaciones(), adminApi.lotes('activa')])
      setCerradas(c)
      setActivas(a)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const ejecutar = async () => {
    if (!accion) return
    setProcesando(true)
    try {
      const r = accion.tipo === 'adjudicar' ? await adminApi.adjudicar(accion.id) : await adminApi.cerrar(accion.id)
      notificar(r.mensaje, 'exito')
      setAccion(null)
      cargar()
    } catch (e) {
      notificar((e as Error).message, 'error')
    } finally {
      setProcesando(false)
    }
  }

  if (error) return <ErrorState mensaje={error} onReintentar={cargar} />
  if (!cerradas) return <Spinner />

  const pendientes = cerradas.filter((c) => c.estado_subasta === 'finalizada')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Adjudicaciones</h1>
        <p className="text-sm text-slate-500">El proceso automático cierra cada 30 s los remates cuyo cronómetro expiró y declara la pre-venta al mayor postor.</p>
      </div>

      {pendientes.length > 0 && <Alerta tipo="info">Tienes <b>{pendientes.length}</b> remate(s) finalizados esperando adjudicación formal.</Alerta>}

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Trophy className="h-5 w-5" />Remates cerrados</h2>
        {cerradas.length === 0 ? (
          <EmptyState icono={<Gavel className="h-12 w-12" />} titulo="Sin remates cerrados" texto="Aún no hay subastas finalizadas." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="tabla w-full">
              <thead><tr><th>Lote</th><th>Descripción</th><th>Estado</th><th>Ganador</th><th>Precio final</th><th>Cierre</th><th>Acción</th></tr></thead>
              <tbody>
                {cerradas.map((c) => (
                  <tr key={c.id_subasta}>
                    <td className="font-semibold">#{c.id_subasta}</td>
                    <td>{c.titulo}<span className="block text-xs text-slate-500">{c.vendedor} · {c.total_posturas} posturas</span></td>
                    <td><EstadoBadge estado={c.estado_subasta} /></td>
                    <td>{c.ganador ? <>{c.ganador.nombre_completo}<span className="block text-xs text-slate-500">{c.ganador.rut}</span></> : <span className="text-slate-400">—</span>}</td>
                    <td className="font-bold text-exito">{c.ganador ? clp(c.precio_final) : '—'}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{fechaHora(c.fecha_termino)}</td>
                    <td>
                      {c.estado_subasta === 'finalizada' ? (
                        <Button tamano="sm" variante="exito" icono={<FileCheck2 className="h-3.5 w-3.5" />}
                          onClick={() => setAccion({ tipo: 'adjudicar', id: c.id_subasta, titulo: c.titulo })}>Adjudicar</Button>
                      ) : c.estado_subasta === 'adjudicada' ? (
                        <span className="text-xs text-slate-500">Adjudicada {fechaHora(c.fecha_adjudicacion)}</span>
                      ) : <span className="text-xs text-slate-400">Sin postores</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Timer className="h-5 w-5" />Remates activos (cierre anticipado)</h2>
        <div className="card overflow-x-auto">
          <table className="tabla w-full">
            <thead><tr><th>Lote</th><th>Descripción</th><th>Precio actual</th><th>Posturas</th><th>Cierre programado</th><th>Acción</th></tr></thead>
            <tbody>
              {activas.map((a) => (
                <tr key={a.id_subasta}>
                  <td className="font-semibold">#{a.id_subasta}</td><td>{a.titulo}</td><td className="font-bold">{clp(a.precio_actual)}</td>
                  <td>{a.total_posturas}</td><td className="whitespace-nowrap text-xs text-slate-500">{fechaHora(a.fecha_termino)}</td>
                  <td><Button tamano="sm" variante="secundario" onClick={() => setAccion({ tipo: 'cerrar', id: a.id_subasta, titulo: a.titulo })}>Cerrar ahora</Button></td>
                </tr>
              ))}
              {activas.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400">No hay remates activos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Modal abierto={!!accion} onCerrar={() => setAccion(null)}
        titulo={accion?.tipo === 'adjudicar' ? 'Confirmar adjudicación' : 'Cerrar remate'}
        pie={<><Button variante="secundario" onClick={() => setAccion(null)}>Cancelar</Button>
          <Button variante={accion?.tipo === 'adjudicar' ? 'exito' : 'primario'} cargando={procesando} onClick={ejecutar}>Confirmar</Button></>}>
        <p className="text-sm text-slate-700">
          {accion?.tipo === 'adjudicar'
            ? <>Se adjudicará formalmente el <b>Lote #{accion.id} – {accion.titulo}</b> al mayor postor y se emitirá el comprobante de pre-venta.</>
            : <>Se cerrará de inmediato el <b>Lote #{accion?.id} – {accion?.titulo}</b>. Si tiene posturas quedará finalizado con el mayor postor; si no, quedará desierto.</>}
        </p>
      </Modal>
    </div>
  )
}
