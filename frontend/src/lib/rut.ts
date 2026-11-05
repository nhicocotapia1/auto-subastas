// Validación de RUT chileno (módulo 11) – misma regla que el backend

export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

export function validarRut(rut: string): boolean {
  const limpio = limpiarRut(rut)
  if (limpio.length < 8 || limpio.length > 9) return false
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false
  let suma = 0
  let factor = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const resto = 11 - (suma % 11)
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === esperado
}

/** Formatea mientras se escribe: 12345678-9 -> 12.345.678-9 */
export function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpo}-${limpio.slice(-1)}`
}
