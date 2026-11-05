// Pantalla 2 – Ficha técnica del lote y módulo transaccional de puja (Figuras 5, 6 y 12)
import {
  ArrowLeft, BarChart3, CheckCircle2, Download, FileText, Gavel, Hash, Maximize2, MapPin, Users, Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConfirmarPosturaModal } from '../components/subastas/ConfirmarPosturaModal'
import { Countdown } from '../components/subastas/Countdown'
import { LoteImagen } from '../components/subastas/LoteImagen'
import { DanioBadge, EstadoBadge, TipoBadge } from '../components/ui/Badges'
import { Button } from '../components/ui/Button'
import { Alerta, ErrorState, Spinner } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { capitalizar, clp, haceCuanto, VISTAS } from '../lib/format'
import { descargarInforme } from '../lib/informe'
import { ApiError, subastasApi } from '../services/api'
import type { ItemPieza, ItemVehiculo, SubastaDetalle } from '../types'

const VISTAS_VEHICULO = ['frontal', 'motor', 'chasis', 'habitaculo']

export default function DetalleLote() {
  const { id } = useParams()
  const idNum = Number(id)
  const { usuario, tieneRol } = useAuth()
  const { notificar } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [s, setS] = useState<SubastaDetalle | null>(null)
  const [error, setError] = useState<{ msg: string; status: number } | null>(null)
  const [vista, setVista] = useState<string>('frontal')
  const [monto, setMonto] = useState('')
  const [errorMonto, setErrorMonto] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [ampliar, setAmpliar] = useState(false)
  const [flash, setFlash] = useState(0)

  const cargar = useCallback(async (silencioso = false) => {
    try {
      const d = await subastasApi.detalle(idNum)
      setS((prev) => {
        if (prev && prev.precio_actual !== d.precio_actual) setFlash((f) => f + 1)
        return d
      })
      setError(null)
    } catch (e) {
      if (!silencioso) setError({ msg: (e as Error).message, status: (e as ApiError).status })
    }
  }, [idNum])

  useEffect(() => {
    if (!Number.isInteger(idNum) || idNum <= 0) { setError({ msg: 'El identificador del lote no es válido.', status: 400 }); return }
    cargar()
    // Actualización periódica para ver posturas de otros usuarios
    const t = setInterval(() => cargar(true), 10000)
    return () => clearInterval(t)
  }, [cargar, idNum])

  // Sugiere el monto mínimo cuando cambia el precio
  useEffect(() => { if (s) setMonto(String(s.monto_minimo)) }, [s?.monto_minimo]) // eslint-disable-line react-hooks/exhaustive-deps

  const imagenes = useMemo(() => s?.item.imagenes ?? [], [s])
  const vistas = s?.tipo_lote === 'vehiculo_completo'
    ? VISTAS_VEHICULO
    : imagenes.length ? imagenes.map((i) => i.tipo_vista).filter((v, i, a) => a.indexOf(v) === i) : ['superior']
  const primeraVista = vistas[0]
  // Al cargar un lote se selecciona su primera vista disponible
  useEffect(() => { setVista(primeraVista) }, [s?._id, primeraVista])
  const imagenActual =imagenes.find((i) => i.tipo_vista === vista) ?? (vista === vistas[0] ? imagenes.find((i) => i.es_portada) : undefined)

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700"><ArrowLeft className="h-4 w-4" />Volver al catálogo</Link>
        <ErrorState mensaje={error.msg} onReintentar={error.status === 404 ? undefined : () => cargar()} />
      </div>
    )
  }
  if (!s) return <Spinner texto="Cargando ficha técnica…" />

  const activa = s.estado_subasta === 'activa' && new Date(s.fecha_termino).getTime() > Date.now()
  const esLider = !!usuario && s.postor_lider?._id === usuario.id
  const esVendedor = !!usuario && s.vendedor._id === usuario.id
  const vehiculo = s.tipo_lote === 'vehiculo_completo' ? (s.item as ItemVehiculo) : null
  const pieza = s.tipo_lote === 'pieza_desarme' ? (s.item as ItemPieza) : null
  const montoNum = Number(monto.replace(/\D/g, ''))

  const validarMonto = (): boolean => {
    if (!montoNum) { setErrorMonto('Ingresa el monto de tu oferta.'); return false }
    if (montoNum < s.monto_minimo) { setErrorMonto(`El monto mínimo para ofertar es ${clp(s.monto_minimo)}.`); return false }
    setErrorMonto(null)
    return true
  }

  const iniciarPuja = () => {
    if (!usuario) { navigate('/login', { state: { desde: location.pathname } }); return }
    if (validarMonto()) setConfirmar(true)
  }

  const enviarPuja = async () => {
    setEnviando(true)
    try {
      const r = await subastasApi.pujar(s._id, montoNum)
      notificar(`${r.mensaje} Ahora lideras con ${clp(r.nuevo_precio_lider)}.`, 'exito')
      setConfirmar(false)
      await cargar()
    } catch (e) {
      const err = e as ApiError
      setConfirmar(false)
      setErrorMonto(err.message)
      notificar(err.message, 'error')
      if (err.status === 409 || err.codigo === 'SUBASTA_FINALIZADA') cargar()
    } finally {
      setEnviando(false)
    }
  }

  const sumar = (n: number) => { setMonto(String(Math.max(montoNum, s.precio_actual) + n)); setErrorMonto(null) }

  const incrementos = s.tipo_lote === 'vehiculo_completo' ? [50000, 100000, 150000] : [10000, 20000, 50000]

  // Bloque de puja reutilizado en escritorio
  const bloquePuja = () => {
    if (!activa) {
      return (
        <Alerta tipo="info">
          Este remate se encuentra <b>{s.estado_subasta}</b>.{' '}
          {s.ganador ? <>Ganador: <b>{s.ganador.alias}</b> con {clp(s.precio_actual)}.</> : 'No admite nuevas posturas.'}
        </Alerta>
      )
    }
    if (usuario && !tieneRol('comprador')) {
      return <Alerta tipo="info">Solo las cuentas de tipo <b>comprador</b> pueden realizar posturas.</Alerta>
    }
    if (esVendedor) return <Alerta tipo="info">Eres el vendedor de este lote.</Alerta>
    return (
      <>
        {esLider && <Alerta tipo="exito">¡Vas ganando! Tu oferta es la postura líder. Podrás volver a pujar si alguien te supera.</Alerta>}
        {!esLider && <>
        <div className="mt-3">
          <label htmlFor="monto" className="label">Monto de tu oferta (mínimo {clp(s.monto_minimo)})</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
            <input id="monto" inputMode="numeric" className={`input pl-7 text-lg font-bold ${errorMonto ? 'input-error' : ''}`}
              value={montoNum ? montoNum.toLocaleString('es-CL') : ''}
              onChange={(e) => { setMonto(e.target.value.replace(/\D/g, '')); setErrorMonto(null) }}
              aria-invalid={!!errorMonto} aria-describedby="monto-error" />
          </div>
          {errorMonto && <p id="monto-error" className="field-error">{errorMonto}</p>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {incrementos.map((n) => (
            <button key={n} type="button" onClick={() => sumar(n)}
              className="rounded-lg border border-navy-200 py-2 text-xs font-bold text-navy-700 hover:bg-navy-50">+ {clp(n)}</button>
          ))}
        </div>
        </>}
        <Button className="mt-3 w-full" tamano="lg" onClick={iniciarPuja} disabled={esLider} icono={<Gavel className="h-5 w-5" />}>
          {usuario ? (esLider ? 'Eres el postor líder' : 'Confirmar postura') : 'Inicia sesión para pujar'}
        </Button>
      </>
    )
  }

  return (
    <div className="pb-24 lg:pb-0">
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* ----------------- Columna izquierda: ficha técnica ----------------- */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{s.titulo}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{s.item.region_ubicacion}</span>
              {vehiculo ? <DanioBadge nivel={vehiculo.nivel_danio} solido /> : <span className="chip bg-carmesi text-white">Desarme / {capitalizar(pieza?.categoria)}</span>}
              <TipoBadge tipo={s.tipo_lote} />
              {!activa && <EstadoBadge estado={s.estado_subasta} />}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="relative aspect-[16/9]">
              <LoteImagen url={imagenActual?.url_archivo} tipo={s.tipo_lote} vista={VISTAS[vista] ?? vista} alt={`${s.titulo} – vista ${vista}`} />
              {imagenActual && (
                <button onClick={() => setAmpliar(true)}
                  className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-navy-800/90 px-3 py-1.5 text-xs font-semibold text-white">
                  <Maximize2 className="h-3.5 w-3.5" /> Ampliar imagen
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 p-2" role="tablist" aria-label="Vistas del peritaje">
              {vistas.map((v) => (
                <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                  className={`rounded-lg py-2 text-xs font-semibold transition sm:text-sm ${vista === v ? 'bg-navy-700 text-white' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'}`}>
                  {VISTAS[v] ?? capitalizar(v)}
                </button>
              ))}
            </div>
          </div>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><FileText className="h-5 w-5" />Especificaciones técnicas</h2>
            <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
              {(vehiculo ? [
                ['VIN / Patente', `${vehiculo.vin_chasis} / ${vehiculo.patente || 'Sin patente'}`],
                ['Kilometraje', vehiculo.kilometraje != null ? `${vehiculo.kilometraje.toLocaleString('es-CL')} km` : '—'],
                ['Airbags', vehiculo.airbags || '—'],
                ['Documentación', vehiculo.documentacion || '—'],
                ['Tipo de vehículo', capitalizar(vehiculo.tipo_vehiculo)],
                ['Año', String(vehiculo.anio)],
              ] : [
                ['N° parte OEM', pieza?.numero_parte_oem || '—'],
                ['Marca de origen', pieza?.marca ?? '—'],
                ['Estado de desgaste', capitalizar(pieza?.estado_desgaste)],
                ['Compatibilidad', pieza?.compatibilidad.join(', ') || '—'],
              ]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-2">
                  <dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => { if (!descargarInforme(s)) notificar('Permite las ventanas emergentes para descargar el informe.', 'error') }}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:underline">
              <Download className="h-4 w-4" /> Descargar informe pericial PDF
            </button>
          </section>

          <section className="card p-5">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Wrench className="h-5 w-5" />Diagnóstico del perito mecánico</h2>
            <p className="flex gap-2 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-exito" />
              {vehiculo ? vehiculo.descripcion_danio : pieza?.observaciones_tecnicas}
            </p>
            <p className="mt-3 text-xs text-slate-400">Publicado por {s.vendedor.nombre_comercial}</p>
          </section>
        </div>

        {/* ----------------- Columna derecha: módulo de puja ----------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <section className="card border-l-4 border-l-exito p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1 text-lg font-extrabold"><Hash className="h-4 w-4" />Lote {s._id}</h2>
              {activa ? <Countdown hasta={s.fecha_termino} variante="pill" onTermina={() => cargar(true)} /> : <EstadoBadge estado={s.estado_subasta} />}
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><Gavel className="h-3.5 w-3.5" />Precio base {clp(s.precio_base)}</p>
            <p key={flash} className={`rounded text-4xl font-extrabold text-exito ${flash ? 'animate-flash' : ''}`}>{clp(s.precio_actual)}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {s.postor_lider ? <>Usuario líder: <b>{s.postor_lider.alias}</b></> : 'Aún sin posturas'} · Incremento mínimo: {clp(s.incremento_minimo)}
            </p>
          </section>

          <section className="card p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><BarChart3 className="h-4 w-4" />Historial de posturas recientes</h3>
            {s.posturas_recientes.length === 0 ? (
              <p className="text-sm text-slate-500">Sé el primero en ofertar.</p>
            ) : (
              <ul className="space-y-1.5">
                {s.posturas_recientes.map((p, i) => (
                  <li key={p.id_postura} className="flex justify-between text-sm">
                    <span className={`font-bold ${i === 0 ? 'text-exito' : 'text-slate-700'}`}>{clp(p.monto)}</span>
                    <span className="text-xs text-slate-500">{p.postor_alias} · {haceCuanto(p.fecha_hora)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate-400">{s.total_posturas} postura(s) en total</p>
          </section>

          <section className="card p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Gavel className="h-4 w-4" />Tu postura</h3>
            {bloquePuja()}
          </section>
        </aside>
      </div>

      {/* Sticky footer móvil (Figura 12) */}
      {activa && (!usuario || tieneRol('comprador')) && !esVendedor && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-navy-100 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(15,44,89,0.1)] backdrop-blur lg:hidden">
          <div className="flex-1">
            <p className="text-[11px] text-slate-500">Precio actual</p>
            <p className="text-xl font-extrabold text-exito">{clp(s.precio_actual)}</p>
          </div>
          <Button tamano="lg" onClick={iniciarPuja} disabled={esLider} icono={<Gavel className="h-5 w-5" />}>
            {esLider ? 'Vas ganando' : `Pujar ${clp(montoNum || s.monto_minimo)}`}
          </Button>
        </div>
      )}

      <ConfirmarPosturaModal abierto={confirmar} monto={montoNum} idLote={s._id} titulo={s.titulo} enviando={enviando}
        onCancelar={() => setConfirmar(false)} onConfirmar={enviarPuja} />

      <Modal abierto={ampliar} onCerrar={() => setAmpliar(false)} titulo={`${s.titulo} – ${VISTAS[vista] ?? vista}`} ancho="max-w-5xl">
        <LoteImagen url={imagenActual?.url_archivo} tipo={s.tipo_lote} alt={s.titulo} className="rounded-lg" />
      </Modal>
    </div>
  )
}
