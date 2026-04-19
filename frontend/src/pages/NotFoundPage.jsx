import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 animate-fade-in">
      <p className="text-6xl font-bold text-slate-800">404</p>
      <h2 className="text-xl font-semibold text-slate-300">Página no encontrada</h2>
      <p className="text-slate-500 text-sm">La ruta que buscas no existe en el sistema.</p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary flex items-center gap-2 mt-2">
        <Home size={16} />
        Volver al dashboard
      </button>
    </div>
  )
}
