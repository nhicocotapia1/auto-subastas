import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-navy-100 bg-white/60 py-4 text-center text-xs text-slate-500">
        Auto-Subastas · ICI-324 Bases de Datos y Programación Web · Universidad de Valparaíso
      </footer>
    </div>
  )
}
