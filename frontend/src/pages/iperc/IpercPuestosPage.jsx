import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Users, ChevronLeft } from 'lucide-react'
import api from '../../services/api'

const NIVEL_COLOR = {
  operativo:   'bg-blue-500/10 text-blue-400',
  tecnico:     'bg-teal-500/10 text-teal-400',
  supervisor:  'bg-violet-500/10 text-violet-400',
  jefatura:    'bg-amber-500/10 text-amber-400',
  gerencial:   'bg-orange-500/10 text-orange-400',
}

export default function IpercPuestosPage() {
  const navigate = useNavigate()
  const [puestos, setPuestos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    api.get('/iperc/puestos')
      .then(({ data }) => setPuestos(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtrados = puestos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.area_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const porArea = filtrados.reduce((acc, p) => {
    const area = p.area_nombre || 'Sin área'
    if (!acc[area]) acc[area] = []
    acc[area].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/iperc')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white bg-slate-600/80 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-600/50 transition-colors mb-3"
        >
          <ChevronLeft size={13} /> Volver al módulo IPERC
        </button>
        <h1 className="text-2xl font-bold text-white">Puestos de Trabajo</h1>
        <p className="text-slate-400 text-sm mt-1">Cargos y puestos con exposición a peligros identificados en el IPERC</p>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        Los puestos de trabajo están vinculados a los procesos del IPERC a través del área y cargo asignado al personal.
        Gestiona los cargos en <button onClick={() => navigate('/configuracion/areas')} className="underline hover:text-blue-200">Configuración → Áreas y Cargos</button> y el personal en <button onClick={() => navigate('/personal')} className="underline hover:text-blue-200">Gestión Humana</button>.
      </div>

      {/* Búsqueda */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar puesto o área..." className="input" />
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <Briefcase size={32} className="mx-auto mb-2 text-slate-700" />
          <p className="text-slate-400">No hay puestos registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(porArea).map(([area, items]) => (
            <div key={area} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-700">
                <p className="text-sm font-semibold text-slate-200">{area}</p>
                <p className="text-xs text-slate-500">{items.length} puesto(s)</p>
              </div>
              <div className="divide-y divide-slate-700">
                {items.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Briefcase size={16} className="text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">{p.nombre}</p>
                        {p.nivel && (
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${NIVEL_COLOR[p.nivel] || 'bg-slate-600/10 text-slate-400'}`}>
                            {p.nivel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users size={14} />
                      <span className="text-sm">{p.total_personal || 0} trabajador(es)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acción para ver matriz */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">Ver exposición por puesto</p>
          <p className="text-xs text-slate-400 mt-0.5">Analiza qué peligros afectan a cada cargo desde el detalle del IPERC</p>
        </div>
        <button onClick={() => navigate('/iperc/gestion')}
          className="px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white text-sm rounded-lg transition-colors">
          Ver matrices IPERC
        </button>
      </div>
    </div>
  )
}
