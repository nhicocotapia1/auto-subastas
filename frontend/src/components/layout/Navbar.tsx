import { ChevronDown, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/format'
import { Logo } from './Logo'

export function Navbar() {
  const { usuario, logout, tieneRol } = useAuth()
  const [menuPerfil, setMenuPerfil] = useState(false)
  const [menuMovil, setMenuMovil] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { setMenuMovil(false); setMenuPerfil(false) }, [location.pathname])
  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuPerfil(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const links = [
    { to: '/', texto: 'Catálogo', visible: true },
    { to: '/mis-pujas', texto: 'Mis Pujas', visible: !usuario || tieneRol('comprador') },
    { to: '/publicar', texto: 'Publicar Lote', visible: !usuario || tieneRol('vendedor_tasador', 'administrador') },
  ].filter((l) => l.visible)

  const salir = () => { logout(); navigate('/') }

  const claseLink = ({ isActive }: { isActive: boolean }) =>
    `relative px-1 py-1 text-sm font-semibold transition ${isActive ? 'text-white after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded after:bg-exito' : 'text-navy-100 hover:text-white'}`

  return (
    <header className="sticky top-0 z-40 overflow-hidden bg-navy-800 shadow-lg">
      {/* Fondo decorativo con siluetas de autos, como en los prototipos */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-700 to-navy-800" />
      <svg aria-hidden viewBox="0 0 600 80" className="pointer-events-none absolute right-0 top-0 h-full w-[60%] opacity-[0.12]" preserveAspectRatio="xMaxYMid slice">
        <path d="M40 62 C70 38 120 30 170 31 C215 32 240 40 270 52 L300 56 L302 66 L40 66 Z" fill="#fff" />
        <circle cx="90" cy="66" r="11" fill="#0B2146" /><circle cx="250" cy="66" r="11" fill="#0B2146" />
        <path d="M320 64 C350 34 410 26 470 27 C520 28 550 38 580 52 L600 54 L600 68 L320 68 Z" fill="#fff" />
        <circle cx="380" cy="68" r="12" fill="#0B2146" /><circle cx="545" cy="68" r="12" fill="#0B2146" />
      </svg>

      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={claseLink}>{l.texto}</NavLink>)}

          {usuario ? (
            <div ref={ref} className="relative">
              <button onClick={() => setMenuPerfil((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-white/40 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
                aria-expanded={menuPerfil}>
                <User className="h-4 w-4" /> {usuario.nombre.split(' ')[0]} <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {menuPerfil && (
                <div className="animate-fade-in absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-bold text-navy-800">{usuario.nombre}</p>
                    <p className="truncate text-xs text-slate-500">{usuario.email}</p>
                    <span className="chip mt-1.5 bg-navy-50 text-navy-700">{ROLES[usuario.rol]}</span>
                  </div>
                  {tieneRol('vendedor_tasador', 'administrador') && (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-navy-50">
                      <LayoutDashboard className="h-4 w-4" /> Panel de control
                    </Link>
                  )}
                  <button onClick={salir} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-carmesi hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-1.5 rounded-lg border border-white/40 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10">
              <User className="h-4 w-4" /> Iniciar sesión
            </Link>
          )}
        </div>

        <button className="rounded p-2 text-white md:hidden" onClick={() => setMenuMovil((v) => !v)} aria-label="Abrir menú">
          {menuMovil ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {menuMovil && (
        <div className="animate-fade-in relative border-t border-white/10 bg-navy-800 px-4 pb-4 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) => `block rounded-lg px-3 py-3 text-base font-semibold ${isActive ? 'bg-white/10 text-white' : 'text-navy-100'}`}>
              {l.texto}
            </NavLink>
          ))}
          {usuario ? (
            <>
              {tieneRol('vendedor_tasador', 'administrador') && (
                <Link to="/admin" className="block rounded-lg px-3 py-3 text-base font-semibold text-navy-100">Panel de control</Link>
              )}
              <div className="mt-2 border-t border-white/10 pt-3 text-sm text-navy-100">
                {usuario.nombre} · {ROLES[usuario.rol]}
              </div>
              <button onClick={salir} className="mt-2 w-full rounded-lg border border-white/30 py-3 font-semibold text-white">Cerrar sesión</button>
            </>
          ) : (
            <Link to="/login" className="mt-2 block rounded-lg bg-exito py-3 text-center font-semibold text-white">Iniciar sesión / Registrarse</Link>
          )}
        </div>
      )}
    </header>
  )
}
