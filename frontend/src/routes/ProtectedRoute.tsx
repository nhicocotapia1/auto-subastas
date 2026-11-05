// Protege rutas según sesión y rol. Si no hay sesión redirige a /login y luego devuelve al usuario.
import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { EmptyState, Spinner } from '../components/ui/Feedback'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../lib/format'
import type { Rol } from '../types'

export function ProtectedRoute({ roles, children }: { roles?: Rol[]; children: ReactNode }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) return <Spinner texto="Verificando sesión…" />
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (roles && !roles.includes(usuario.rol)) {
    return (
      <EmptyState
        icono={<ShieldAlert className="h-14 w-14 text-carmesi" />}
        titulo="Acceso restringido"
        texto={`Esta sección es solo para: ${roles.map((r) => ROLES[r]).join(', ')}. Tu cuenta es de tipo ${ROLES[usuario.rol]}.`}
      />
    )
  }
  return <>{children}</>
}
