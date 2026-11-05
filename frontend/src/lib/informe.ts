// Genera el informe pericial imprimible (RF07). El navegador permite guardarlo como PDF.
import type { ItemPieza, ItemVehiculo, SubastaDetalle } from '../types'
import { capitalizar, clp, fecha, NIVEL_DANIO } from './format'

const esc = (s: unknown) => String(s ?? '—').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export function descargarInforme(s: SubastaDetalle) {
  const filas: [string, unknown][] = s.tipo_lote === 'vehiculo_completo'
    ? (() => {
        const it = s.item as ItemVehiculo
        return [
          ['VIN / Chasis', it.vin_chasis], ['Patente', it.patente], ['Marca / Modelo', `${it.marca} ${it.modelo}`],
          ['Año', it.anio], ['Tipo', capitalizar(it.tipo_vehiculo)], ['Kilometraje', it.kilometraje ? `${it.kilometraje.toLocaleString('es-CL')} km` : '—'],
          ['Airbags', it.airbags], ['Documentación', it.documentacion], ['Nivel de daño', NIVEL_DANIO[it.nivel_danio]?.texto],
          ['Región de custodia', it.region_ubicacion],
        ]
      })()
    : (() => {
        const it = s.item as ItemPieza
        return [
          ['Pieza', it.nombre_pieza], ['Categoría', capitalizar(it.categoria)], ['Marca de origen', it.marca],
          ['N° parte OEM', it.numero_parte_oem], ['Estado de desgaste', capitalizar(it.estado_desgaste)],
          ['Compatibilidad', it.compatibilidad.join(', ')], ['Región de custodia', it.region_ubicacion],
        ]
      })()
  const dictamen = s.tipo_lote === 'vehiculo_completo' ? (s.item as ItemVehiculo).descripcion_danio : (s.item as ItemPieza).observaciones_tecnicas

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe pericial Lote #${s._id}</title>
<style>
 body{font-family:Inter,Arial,sans-serif;color:#1e293b;margin:40px;font-size:13px}
 h1{color:#0F2C59;margin:0;font-size:22px} h2{color:#0F2C59;font-size:15px;border-bottom:2px solid #0F2C59;padding-bottom:4px;margin-top:28px}
 .top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #16A34A;padding-bottom:10px}
 table{width:100%;border-collapse:collapse} td{padding:6px 8px;border-bottom:1px solid #e2e8f0} td:first-child{color:#64748b;width:40%}
 .precio{font-size:20px;font-weight:800;color:#16A34A} .nota{margin-top:40px;font-size:11px;color:#64748b}
</style></head><body>
<div class="top"><div><h1>AUTO-SUBASTAS</h1><div>Informe pericial del lote #${s._id}</div></div><div>Emitido: ${fecha(new Date().toISOString())}</div></div>
<h2>${esc(s.titulo)}</h2>
<table>${filas.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<h2>Dictamen del perito mecánico</h2><p>${esc(dictamen)}</p>
<h2>Condiciones del remate</h2>
<table><tr><td>Vendedor</td><td>${esc(s.vendedor.nombre_comercial)}</td></tr>
<tr><td>Precio base</td><td>${clp(s.precio_base)}</td></tr><tr><td>Precio actual</td><td class="precio">${clp(s.precio_actual)}</td></tr>
<tr><td>Incremento mínimo</td><td>${clp(s.incremento_minimo)}</td></tr><tr><td>Cierre</td><td>${fecha(s.fecha_termino)}</td></tr></table>
<p class="nota">Documento generado automáticamente por la plataforma Auto-Subastas. La información pericial es referencial y fue declarada por el vendedor/tasador.</p>
<script>window.onload=()=>window.print()</script></body></html>`

  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  return true
}
