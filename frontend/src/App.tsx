// Rutas de la aplicación, en el orden del flujo de navegación del informe (sección 7.2)
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/layout/AdminLayout'
import { Layout } from './components/layout/Layout'
import { useAuth } from './context/AuthContext'
import AdminAdjudicaciones from './pages/admin/AdminAdjudicaciones'
import AdminConsultas from './pages/admin/AdminConsultas'
import AdminLotes from './pages/admin/AdminLotes'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import Catalogo from './pages/Catalogo'
import DetalleLote from './pages/DetalleLote'
import Login from './pages/Login'
import MisPujas from './pages/MisPujas'
import NotFound from './pages/NotFound'
import PublicarLote from './pages/PublicarLote'
import { ProtectedRoute } from './routes/ProtectedRoute'

function SoloInvitado({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  return usuario ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Público */}
        <Route index element={<Catalogo />} />
        <Route path="lote/:id" element={<DetalleLote />} />
        <Route path="login" element={<SoloInvitado><Login /></SoloInvitado>} />

        {/* Comprador */}
        <Route path="mis-pujas" element={<ProtectedRoute roles={['comprador']}><MisPujas /></ProtectedRoute>} />

        {/* Vendedor / Tasador y Administrador */}
        <Route path="publicar" element={<ProtectedRoute roles={['vendedor_tasador', 'administrador']}><PublicarLote /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute roles={['vendedor_tasador', 'administrador']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminLotes />} />
          <Route path="usuarios" element={<ProtectedRoute roles={['administrador']}><AdminUsuarios /></ProtectedRoute>} />
          <Route path="adjudicaciones" element={<ProtectedRoute roles={['administrador']}><AdminAdjudicaciones /></ProtectedRoute>} />
          <Route path="consultas" element={<ProtectedRoute roles={['administrador']}><AdminConsultas /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
