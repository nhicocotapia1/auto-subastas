import { Link } from 'react-router-dom'

/** Logotipo AUTO-SUBASTAS: silueta de auto en verde + texto en itálica */
export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2" aria-label="Auto-Subastas, ir al catálogo">
      <svg viewBox="0 0 120 40" className="h-9 w-auto shrink-0" aria-hidden="true">
        <path d="M4 30 C14 14, 34 8, 58 9 C78 10, 92 16, 104 24 L116 26"
          fill="none" stroke="#16A34A" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M22 22 C34 15, 50 13, 64 14 C74 15, 82 18, 88 22"
          fill="none" stroke="#7F9DCB" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      </svg>
      <span className="-ml-14 mt-3 text-lg font-extrabold italic tracking-tight text-white sm:text-xl">
        AUTO-<span className="text-exito">SUBASTAS</span>
      </span>
    </Link>
  )
}
