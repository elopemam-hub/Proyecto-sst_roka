import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import logoRoka from '../../assets/logo-roka.png'
import cabezasaf from '../../assets/cabezasaf.png'
import { login, selectIsAuth, selectAuthLoading, selectAuthError, clearError } from '../../store/slices/authSlice'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const isAuth    = useSelector(selectIsAuth)
  const loading   = useSelector(selectAuthLoading)
  const error     = useSelector(selectAuthError)

  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuth) navigate('/dashboard', { replace: true })
  }, [isAuth, navigate])

  useEffect(() => {
    return () => { dispatch(clearError()) }
  }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await dispatch(login(form))
    if (login.fulfilled.match(result)) {
      toast.success('Bienvenido al sistema SST ROKA')
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-roka-950/30 to-slate-900 items-center justify-center p-12 overflow-hidden">
        {/* Fondo con patrón */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize:  '32px 32px'
        }} />

        {/* Círculos decorativos */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-roka-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-60 h-60 bg-roka-400/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3">
            <img src={cabezasaf} alt="SST ROKA" className="h-36 w-auto object-contain drop-shadow-2xl" />
            <div className="text-center">
              <p className="text-2xl font-black text-white leading-tight">SST ROKA</p>
              <p className="text-xs font-bold text-black tracking-widest">SEGURIDAD SALUD EN EL TRABAJO</p>
            </div>
          </div>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Sistema ERP de Gestión de Seguridad y Salud en el Trabajo
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { label: 'Ley 29783',         desc: 'Cumplimiento normativo' },
              { label: 'ISO 45001:2018',    desc: 'Estándar internacional' },
              { label: 'SUNAFIL Ready',     desc: 'Reportes automáticos' },
              { label: 'PWA Offline',       desc: 'Trabajo en campo' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <p className="text-roka-400 font-semibold text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Logo móvil */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-8">
            <img src={cabezasaf} alt="SST ROKA" className="h-20 w-auto object-contain" />
            <div className="text-center">
              <p className="text-lg font-black text-slate-100 leading-tight">SST ROKA</p>
              <p className="text-[10px] font-bold text-black tracking-widest">SEGURIDAD SALUD EN EL TRABAJO</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-100 mb-1">Iniciar sesión</h2>
          <p className="text-slate-400 text-sm mb-8">Ingresa tus credenciales para continuar</p>

          {/* Error global */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 mb-5 animate-fade-in">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                className="input"
                placeholder="usuario@empresa.pe"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 h-11 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ingresar al sistema'
              )}
            </button>
          </form>

          {/* Credenciales demo */}
          <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Acceso</p>
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-mono">admin@roka.pe</p>
              <p className="text-xs text-slate-400 font-mono">Admin2024</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-8">
            SST ROKA · Alineado a Ley 29783 y DS 005-2012-TR
          </p>
        </div>
      </div>
    </div>
  )
}
