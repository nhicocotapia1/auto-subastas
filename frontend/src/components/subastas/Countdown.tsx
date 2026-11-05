import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { tiempoRestante } from '../../lib/format'

/** Cronómetro regresivo que se actualiza cada segundo */
export function Countdown({ hasta, onTermina, variante = 'texto' }: { hasta: string; onTermina?: () => void; variante?: 'texto' | 'pill' }) {
  const [ahora, setAhora] = useState(Date.now())
  const t = tiempoRestante(hasta, ahora)

  useEffect(() => {
    if (t.terminado) { onTermina?.(); return }
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [t.terminado, onTermina])

  if (variante === 'pill') {
    const color = t.terminado ? 'bg-slate-100 text-slate-500 ring-slate-200' : t.urgente ? 'bg-red-50 text-carmesi ring-red-200' : 'bg-green-50 text-exito ring-green-200'
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ring-1 ${color}`}>
        <Clock className="h-4 w-4" /> {t.texto}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Clock className="h-3.5 w-3.5" />
      {t.terminado ? 'Finalizada' : <>Termina en <b className={t.urgente ? 'text-carmesi' : 'text-navy-800'}>{t.texto}</b></>}
    </span>
  )
}
