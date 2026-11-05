// Pantalla 6 – Panel de administración: mantenedor CRUD de lotes (Figura 9)
import { Ban, Eye, Pencil, Plus, ScrollText } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EstadoBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { Alerta, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { clp, fechaHora, TIPO_LOTE } from '../../lib/format'
import { adminApi, ApiError } from '../../services/api'
import type { LoteAdmin } from '../../types'

type Auditoria = Awaited<ReturnType<typeof adminApi.auditoria>>

export default function AdminLotes() {
  const { tieneRol } = useAuth()
  const { notificar } = useToast()
  const [lotes, setLotes] = useState<LoteAdmin[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [estado, setEstado] = useState('')
  const [exito, setExito] = useState<string | null>(null)

  const [editando, setEditando] = useState<LoteAdmin | null>(null)
  const [form, setForm] = useState({ precio_base: '', incremento_minimo: '', extender_horas: '', descripcion: '' })
  const [errorEdit, setErrorEdit] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [baja, setBaja] = useState<LoteAdmin | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null)

  const cargar = useCallback(() => {
    setError(null)
    adminApi.lotes(estado || undefined).then(setLotes).catch((e) => setError(e.message))
  }, [estado])
  useEffect(() => { cargar() }, [cargar])

  const abrirEdicion = (l: LoteAdmin) => {
    setEditando(l)
    setErrorEdit(null)
    setForm({
      precio_base: String(l.precio_base),
      incremento_minimo: String(l.incremento_minimo),
      extender_horas: '',
      descripcion: (l.tipo_lote === 'vehiculo_completo' ? l.item.descripcion_danio : l.item.observaciones_tecnicas) ?? '',
    })
    setTimeout(() => document.getElementById('panel-edicion')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const guardar = async () => {
    if (!editando) return
    const cambios: Record<string, unknown> = {}
    if (Number(form.precio_base) !== editando.precio_base) cambios.precio_base = Number(form.precio_base)
    if (Number(form.incremento_minimo) !== editando.incremento_minimo) cambios.incremento_minimo = Number(form.incremento_minimo)
    if (form.extender_horas) cambios.extender_horas = Number(form.extender_horas)
    const original = editando.tipo_lote === 'vehiculo_completo' ? editando.item.descripcion_danio : editando.item.observaciones_tecnicas
    if (form.descripcion !== original) {
      cambios.item = editando.tipo_lote === 'vehiculo_completo' ? { descripcion_danio: form.descripcion } : { observaciones_tecnicas: form.descripcion }
    }
    if (!Object.keys(cambios).length) { setErrorEdit('No hiciste ningún cambio.'); return }
    if ('precio_base' in cambios && (!Number(form.precio_base) || Number(form.precio_base) <= 0)) { setErrorEdit('El precio base debe ser mayor a $0.'); return }
    setGuardando(true)
    try {
      const r = await adminApi.editarLote(editando.id_subasta, cambios)
      setExito(r.mensaje)
      notificar(r.mensaje, 'exito')
      setEditando(null)
      cargar()
    } catch (e) {
      setErrorEdit((e as ApiError).message)
    } finally {
      setGuardando(false)
    }
  }

  const confirmarBaja = async () => {
    if (!baja) return
    setProcesando(true)
    try {
      const r = await adminApi.bajaLote(baja.id_subasta)
      setExito(r.mensaje)
      notificar(r.mensaje, 'exito')
      setBaja(null)
      cargar()
    } catch (e) {
      notificar((e as Error).message, 'error')
    } finally {
      setProcesando(false)
    }
  }

  const verAuditoria = async (l: LoteAdmin) => {
    try { setAuditoria(await adminApi.auditoria(l.id_subasta)) } catch (e) { notificar((e as Error).message, 'error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Gestión de Lotes y Repuestos</h1>
          <p className="text-sm text-slate-500">{tieneRol('administrador') ? 'Todos los lotes de la plataforma' : 'Lotes publicados por tu cuenta'}</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-auto" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="activa">Activas</option>
            <option value="finalizada">Finalizadas</option>
            <option value="adjudicada">Adjudicadas</option>
            <option value="desierta">Desiertas</option>
            <option value="cancelada">Dadas de baja</option>
          </select>
          <Link to="/publicar" className="inline-flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-800">
            <Plus className="h-4 w-4" /> Publicar nuevo lote
          </Link>
        </div>
      </div>

      {exito && <Alerta tipo="exito">{exito}</Alerta>}

      {error ? <ErrorState mensaje={error} onReintentar={cargar} /> : !lotes ? <Spinner /> : lotes.length === 0 ? (
        <EmptyState icono={<ScrollText className="h-14 w-14" />} titulo="Sin lotes" texto="No hay lotes para el filtro seleccionado." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tabla w-full">
            <thead>
              <tr><th>ID Lote</th><th>Descripción / Pieza</th><th className="hidden md:table-cell">Tipo</th><th>Precio actual</th><th className="hidden 2xl:table-cell">Posturas</th><th>Estado</th><th className="hidden 2xl:table-cell">Cierre</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id_subasta} className={editando?.id_subasta === l.id_subasta ? 'bg-navy-50/60' : ''}>
                  <td className="font-semibold">#{l.id_subasta}</td>
                  <td className="max-w-[200px] truncate">{l.titulo}</td>
                  <td className="hidden whitespace-nowrap md:table-cell">{TIPO_LOTE[l.tipo_lote]}</td>
                  <td className="font-bold">{clp(l.precio_actual)}</td>
                  <td className="hidden text-center 2xl:table-cell">{l.total_posturas}</td>
                  <td><EstadoBadge estado={l.estado_subasta} /></td>
                  <td className="hidden whitespace-nowrap text-xs text-slate-500 2xl:table-cell">{fechaHora(l.fecha_termino)}</td>
                  <td>
                    <div className="flex gap-1.5">
                      <Link to={`/lote/${l.id_subasta}`} title="Ver ficha" className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4" /></Link>
                      <button title="Auditoría de posturas" onClick={() => verAuditoria(l)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><ScrollText className="h-4 w-4" /></button>
                      {l.estado_subasta === 'activa' && (
                        <>
                          <Button tamano="sm" variante="secundario" onClick={() => abrirEdicion(l)} icono={<Pencil className="h-3.5 w-3.5" />}>Editar</Button>
                          <Button tamano="sm" variante="peligro" onClick={() => setBaja(l)} icono={<Ban className="h-3.5 w-3.5" />}>Baja</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <section id="panel-edicion" className="card animate-fade-in p-5">
          <h2 className="mb-3 text-lg font-bold">Editar Lote #{editando.id_subasta} <span className="text-sm font-normal text-slate-500">– {editando.titulo}</span></h2>
          {errorEdit && <div className="mb-3"><Alerta tipo="error">{errorEdit}</Alerta></div>}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="e-precio">Precio base</label>
              <input id="e-precio" type="number" className="input" value={form.precio_base} disabled={editando.total_posturas > 0}
                onChange={(e) => setForm({ ...form, precio_base: e.target.value })} />
              {editando.total_posturas > 0 && <p className="mt-1 text-xs text-slate-400">Bloqueado: el lote ya tiene posturas.</p>}
            </div>
            <div>
              <label className="label" htmlFor="e-inc">Incremento mínimo</label>
              <input id="e-inc" type="number" className="input" value={form.incremento_minimo} onChange={(e) => setForm({ ...form, incremento_minimo: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="e-ext">Extender cierre</label>
              <select id="e-ext" className="input" value={form.extender_horas} onChange={(e) => setForm({ ...form, extender_horas: e.target.value })}>
                <option value="">Sin cambios</option><option value="12">+12 horas</option><option value="24">+24 horas</option><option value="72">+72 horas</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="label" htmlFor="e-desc">Daño / Peritaje</label>
              <textarea id="e-desc" rows={3} className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variante="secundario" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={guardar} cargando={guardando}>Guardar cambios</Button>
          </div>
        </section>
      )}

      <Modal abierto={!!baja} onCerrar={() => setBaja(null)} titulo="Dar de baja lote"
        icono={<span className="rounded-lg bg-red-50 p-2 text-carmesi"><Ban className="h-5 w-5" /></span>}
        pie={<><Button variante="secundario" onClick={() => setBaja(null)}>Cancelar</Button><Button variante="peligro" cargando={procesando} onClick={confirmarBaja}>Sí, dar de baja</Button></>}>
        <p className="text-sm text-slate-700">¿Seguro que quieres dar de baja el <b>Lote #{baja?.id_subasta} – {baja?.titulo}</b>?
          La publicación dejará de aparecer en el catálogo y no recibirá más posturas (deshabilitación lógica, el registro se conserva).</p>
      </Modal>

      <Modal abierto={!!auditoria} onCerrar={() => setAuditoria(null)} titulo={`Auditoría de posturas – ${auditoria?.titulo ?? ''}`} ancho="max-w-3xl">
        {auditoria && (auditoria.posturas.length === 0 ? <p className="text-sm text-slate-500">Este lote aún no tiene posturas.</p> : (
          <div className="overflow-x-auto">
            <table className="tabla w-full">
              <thead><tr><th>#</th><th>Comprador</th><th>RUT</th><th>Monto</th><th>Fecha</th><th>IP origen</th></tr></thead>
              <tbody>
                {auditoria.posturas.map((p) => (
                  <tr key={p._id}><td>{p._id}</td><td>{p.comprador.nombre_completo}</td><td className="whitespace-nowrap">{p.comprador.rut}</td>
                    <td className="font-bold">{clp(p.monto_postura)}</td><td className="whitespace-nowrap text-xs">{fechaHora(p.fecha_hora_postura)}</td>
                    <td className="font-mono text-xs">{p.ip_origen}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Modal>
    </div>
  )
}
