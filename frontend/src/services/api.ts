// Cliente HTTP de la API REST /api/v1 (documentada en la sección 6 del informe)
import type {
  Adjudicacion, Catalogo, Catalogos, LoteAdmin, MiPuja, OpcionesFiltros, Reporte, Sesion, SubastaDetalle, Usuario,
} from '../types'

// En desarrollo se usa el proxy de Vite; en producción se puede definir VITE_API_URL
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const BASE = `${API_URL}/api/v1`
const TOKEN_KEY = 'as_token'

/** Error normalizado según el formato estándar del backend */
export class ApiError extends Error {
  status: number
  codigo?: string
  detalles?: { campo: string; mensaje: string }[]

  constructor(status: number, message: string, codigo?: string, detalles?: { campo: string; mensaje: string }[]) {
    super(message)
    this.status = status
    this.codigo = codigo
    this.detalles = detalles
  }
}

export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* almacenamiento no disponible */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* almacenamiento no disponible */ }
  },
}

export function urlArchivo(ruta: string | null | undefined): string | null {
  if (!ruta) return null
  return ruta.startsWith('http') ? ruta : `${API_URL}${ruta}`
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = tokenStore.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión o que el backend esté encendido.', 'SIN_CONEXION')
  }

  const texto = await res.text()
  let data: unknown = null
  try { data = texto ? JSON.parse(texto) : null } catch { data = null }

  if (!res.ok) {
    const body = (data ?? {}) as { message?: string; codigo_interno?: string; detalles?: { campo: string; mensaje: string }[] }
    if (res.status === 401 && token) {
      // Sesión expirada o token inválido: se notifica a la app para cerrar sesión
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: body.message }))
    }
    throw new ApiError(res.status, body.message ?? `Error ${res.status} en el servidor.`, body.codigo_interno, body.detalles)
  }
  return data as T
}

const json = (body: unknown) => JSON.stringify(body)

function query(params: Record<string, string | number | boolean | undefined | null | string[]>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) { if (v.length) q.set(k, v.join(',')) } else q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ------------------------- Autenticación -------------------------
export const authApi = {
  login: (email: string, password: string) => request<Sesion>('/auth/login', { method: 'POST', body: json({ email, password }) }),
  registro: (data: { rut: string; nombre_completo: string; email: string; password: string; telefono?: string }) =>
    request<Sesion>('/auth/registro', { method: 'POST', body: json(data) }),
  me: () => request<Usuario>('/auth/me'),
}

// ------------------------- Subastas (público) -------------------------
export interface FiltrosCatalogo {
  categoria: string
  anio_min?: number
  anio_max?: number
  marca: string[]
  nivel_danio: string[]
  region: string[]
  solo_activas: boolean
  q?: string
  orden: string
  page: number
}

export const subastasApi = {
  catalogo: (f: FiltrosCatalogo) => request<Catalogo>(`/subastas${query({ ...f, limit: 12 })}`),
  filtros: () => request<OpcionesFiltros>('/subastas/filtros'),
  detalle: (id: number) => request<SubastaDetalle>(`/subastas/${id}`),
  pujar: (id: number, monto: number) =>
    request<{ mensaje: string; id_postura: number; nuevo_precio_lider: number; monto_minimo_siguiente: number }>(
      `/subastas/${id}/posturas`, { method: 'POST', body: json({ monto_ofertado: monto }) },
    ),
  misPujas: () => request<{ total_participaciones: number; data: MiPuja[] }>('/usuarios/me/posturas'),
}

// ------------------------- Administración -------------------------
export const adminApi = {
  catalogos: () => request<Catalogos>('/admin/catalogos'),
  lotes: (estado?: string) => request<LoteAdmin[]>(`/admin/lotes${query({ estado })}`),
  crearLote: (data: unknown) => request<{ mensaje: string; id_subasta: number }>('/admin/lotes', { method: 'POST', body: json(data) }),
  editarLote: (id: number, data: unknown) => request<{ mensaje: string }>(`/admin/lotes/${id}`, { method: 'PATCH', body: json(data) }),
  bajaLote: (id: number) => request<{ mensaje: string }>(`/admin/lotes/${id}`, { method: 'DELETE' }),
  subirImagenes: (id: number, archivos: File[], vistas: string[]) => {
    const fd = new FormData()
    archivos.forEach((a) => fd.append('archivos', a))
    vistas.forEach((v) => fd.append('vistas', v))
    return request<{ mensaje: string }>(`/admin/lotes/${id}/imagenes`, { method: 'POST', body: fd })
  },
  auditoria: (id: number) =>
    request<{ titulo: string; posturas: { _id: number; comprador: { nombre_completo: string; rut: string }; monto_postura: number; fecha_hora_postura: string; ip_origen: string }[] }>(
      `/admin/lotes/${id}/posturas`,
    ),
  usuarios: (q?: string, rol?: string, estado?: string) => request<Usuario[]>(`/admin/usuarios${query({ q, rol, estado })}`),
  editarUsuario: (id: number, data: Partial<{ estado_cuenta: string; tipo_usuario: string }>) =>
    request<{ mensaje: string }>(`/admin/usuarios/${id}`, { method: 'PATCH', body: json(data) }),
  adjudicaciones: () => request<Adjudicacion[]>('/admin/adjudicaciones'),
  cerrar: (id: number) => request<{ mensaje: string }>(`/admin/subastas/${id}/cerrar`, { method: 'POST' }),
  adjudicar: (id: number) => request<{ mensaje: string }>(`/admin/subastas/${id}/adjudicar`, { method: 'POST' }),
  reporte: (nombre: string, params: Record<string, string | number> = {}) =>
    request<Reporte>(`/admin/reportes/${nombre}${query(params)}`),
}
