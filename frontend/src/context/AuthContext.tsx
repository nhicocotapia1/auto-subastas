// Estado de sesión (JWT) compartido por toda la aplicación
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi, tokenStore } from '../services/api'
import type { Rol, Usuario } from '../types'
import { useToast } from './ToastContext'

interface AuthCtx {
  usuario: Usuario | null
  cargando: boolean
  login: (email: string, password: string) => Promise<Usuario>
  registro: (data: Parameters<typeof authApi.registro>[0]) => Promise<Usuario>
  logout: () => void
  tieneRol: (...roles: Rol[]) => boolean
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const { notificar } = useToast()

  // Restaura la sesión si hay un token guardado
  useEffect(() => {
    if (!tokenStore.get()) { setCargando(false); return }
    authApi.me()
      .then(setUsuario)
      .catch(() => tokenStore.clear())
      .finally(() => setCargando(false))
  }, [])

  // Si el backend responde 401 (token expirado) se cierra la sesión
  useEffect(() => {
    const onExpired = (e: Event) => {
      tokenStore.clear()
      setUsuario(null)
      notificar((e as CustomEvent).detail ?? 'Tu sesión expiró. Vuelve a iniciar sesión.', 'error')
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [notificar])

  const login = useCallback(async (email: string, password: string) => {
    const s = await authApi.login(email, password)
    tokenStore.set(s.access_token)
    setUsuario(s.usuario)
    return s.usuario
  }, [])

  const registro = useCallback(async (data: Parameters<typeof authApi.registro>[0]) => {
    const s = await authApi.registro(data)
    tokenStore.set(s.access_token)
    setUsuario(s.usuario)
    return s.usuario
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUsuario(null)
  }, [])

  const tieneRol = useCallback((...roles: Rol[]) => !!usuario && roles.includes(usuario.rol), [usuario])

  return <Ctx.Provider value={{ usuario, cargando, login, registro, logout, tieneRol }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
