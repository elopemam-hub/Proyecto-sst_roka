import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Play, UserCheck, UserX, Clock, MapPin, Users, CheckCircle2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const ESTADOS = {
  programada:   { label: 'Programada',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ejecutada:    { label: 'Ejecutada',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelada:    { label: 'Cancelada',    color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  reprogramada: { label: 'Reprogramada', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

const TIPOS = {
  induccion: 'Inducción', especifica: 'Específica',
  general: 'General', sensibilizacion: 'Sensibilización',
}

export default function CapacitacionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cap, setCap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAsistencia, setShowAsistencia] = useState(false)
  const [asistenciaData, setAsistenciaData] = useState([])
  const [personalList, setPersonalList] = useState([])
  const [searchPersonal, setSearchPersonal] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/capacitaciones/${id}`)
      setCap(data)
      if (data.asistentes?.length > 0) {
        setAsistenciaData(data.asistentes.map(a => ({
          personal_id: a.personal_id,
          nombre: `${a.personal?.nombres} ${a.personal?.apellidos}`,
          dni: a.personal?.dni,
          asistio: a.asistio,
          nota_evaluacion: a.nota_evaluacion ?? '',
          aprobado: a.aprobado,
        })))
      }
    } catch { toast.error('Error al cargar') } finally { setLoading(false) }
  }

  const cargarPersonal = async () => {
    try {
      const { data } = await api.get('/personal', { params: { per_page: 100 } })
      setPersonalList(data.data || data)
    } catch { /* silent */ }
  }

  const agregarPersonal = (p) => {
    if (asistenciaData.find(a => a.personal_id === p.id)) return
    setAsistenciaData(prev => [...prev, {
      personal_id: p.id,
      nombre: `${p.nombres} ${p.apellidos}`,
      dni: p.dni,
      asistio: false,
      nota_evaluacion: '',
      aprobado: null,
    }])
  }

  const toggleAsistencia = (personalId) => {
    setAsistenciaData(prev => prev.map(a =>
      a.personal_id === personalId ? { ...a, asistio: !a.asistio } : a
    ))
  }

  const actualizarNota = (personalId, nota) => {
    setAsistenciaData(prev => prev.map(a =>
      a.personal_id === personalId ? { ...a, nota_evaluacion: nota } : a
    ))
  }

  const quitarPersonal = (personalId) => {
    setAsistenciaData(prev => prev.filter(a => a.personal_id !== personalId))
  }

  const guardarAsistencia = async () => {
    setSaving(true)
    try {
      const payload = {
        asistentes: asistenciaData.map(a => ({
          personal_id: a.personal_id,
          asistio: a.asistio,
          nota_evaluacion: a.nota_evaluacion ? parseFloat(a.nota_evaluacion) : null,
          aprobado: a.nota_evaluacion ? parseFloat(a.nota_evaluacion) >= 14 : null,
        }))
      }
      await api.post(`/capacitaciones/${id}/asistencia`, payload)
      toast.success('Asistencia registrada exitosamente')
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar asistencia')
    } finally { setSaving(false) }
  }

  const ejecutar = async () => {
    if (!confirm('¿Marcar esta capacitación como ejecutada?')) return
    try {
      await api.post(`/capacitaciones/${id}/ejecutar`, {})
      toast.success('Capacitación marcada como ejecutada')
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!cap) return <div className="text-slate-500 text-center py-12">No encontrado</div>

  const personalFiltrado = personalList.filter(p =>
    !asistenciaData.find(a => a.personal_id === p.id) &&
    (`${p.nombres} ${p.apellidos} ${p.dni}`).toLowerCase().includes(searchPersonal.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/capacitaciones')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{cap.titulo}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADOS[cap.estado]?.color}`}>
                {ESTADOS[cap.estado]?.label}
              </span>
              <span className="text-sm text-slate-400">{TIPOS[cap.tipo]}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {cap.estado === 'programada' && (
            <button onClick={ejecutar}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors">
              <Play size={16} /> Ejecutar
            </button>
          )}
          <button onClick={() => navigate(`/capacitaciones/${id}/editar`)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            <Edit size={16} /> Editar
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Detalles</h3>
          {cap.tema && <div><span className="text-xs text-slate-500">Tema:</span><p className="text-slate-200">{cap.tema}</p></div>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-slate-500">Fecha programada</span>
              <p className="text-slate-200">{format(new Date(cap.fecha_programada), 'dd/MM/yyyy')}</p>
            </div>
            {cap.fecha_ejecutada && <div>
              <span className="text-xs text-slate-500">Fecha ejecutada</span>
              <p className="text-emerald-400">{format(new Date(cap.fecha_ejecutada), 'dd/MM/yyyy')}</p>
            </div>}
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-500" />
              <div>
                <span className="text-xs text-slate-500">Duración</span>
                <p className="text-slate-200">{cap.duracion_horas} horas</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500">Modalidad</span>
              <p className="text-slate-200 capitalize">{cap.modalidad}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Logística</h3>
          <div className="space-y-3 text-sm">
            {cap.expositor && <div className="flex items-center gap-2">
              <Users size={14} className="text-slate-500" />
              <div>
                <span className="text-xs text-slate-500">Expositor</span>
                <p className="text-slate-200">{cap.expositor} {cap.expositor_cargo && `(${cap.expositor_cargo})`}</p>
              </div>
            </div>}
            {cap.lugar && <div className="flex items-center gap-2">
              <MapPin size={14} className="text-slate-500" />
              <div>
                <span className="text-xs text-slate-500">Lugar</span>
                <p className="text-slate-200">{cap.lugar}</p>
              </div>
            </div>}
            {cap.area && <div>
              <span className="text-xs text-slate-500">Área</span>
              <p className="text-slate-200">{cap.area.nombre}</p>
            </div>}
            <div>
              <span className="text-xs text-slate-500">Asistencia</span>
              <p className={`font-bold text-lg ${cap.porcentaje_asistencia >= 80 ? 'text-emerald-400' : cap.porcentaje_asistencia >= 50 ? 'text-amber-400' : cap.porcentaje_asistencia != null ? 'text-red-400' : 'text-slate-500'}`}>
                {cap.porcentaje_asistencia != null ? `${cap.porcentaje_asistencia}%` : 'Sin registro'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      {cap.observaciones && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Observaciones</h3>
          <p className="text-slate-300 text-sm whitespace-pre-wrap">{cap.observaciones}</p>
        </div>
      )}

      {/* Sección Asistencia */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <UserCheck size={16} className="text-roka-400" />
            Registro de Asistencia ({asistenciaData.length})
          </h3>
          <div className="flex gap-2">
            {!showAsistencia && (
              <button onClick={() => { setShowAsistencia(true); cargarPersonal() }}
                className="flex items-center gap-2 bg-roka-500/10 text-roka-400 border border-roka-500/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-roka-500/20 transition-colors">
                <Users size={14} /> Agregar Personal
              </button>
            )}
            {asistenciaData.length > 0 && (
              <button onClick={guardarAsistencia} disabled={saving}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                <CheckCircle2 size={14} /> {saving ? 'Guardando...' : 'Guardar Asistencia'}
              </button>
            )}
          </div>
        </div>

        {/* Agregar personal */}
        {showAsistencia && (
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
            <input
              type="text" placeholder="Buscar personal por nombre o DNI..."
              value={searchPersonal} onChange={e => setSearchPersonal(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 mb-2"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {personalFiltrado.slice(0, 20).map(p => (
                <button key={p.id} onClick={() => agregarPersonal(p)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between text-sm">
                  <span className="text-slate-200">{p.nombres} {p.apellidos}</span>
                  <span className="text-xs text-slate-500 font-mono">{p.dni}</span>
                </button>
              ))}
              {personalFiltrado.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-2">No se encontraron resultados</p>
              )}
            </div>
            <button onClick={() => setShowAsistencia(false)}
              className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Cerrar buscador
            </button>
          </div>
        )}

        {/* Tabla de asistentes */}
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Personal', 'DNI', 'Asistió', 'Nota', 'Estado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {asistenciaData.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                No hay asistentes registrados. Use "Agregar Personal" para comenzar.
              </td></tr>
            ) : asistenciaData.map(a => (
              <tr key={a.personal_id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-slate-200 font-medium">{a.nombre}</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{a.dni}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleAsistencia(a.personal_id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      a.asistio ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'
                    }`}>
                    {a.asistio ? <UserCheck size={16} /> : <UserX size={16} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <input type="number" min="0" max="20" step="0.5"
                    value={a.nota_evaluacion} onChange={e => actualizarNota(a.personal_id, e.target.value)}
                    placeholder="—"
                    className="w-16 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1 text-center" />
                </td>
                <td className="px-4 py-3">
                  {a.nota_evaluacion !== '' && a.nota_evaluacion !== null ? (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                      parseFloat(a.nota_evaluacion) >= 14
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {parseFloat(a.nota_evaluacion) >= 14 ? 'Aprobado' : 'Desaprobado'}
                    </span>
                  ) : <span className="text-slate-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => quitarPersonal(a.personal_id)}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
