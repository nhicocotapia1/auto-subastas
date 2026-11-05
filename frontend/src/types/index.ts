// Tipos compartidos que reflejan los contratos JSON de la API (sección 6 del informe)

export type Rol = 'comprador' | 'vendedor_tasador' | 'administrador'
export type TipoLote = 'vehiculo_completo' | 'pieza_desarme'
export type NivelDanio = 'leve' | 'medio' | 'perdida_total'
export type EstadoSubasta = 'activa' | 'finalizada' | 'adjudicada' | 'desierta' | 'cancelada'

export interface Usuario {
  id: number
  rut: string
  nombre: string
  nombre_comercial?: string | null
  email: string
  rol: Rol
  estado_cuenta: 'activo' | 'suspendido'
  telefono?: string | null
  fecha_registro?: string
}

export interface Sesion {
  access_token: string
  token_type: string
  expires_in: number
  usuario: Usuario
}

export interface Imagen {
  url_archivo: string
  tipo_vista: string
  es_portada: boolean
}

export interface ItemVehiculo {
  vin_chasis: string
  patente?: string | null
  marca: string
  modelo: string
  anio: number
  tipo_vehiculo: string
  nivel_danio: NivelDanio
  kilometraje?: number | null
  airbags?: string | null
  documentacion?: string | null
  region_ubicacion: string
  descripcion_danio: string
  imagenes: Imagen[]
}

export interface ItemPieza {
  nombre_pieza: string
  categoria: string
  marca: string
  compatibilidad: string[]
  estado_desgaste: string
  numero_parte_oem?: string | null
  region_ubicacion: string
  observaciones_tecnicas: string
  imagenes: Imagen[]
}

export interface LoteResumen {
  id_subasta: number
  tipo_lote: TipoLote
  titulo: string
  precio_actual: number
  precio_base: number
  fecha_termino: string
  estado_subasta: EstadoSubasta
  portada_url: string | null
  nivel_danio?: NivelDanio | null
  categoria_pieza?: string | null
  region: string
  marca: string
  total_posturas: number
}

export interface LoteAdmin extends LoteResumen {
  incremento_minimo: number
  vendedor: string
  item: Partial<ItemVehiculo & ItemPieza>
}

export interface PosturaReciente {
  id_postura: number
  monto: number
  postor_alias: string
  fecha_hora: string
}

export interface SubastaDetalle {
  _id: number
  tipo_lote: TipoLote
  titulo: string
  precio_base: number
  precio_actual: number
  incremento_minimo: number
  monto_minimo: number
  fecha_inicio: string
  fecha_termino: string
  estado_subasta: EstadoSubasta
  vendedor: { _id: number; nombre_comercial: string }
  postor_lider: { _id: number; alias: string } | null
  ganador?: { _id: number; alias: string } | null
  item: ItemVehiculo | ItemPieza
  posturas_recientes: PosturaReciente[]
  total_posturas: number
}

export interface Catalogo {
  total_items: number
  page: number
  total_pages: number
  data: LoteResumen[]
}

export interface OpcionesFiltros {
  marcas: string[]
  regiones: string[]
  anio_min: number
  anio_max: number
}

export type EstadoOferta = 'lider' | 'superada' | 'ganada' | 'no_adjudicado' | 'cancelada'

export interface MiPuja {
  id_postura: number
  subasta_id: number
  descripcion_lote: string
  tipo_lote: TipoLote
  region: string
  portada_url: string | null
  monto_postura: number
  precio_actual: number
  cantidad_posturas: number
  estado_subasta: EstadoSubasta
  fecha_termino: string
  estado_oferta: EstadoOferta
  fecha_hora_postura: string
}

export interface Adjudicacion {
  id_subasta: number
  titulo: string
  tipo_lote: TipoLote
  estado_subasta: EstadoSubasta
  precio_final: number
  total_posturas: number
  fecha_termino: string
  fecha_adjudicacion?: string | null
  vendedor: string
  ganador?: { _id: number; nombre_completo: string; rut: string; email: string; monto: number } | null
}

export interface Reporte {
  mql: string
  sql: string
  resultados: Record<string, unknown>[]
}

export interface Catalogos {
  regiones: string[]
  tipos_vehiculo: string[]
  categorias_pieza: string[]
  estados_desgaste: string[]
}
