// Modal de confirmación de postura vinculante (Figura 6 del informe)
import { Gavel, Info } from 'lucide-react'
import { clp } from '../../lib/format'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface Props {
  abierto: boolean
  monto: number
  idLote: number
  titulo: string
  enviando: boolean
  onCancelar: () => void
  onConfirmar: () => void
}

export function ConfirmarPosturaModal({ abierto, monto, idLote, titulo, enviando, onCancelar, onConfirmar }: Props) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCancelar}
      titulo="Confirmar postura"
      icono={<span className="rounded-lg bg-navy-700 p-2 text-white"><Gavel className="h-5 w-5" /></span>}
      pie={
        <>
          <Button variante="secundario" onClick={onCancelar} disabled={enviando}>Cancelar</Button>
          <Button onClick={onConfirmar} cargando={enviando} icono={<Gavel className="h-4 w-4" />}>Confirmar oferta</Button>
        </>
      }
    >
      <p className="text-sm text-slate-700">
        ¿Deseas confirmar tu oferta de <b className="text-exito">{clp(monto)}</b> para el Lote #{idLote} – <b>{titulo}</b>?
      </p>
      <div className="mt-4 flex gap-2 rounded-lg border border-navy-200 bg-navy-50 p-3 text-xs text-navy-800">
        <Info className="h-4 w-4 shrink-0" />
        <p>Esta postura es vinculante. Si resultas ganador al término del remate, se generará la orden de pre-venta oficial.</p>
      </div>
    </Modal>
  )
}
