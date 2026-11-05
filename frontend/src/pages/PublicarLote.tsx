// Pantalla 5 – Publicación de nuevo lote vehicular o repuesto en desarme (CU03 – Figura 10)
import { ArrowRight, Car, Check, Gavel, Save, UploadCloud, Wrench, X } from 'lucide-react'
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Alerta } from '../components/ui/Feedback'
import { useToast } from '../context/ToastContext'
import { capitalizar, VISTAS } from '../lib/format'
import { adminApi, ApiError } from '../services/api'
import type { Catalogos, TipoLote } from '../types'

const BORRADOR_KEY = 'as_borrador_lote'
const MARCAS = ['Chevrolet', 'Ford', 'Honda', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Nissan', 'Peugeot', 'Suzuki', 'Toyota', 'Volkswagen']
const DURACIONES = [[24, '24 horas (1 día)'], [48, '48 horas (2 días)'], [72, '72 horas (3 días)'], [120, '5 días'], [168, '7 días']]
const VISTAS_FOTO = ['frontal', 'motor', 'chasis', 'habitaculo', 'lateral', 'trasera', 'superior', 'detalle']
const MAX_MB = 10

interface Foto { archivo: File; url: string; vista: string }

const VACIO = {
  tipo_lote: 'vehiculo_completo' as TipoLote,
  vin_chasis: '', patente: '', marca: '', modelo: '', anio: '', kilometraje: '', tipo_vehiculo: 'sedan',
  airbags: '', documentacion: 'Al día', region_ubicacion: 'Valparaíso', nivel_danio: 'medio',
  nombre_pieza: '', categoria: 'motor', compatibilidad: '', estado_desgaste: 'operativo_verificado', numero_parte_oem: '',
  dictamen: '', precio_base: '', incremento_minimo: '', duracion_horas: '72',
}
type Form = typeof VACIO

function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-100 py-5 last:border-0">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-sm text-white">{n}</span>{titulo}
      </h2>
      {children}
    </section>
  )
}

