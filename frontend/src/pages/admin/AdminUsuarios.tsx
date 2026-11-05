// Pantalla 7 – Mantenedor de usuarios (RF04): listado, cambio de rol y suspensión
import { Search, ShieldOff, ShieldCheck, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fecha, ROLES } from '../../lib/format'
import { adminApi } from '../../services/api'
import type { Usuario } from '../../types'

export default function AdminUsuarios() {
  const { usuario: yo } = useAuth()
  const { notificar } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('')
  const [confirmar, setConfirmar] = useState<Usuario | null>(null)
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(() => {
    setError(null)
    adminApi.usuarios(q || undefined, rol || undefined, estado || undefined).then(setUsuarios).catch((e) => setError(e.message))
  }, [q, rol, estado])
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t) }, [cargar])

  const cambiar = async (u: Usuario, data: { estado_cuenta?: string; tipo_usuario?: string }) => {
    setProcesando(true)
    try {
      const r = await adminApi.editarUsuario(u.id, data)
      notificar(r.mensaje, 'exito')
      setConfirmar(null)
      cargar()
    } catch (e) {
      notificar((e as Error).message, 'error')
      cargar()
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Administración de Usuarios</h1>
        <p className="text-sm text-slate-500">Modifica perfiles y suspende cuentas infractoras</p>
      </div>

      <div className="card flex flex-col gap-2 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por nombre, correo o RUT" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuario" />
        </div>
        <select className="input sm:w-48" value={rol} onChange={(e) => setRol(e.target.value)} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input sm:w-40" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos</option><option value="activo">Activos</option><option value="suspendido">Suspendidos</option>
        </select>
      </div>

      {error ? <ErrorState mensaje={error} onReintentar={cargar} /> : !usuarios ? <Spinner /> : usuarios.length === 0 ? (
        <EmptyState icono={<Users className="h-14 w-14" />} titulo="Sin resultados" texto="Ningún usuario coincide con la búsqueda." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tabla w-full">
            <thead><tr><th>ID</th><th>Nombre</th><th>RUT</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acción</th></tr></thead>
            <tbody>
              {usuarios.map((u) => {
                const soyYo = u.id === yo?.id
                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td className="font-semibold">{u.nombre}{u.nombre_comercial && <span className="block text-xs font-normal text-slate-500">{u.nombre_comercial}</span>}</td>
                    <td className="whitespace-nowrap">{u.rut}</td>
                    <td>{u.email}</td>
                    <td>
                      <select className="rounded-lg border border-slate-200 px-2 py-1 text-xs" value={u.rol} disabled={soyYo || procesando}
                        aria-label={`Rol de ${u.nombre}`} onChange={(e) => cambiar(u, { tipo_usuario: e.target.value })}>
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`chip ring-1 ${u.estado_cuenta === 'activo' ? 'bg-green-50 text-exito ring-green-200' : 'bg-red-50 text-carmesi ring-red-200'}`}>
                        {u.estado_cuenta === 'activo' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{fecha(u.fecha_registro)}</td>
                    <td>
                      {soyYo ? <span className="text-xs text-slate-400">Tu cuenta</span> : u.estado_cuenta === 'activo' ? (
                        <Button tamano="sm" variante="peligro" onClick={() => setConfirmar(u)} icono={<ShieldOff className="h-3.5 w-3.5" />}>Suspender</Button>
                      ) : (
                        <Button tamano="sm" variante="secundario" onClick={() => cambiar(u, { estado_cuenta: 'activo' })} icono={<ShieldCheck className="h-3.5 w-3.5" />}>Reactivar</Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={!!confirmar} onCerrar={() => setConfirmar(null)} titulo="Suspender cuenta"
        icono={<span className="rounded-lg bg-red-50 p-2 text-carmesi"><ShieldOff className="h-5 w-5" /></span>}
        pie={<><Button variante="secundario" onClick={() => setConfirmar(null)}>Cancelar</Button>
          <Button variante="peligro" cargando={procesando} onClick={() => confirmar && cambiar(confirmar, { estado_cuenta: 'suspendido' })}>Suspender</Button></>}>
        <p className="text-sm text-slate-700">¿Suspender la cuenta de <b>{confirmar?.nombre}</b> ({confirmar?.email})? No podrá iniciar sesión ni realizar posturas hasta que la reactives.</p>
      </Modal>
    </div>
  )
}
