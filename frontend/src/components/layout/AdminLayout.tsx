// Panel de control con barra lateral (Figura 9 del informe)
import { Database, Gavel, Package, PlusCircle, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminLayout() {
  const { tieneRol } = useAuth()
  const esAdmin = tieneRol('administrador')

  const items = [
    { to: '/admin', texto: 'Lotes / Remates', Icono: Package, visible: true },
    { to: '/admin/usuarios', texto: 'Usuarios', Icono: Users, visible: esAdmin },
    { to: '/admin/adjudicaciones', texto: 'Adjudicaciones', Icono: Gavel, visible: esAdmin },
    { to: '/admin/consultas', texto: 'Consultas', Icono: Database, visible: esAdmin },
    { to: '/publicar', texto: 'Publicar lote', Icono: PlusCircle, visible: true },
  ].filter((i) => i.visible)

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <aside className="card h-fit shrink-0 p-2 lg:sticky lg:top-24 lg:w-56">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {items.map(({ to, texto, Icono }) => (
            <NavLink key={to} to={to} end={to === '/admin'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-navy-700 text-white' : 'text-navy-700 hover:bg-navy-50'}`}>
              <Icono className="h-4 w-4" /> {texto}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 flex-1">
        <Outlet />
      </section>
    </div>
  )
}
