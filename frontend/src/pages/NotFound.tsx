import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/Feedback'

export default function NotFound() {
  return (
    <EmptyState
      icono={<MapPinOff className="h-14 w-14" />}
      titulo="Página no encontrada"
      texto="La dirección que buscas no existe o fue movida."
      accion={<Link to="/" className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white">Ir al catálogo</Link>}
    />
  )
}