export default function PublicarLote() {
  const navigate = useNavigate()
  const { notificar } = useToast()
  const [f, setF] = useState<Form>(() => {
    try { return { ...VACIO, ...JSON.parse(localStorage.getItem(BORRADOR_KEY) ?? '{}') } } catch { return VACIO }
  })
  const [fotos, setFotos] = useState<Foto[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null)
  const inputFile = useRef<HTMLInputElement>(null)

  useEffect(() => { adminApi.catalogos().then(setCatalogos).catch(() => setCatalogos(null)) }, [])
  useEffect(() => () => fotos.forEach((p) => URL.revokeObjectURL(p.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const esVehiculo = f.tipo_lote === 'vehiculo_completo'
  const set = (campo: keyof Form, valor: string) => {
    setF((p) => ({ ...p, [campo]: valor }))
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: '' }))
  }

  const agregarFotos = (lista: FileList | null) => {
    if (!lista) return
    const nuevas: Foto[] = []
    for (const a of Array.from(lista)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(a.type)) { notificar(`"${a.name}" no es JPG, PNG o WEBP.`, 'error'); continue }
      if (a.size > MAX_MB * 1024 * 1024) { notificar(`"${a.name}" supera los ${MAX_MB} MB.`, 'error'); continue }
      nuevas.push({ archivo: a, url: URL.createObjectURL(a), vista: VISTAS_FOTO[(fotos.length + nuevas.length) % 4] })
    }
    if (fotos.length + nuevas.length > 8) { notificar('Máximo 8 fotos por lote.', 'error'); return }
    setFotos((p) => [...p, ...nuevas])
  }

  const validar = () => {
    const e: Record<string, string> = {}
    if (esVehiculo) {
      if (!/^[A-Za-z0-9]{11,17}$/.test(f.vin_chasis.trim())) e.vin_chasis = 'El VIN debe tener entre 11 y 17 caracteres alfanuméricos.'
      if (f.marca.trim().length < 2) e.marca = 'Indica la marca.'
      if (!f.modelo.trim()) e.modelo = 'Indica el modelo.'
      const anio = Number(f.anio)
      if (!anio || anio < 1980 || anio > new Date().getFullYear() + 1) e.anio = 'Año entre 1980 y el próximo año.'
      if (f.kilometraje && Number(f.kilometraje) < 0) e.kilometraje = 'Kilometraje inválido.'
    } else {
      if (f.nombre_pieza.trim().length < 3) e.nombre_pieza = 'Indica el nombre de la pieza.'
      if (f.marca.trim().length < 2) e.marca = 'Indica la marca del vehículo de origen.'
    }
    if (f.dictamen.trim().length < 10) e.dictamen = 'Describe el peritaje con al menos 10 caracteres.'
    if (!Number(f.precio_base) || Number(f.precio_base) <= 0) e.precio_base = 'Ingresa un precio base mayor a $0.'
    if (f.incremento_minimo && Number(f.incremento_minimo) <= 0) e.incremento_minimo = 'El incremento debe ser mayor a $0.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const construirPayload = () => ({
    tipo_lote: f.tipo_lote,
    precio_base: Number(f.precio_base),
    incremento_minimo: f.incremento_minimo ? Number(f.incremento_minimo) : undefined,
    duracion_horas: Number(f.duracion_horas),
    item: esVehiculo ? {
      vin_chasis: f.vin_chasis.trim(), patente: f.patente.trim() || null, marca: f.marca.trim(), modelo: f.modelo.trim(),
      anio: Number(f.anio), tipo_vehiculo: f.tipo_vehiculo, nivel_danio: f.nivel_danio,
      kilometraje: f.kilometraje ? Number(f.kilometraje) : null, airbags: f.airbags || null, documentacion: f.documentacion || null,
      region_ubicacion: f.region_ubicacion, descripcion_danio: f.dictamen.trim(),
    } : {
      nombre_pieza: f.nombre_pieza.trim(), categoria: f.categoria, marca: f.marca.trim(),
      compatibilidad: f.compatibilidad.split(',').map((x) => x.trim()).filter(Boolean),
      estado_desgaste: f.estado_desgaste, numero_parte_oem: f.numero_parte_oem.trim() || null,
      region_ubicacion: f.region_ubicacion, observaciones_tecnicas: f.dictamen.trim(),
    },
  })

  const publicar = async () => {
    setErrorGeneral(null)
    if (!validar()) { notificar('Revisa los campos marcados en rojo.', 'error'); return }
    setEnviando(true)
    try {
      const r = await adminApi.crearLote(construirPayload())
      if (fotos.length) {
        try {
          await adminApi.subirImagenes(r.id_subasta, fotos.map((p) => p.archivo), fotos.map((p) => p.vista))
        } catch (e) {
          notificar(`El lote se publicó, pero falló la carga de fotos: ${(e as Error).message}`, 'error')
        }
      }
      try { localStorage.removeItem(BORRADOR_KEY) } catch { /* sin almacenamiento */ }
      notificar(`${r.mensaje} (Lote #${r.id_subasta})`, 'exito')
      navigate(`/lote/${r.id_subasta}`)
    } catch (e) {
      const err = e as ApiError
      if (err.detalles?.length) {
        const mapa: Record<string, string> = {}
        err.detalles.forEach((d) => {
          const c = d.campo.split('.').pop()!
          mapa[c === 'descripcion_danio' || c === 'observaciones_tecnicas' ? 'dictamen' : c] = d.mensaje
        })
        setErrores(mapa)
      }
      setErrorGeneral(err.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setEnviando(false)
    }
  }

  const guardarBorrador = () => {
    try {
      localStorage.setItem(BORRADOR_KEY, JSON.stringify(f))
      notificar('Borrador guardado en este navegador (las fotos no se guardan).', 'info')
    } catch {
      notificar('No se pudo guardar el borrador en este navegador.', 'error')
    }
  }

  const input = (campo: keyof Form, etiqueta: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={campo} className="label">{etiqueta}</label>
      <input id={campo} className={`input ${errores[campo] ? 'input-error' : ''}`} value={f[campo]}
        onChange={(e) => set(campo, e.target.value)} aria-invalid={!!errores[campo]} {...props} />
      {errores[campo] && <p className="field-error">{errores[campo]}</p>}
    </div>
  )
  const select = (campo: keyof Form, etiqueta: string, opciones: (string | number)[][] | string[]) => (
    <div>
      <label htmlFor={campo} className="label">{etiqueta}</label>
      <select id={campo} className="input" value={f[campo]} onChange={(e) => set(campo, e.target.value)}>
        {opciones.map((o) => Array.isArray(o)
          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
          : <option key={o} value={o}>{capitalizar(o)}</option>)}
      </select>
    </div>
  )

  const regiones = catalogos?.regiones ?? ['Valparaíso', 'Metropolitana']

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <Gavel className="h-9 w-9 text-exito" />
        <div>
          <h1 className="text-3xl font-extrabold">Publicar nuevo lote de subasta</h1>
          <p className="text-sm text-slate-500">Completa los datos técnicos del peritaje y los parámetros del remate</p>
        </div>
      </div>

      {errorGeneral && <div className="mb-4"><Alerta tipo="error">{errorGeneral}</Alerta></div>}

      <div className="card px-5 sm:px-6">
        <Paso n={1} titulo="Modalidad y tipo de lote">
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['vehiculo_completo', 'Vehículo Completo Siniestrado', 'Unidad entera con dictamen de daño', Car],
              ['pieza_desarme', 'Pieza / Repuesto en Desarme', 'Componentes sueltos de un vehículo', Wrench],
            ] as const).map(([v, t, d, Icono]) => (
              <button key={v} type="button" onClick={() => set('tipo_lote', v)} aria-pressed={f.tipo_lote === v}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${f.tipo_lote === v ? 'border-navy-600 bg-navy-50' : 'border-slate-200 hover:border-navy-200'}`}>
                <span className={`rounded-lg p-2 ${f.tipo_lote === v ? 'bg-navy-700 text-white' : 'bg-slate-100 text-navy-700'}`}><Icono className="h-5 w-5" /></span>
                <span className="flex-1"><b className="block text-sm text-navy-800">{t}</b><span className="text-xs text-slate-500">{d}</span></span>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${f.tipo_lote === v ? 'border-navy-700 bg-navy-700 text-white' : 'border-slate-300'}`}>
                  {f.tipo_lote === v && <Check className="h-4 w-4" />}
                </span>
              </button>
            ))}
          </div>
        </Paso>

        <Paso n={2} titulo={esVehiculo ? 'Especificaciones técnicas del vehículo' : 'Especificaciones técnicas de la pieza'}>
          <datalist id="marcas">{MARCAS.map((m) => <option key={m} value={m} />)}</datalist>
          {esVehiculo ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {input('vin_chasis', 'VIN / Chasis', { placeholder: '8AWCA41JX240998', maxLength: 17 })}
              {input('patente', 'Patente (opcional si es desarme)', { placeholder: 'KB-XX-12', maxLength: 10 })}
              {input('marca', 'Marca', { list: 'marcas', placeholder: 'Toyota' })}
              {input('modelo', 'Modelo', { placeholder: 'Yaris Sport' })}
              {input('anio', 'Año', { type: 'number', min: 1980, placeholder: '2020' })}
              {input('kilometraje', 'Kilometraje', { type: 'number', min: 0, placeholder: '45000' })}
              {select('tipo_vehiculo', 'Tipo de vehículo', catalogos?.tipos_vehiculo ?? ['sedan', 'hatchback', 'suv', 'camioneta'])}
              {input('airbags', 'Airbags', { placeholder: 'Desplegados (2)' })}
              {input('documentacion', 'Documentación', { placeholder: 'Al día' })}
              {select('region_ubicacion', 'Región de custodia', regiones)}
              <div className="sm:col-span-2">
                <span className="label">Nivel de daño</span>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {([['leve', 'Leve', 'exito', 'bg-green-50 border-exito text-exito'], ['medio', 'Medio', 'ambar', 'bg-amber-50 border-ambar text-ambar'], ['perdida_total', 'Pérdida Total', 'carmesi', 'bg-red-50 border-carmesi text-carmesi']] as const).map(([v, t, , clase]) => (
                    <button key={v} type="button" role="radio" aria-checked={f.nivel_danio === v} onClick={() => set('nivel_danio', v)}
                      className={`flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${f.nivel_danio === v ? clase : 'border-slate-200 text-slate-500'}`}>
                      <span className={`h-2 w-2 rounded-full ${v === 'leve' ? 'bg-exito' : v === 'medio' ? 'bg-ambar' : 'bg-carmesi'}`} />{t}
                      {f.nivel_danio === v && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">{input('nombre_pieza', 'Nombre de la pieza', { placeholder: 'Culata de Motor 1.5L 1NZ-FE' })}</div>
              {select('categoria', 'Categoría', catalogos?.categorias_pieza ?? ['motor', 'transmision', 'carroceria'])}
              {input('marca', 'Marca del vehículo de origen', { list: 'marcas', placeholder: 'Toyota' })}
              {input('numero_parte_oem', 'N° de parte OEM (opcional)', { placeholder: '11101-21030' })}
              {select('estado_desgaste', 'Estado de desgaste', catalogos?.estados_desgaste ?? ['operativo_verificado'])}
              <div className="sm:col-span-2">{input('compatibilidad', 'Compatibilidad (separada por comas)', { placeholder: 'Toyota Yaris 2014-2022, Toyota Etios' })}</div>
              {select('region_ubicacion', 'Región de custodia', regiones)}
            </div>
          )}
        </Paso>

        <Paso n={3} titulo="Dictamen pericial mecánico">
          <label htmlFor="dictamen" className="label">{esVehiculo ? 'Descripción del peritaje' : 'Observaciones técnicas'}</label>
          <textarea id="dictamen" rows={4} className={`input ${errores.dictamen ? 'input-error' : ''}`} value={f.dictamen}
            onChange={(e) => set('dictamen', e.target.value)} maxLength={1500}
            placeholder="Colisión frontal, tren delantero y radiador comprometidos. Chasis y habitáculo estructuralmente intactos." />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{errores.dictamen ? <span className="font-medium text-carmesi">{errores.dictamen}</span> : 'Detalla daños, estado del motor y de la estructura para que los postores puedan evaluar el lote.'}</span>
            <span>{f.dictamen.length}/1500</span>
          </div>
        </Paso>

        <Paso n={4} titulo="Carga multimedia de peritaje">
          <div
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastrando(false); agregarFotos(e.dataTransfer.files) }}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${arrastrando ? 'border-exito bg-green-50' : 'border-navy-200 bg-navy-50/50'}`}>
            <UploadCloud className="h-9 w-9 text-navy-500" />
            <p className="text-sm font-semibold text-navy-800">Arrastra las fotos técnicas aquí (Frontal, Motor, Chasis, Habitáculo).</p>
            <p className="text-xs text-slate-500">Formato JPG/PNG/WEBP hasta {MAX_MB} MB · máximo 8 fotos</p>
            <Button type="button" variante="secundario" tamano="sm" onClick={() => inputFile.current?.click()}>Seleccionar archivos</Button>
            <input ref={inputFile} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
              onChange={(e) => { agregarFotos(e.target.files); e.target.value = '' }} />
          </div>
          {fotos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fotos.map((p, i) => (
                <div key={p.url} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="relative aspect-[4/3]">
                    <img src={p.url} alt={p.archivo.name} className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded bg-navy-800 px-2 py-0.5 text-[10px] font-bold text-white">{VISTAS[p.vista]}</span>
                    <button type="button" aria-label="Quitar foto" onClick={() => { URL.revokeObjectURL(p.url); setFotos(fotos.filter((_, j) => j !== i)) }}
                      className="absolute right-2 top-2 rounded-full bg-white p-1 shadow"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="truncate text-xs font-semibold">{p.archivo.name}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">{(p.archivo.size / 1024 / 1024).toFixed(1)} MB</span>
                      <select className="rounded border border-slate-200 px-1 py-0.5 text-[11px]" value={p.vista} aria-label="Tipo de vista"
                        onChange={(e) => setFotos(fotos.map((x, j) => j === i ? { ...x, vista: e.target.value } : x))}>
                        {VISTAS_FOTO.map((v) => <option key={v} value={v}>{VISTAS[v]}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Paso>

        <Paso n={5} titulo="Parámetros económicos de la subasta">
          <div className="grid gap-4 sm:grid-cols-3">
            {input('precio_base', 'Precio base de apertura ($)', { type: 'number', min: 1, placeholder: '1500000' })}
            {input('incremento_minimo', 'Incremento mínimo por postura ($)', { type: 'number', min: 1, placeholder: esVehiculo ? '50000' : '10000' })}
            {select('duracion_horas', 'Duración de la subasta', DURACIONES)}
          </div>
          <p className="mt-2 text-xs text-slate-400">Si dejas vacío el incremento se usará el estándar: $50.000 para vehículos y $10.000 para piezas.</p>
        </Paso>

        <div className="flex flex-col-reverse gap-3 py-5 sm:flex-row sm:justify-between">
          <Button type="button" variante="secundario" onClick={guardarBorrador} icono={<Save className="h-4 w-4" />}>Guardar borrador</Button>
          <Button type="button" tamano="lg" onClick={publicar} cargando={enviando}>
            Publicar lote a subasta <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
