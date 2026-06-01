import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BtnVolver({ to, label = 'Volver', className = '' }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      className={`btn-back ${className}`}
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  )
}
