// Muestra la foto del lote o, si aún no tiene fotos, una ilustración de reemplazo
import { Cog } from 'lucide-react'
import { useState } from 'react'
import { urlArchivo } from '../../services/api'

interface Props {
  url?: string | null
  tipo: string
  vista?: string
  alt: string
  className?: string
}

export function LoteImagen({ url, tipo, vista, alt, className = '' }: Props) {
  const [error, setError] = useState(false)
  const src = urlArchivo(url)

  if (src && !error) {
    return <img src={src} alt={alt} onError={() => setError(true)} loading="lazy" className={`h-full w-full object-cover ${className}`} />
  }
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-navy-50 to-slate-200 ${className}`} role="img" aria-label={`${alt} (sin foto)`}>
      {tipo === 'pieza_desarme' ? (
        <Cog className="h-1/2 w-1/2 text-navy-300" strokeWidth={1.2} />
      ) : (
        <svg viewBox="0 0 200 90" className="w-3/4 max-w-xs" aria-hidden="true">
          <ellipse cx="100" cy="80" rx="86" ry="6" fill="#0F2C59" opacity="0.10" />
          <path d="M14 66 C16 54 26 50 40 47 L62 30 C70 24 80 22 96 22 L124 22 C136 22 146 27 154 34 L168 46 C182 48 190 54 190 64 L190 70 L14 70 Z"
            fill="#B3C6E3" stroke="#4A6FA8" strokeWidth="2" />
          <path d="M68 33 C74 28 82 27 94 27 L98 27 L98 46 L52 46 Z" fill="#EEF3FA" stroke="#7F9DCB" strokeWidth="1.5" />
          <path d="M104 27 L122 27 C132 27 140 31 147 38 L154 46 L104 46 Z" fill="#EEF3FA" stroke="#7F9DCB" strokeWidth="1.5" />
          <circle cx="52" cy="70" r="13" fill="#173A6E" /><circle cx="52" cy="70" r="5.5" fill="#D9E3F2" />
          <circle cx="152" cy="70" r="13" fill="#173A6E" /><circle cx="152" cy="70" r="5.5" fill="#D9E3F2" />
        </svg>
      )}
      {vista && (
        <span className="absolute bottom-2 left-2 rounded bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-600">
          Vista {vista} · sin foto
        </span>
      )}
    </div>
  )
}
