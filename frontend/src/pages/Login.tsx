// Pantalla 3 – Inicio de sesión y registro con validación de RUT chileno (Figura 7)
import { Eye, EyeOff, LogIn, Mail, Lock, User, UserPlus } from 'lucide-react'
import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Alerta } from '../components/ui/Feedback'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatearRut, validarRut } from '../lib/rut'
import { ApiError } from '../services/api'
import type { Usuario } from '../types'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/

const CUENTAS_DEMO = [
  ['Comprador', 'g.morales@correo.cl'],
  ['Vendedor / Tasador', 'remates@aseguradoradelsur.cl'],
  ['Administrador', 'admin@autosubastas.cl'],
]

export default function Login() {
  const { login, registro } = useAuth()
  const { notificar } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const desde = (location.state as { desde?: string } | null)?.desde

  const destino = (u: Usuario) => desde ?? (u.rol === 'comprador' ? '/' : '/admin')

  // ---------- Login ----------
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPwd, setVerPwd] = useState(false)
  const [errLogin, setErrLogin] = useState<string | null>(null)
  const [cargandoLogin, setCargandoLogin] = useState(false)

  const enviarLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email) || !password) { setErrLogin('Ingresa un correo válido y tu contraseña.'); return }
    setCargandoLogin(true)
    setErrLogin(null)
    try {
      const u = await login(email, password)
      notificar(`¡Bienvenido/a, ${u.nombre.split(' ')[0]}!`, 'exito')
      navigate(destino(u), { replace: true })
    } catch (err) {
      setErrLogin((err as Error).message)
    } finally {
      setCargandoLogin(false)
    }
  }

  // ---------- Registro ----------
  const [reg, setReg] = useState({ rut: '', nombre_completo: '', email: '', password: '', telefono: '' })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errReg, setErrReg] = useState<string | null>(null)
  const [cargandoReg, setCargandoReg] = useState(false)

  const validarRegistro = () => {
    const e: Record<string, string> = {}
    if (!validarRut(reg.rut)) e.rut = 'El RUT no tiene un formato válido. Ejemplo: 12.345.678-5'
    if (reg.nombre_completo.trim().length < 3) e.nombre_completo = 'Ingresa tu nombre completo.'
    if (!EMAIL_RE.test(reg.email)) e.email = 'Ingresa un correo electrónico válido.'
    if (reg.password.length < 8 || !/[A-Za-z]/.test(reg.password) || !/\d/.test(reg.password))
      e.password = 'Mínimo 8 caracteres, con letras y números.'
    if (reg.telefono && !/^\+?\d{8,12}$/.test(reg.telefono.replace(/[\s-]/g, ''))) e.telefono = 'Ejemplo: +56912345678'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const enviarRegistro = async (e: FormEvent) => {
    e.preventDefault()
    setErrReg(null)
    if (!validarRegistro()) return
    setCargandoReg(true)
    try {
      const u = await registro({ ...reg, telefono: reg.telefono || undefined })
      notificar('Cuenta creada correctamente. ¡Ya puedes participar en los remates!', 'exito')
      navigate(destino(u), { replace: true })
    } catch (err) {
      const apiErr = err as ApiError
      // Errores del backend asociados al campo correspondiente
      if (apiErr.codigo === 'EMAIL_DUPLICADO') setErrores({ email: apiErr.message })
      else if (apiErr.codigo === 'RUT_DUPLICADO') setErrores({ rut: apiErr.message })
      else if (apiErr.detalles?.length) {
        setErrores(Object.fromEntries(apiErr.detalles.map((d) => [d.campo, d.mensaje])))
      } else setErrReg(apiErr.message)
    } finally {
      setCargandoReg(false)
    }
  }

  const campo = (nombre: keyof typeof reg, etiqueta: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`reg-${nombre}`} className="label">{etiqueta}</label>
      <input id={`reg-${nombre}`} className={`input ${errores[nombre] ? 'input-error' : ''}`} value={reg[nombre]}
        aria-invalid={!!errores[nombre]}
        onChange={(e) => {
          const v = nombre === 'rut' ? formatearRut(e.target.value) : e.target.value
          setReg({ ...reg, [nombre]: v })
          if (errores[nombre]) setErrores({ ...errores, [nombre]: '' })
        }}
        {...props} />
      {errores[nombre] && <p className="field-error">{errores[nombre]}</p>}
    </div>
  )

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
      {/* ---------------- Iniciar sesión ---------------- */}
      <section className="card h-fit p-6">
        <h1 className="mb-4 flex items-center gap-2 text-2xl font-extrabold"><User className="h-6 w-6" />Iniciar sesión</h1>
        {desde && !errLogin && <div className="mb-3"><Alerta tipo="info">Inicia sesión para continuar con tu postura.</Alerta></div>}
        {errLogin && <div className="mb-3"><Alerta tipo="error">{errLogin}</Alerta></div>}
        <form onSubmit={enviarLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="email" type="email" autoComplete="email" className="input pl-9" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.cl" />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="label">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="password" type={verPwd ? 'text' : 'password'} autoComplete="current-password" className="input pl-9 pr-20"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setVerPwd((v) => !v)}
                className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-semibold text-navy-700">
                {verPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{verPwd ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" cargando={cargandoLogin} icono={<LogIn className="h-4 w-4" />}>Iniciar sesión</Button>
        </form>

        <div className="mt-6 rounded-lg border border-dashed border-navy-200 bg-navy-50/60 p-3 text-xs text-navy-800">
          <p className="mb-1 font-bold">Cuentas de demostración (contraseña: Subastas2026)</p>
          {CUENTAS_DEMO.map(([rol, correo]) => (
            <button key={correo} type="button" onClick={() => { setEmail(correo); setPassword('Subastas2026') }}
              className="block w-full rounded px-1 py-0.5 text-left hover:bg-white">
              <b>{rol}:</b> {correo}
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- Crear cuenta ---------------- */}
      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-extrabold"><UserPlus className="h-6 w-6" />Crear cuenta</h2>
        {errReg && <div className="mb-3"><Alerta tipo="error">{errReg}</Alerta></div>}
        <form onSubmit={enviarRegistro} className="space-y-3" noValidate>
          {campo('rut', 'RUT', { placeholder: '12.345.678-5', maxLength: 12 })}
          {campo('nombre_completo', 'Nombre completo', { autoComplete: 'name' })}
          {campo('email', 'Correo', { type: 'email', autoComplete: 'email' })}
          {campo('password', 'Contraseña', { type: 'password', autoComplete: 'new-password' })}
          {campo('telefono', 'Teléfono (opcional)', { type: 'tel', placeholder: '+56912345678' })}
          <Button type="submit" className="w-full" cargando={cargandoReg} icono={<UserPlus className="h-4 w-4" />}>Crear cuenta</Button>
        </form>
      </section>
    </div>
  )
}
