import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ShieldOff, Home } from 'lucide-react'
import { ROLES_CONFIG } from '../utils/roles'

export default function SinAccesoPage() {
  const navigate = useNavigate()
  const user = useSelector(s => s.auth.user)
  const rolCfg = ROLES_CONFIG[user?.rol]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mb-4">
        <ShieldOff size={28} className="text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Sin acceso</h1>
      <p className="text-gray-500 text-sm mb-4 max-w-sm">
        No tienes permiso para acceder a esta sección.
      </p>
      {rolCfg && (
        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border mb-6 ${rolCfg.color}`}>
          Tu rol: {rolCfg.label}
        </span>
      )}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
      >
        <Home size={15} /> Volver al Dashboard
      </button>
    </div>
  )
}
