import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, FileText, Plus, ChevronRight,
  CheckCircle, AlertCircle, Users, Download,
} from 'lucide-react'
import api from '../../services/api'

function exportarCSV(lista) {
  const cols = ['Apellidos', 'Nombres', 'DNI', 'Área', 'Cargo', 'Tiene ficha', 'Estado civil', 'Turno', 'Exposiciones']
  const rows = lista.map(p => [
    p.apellidos, p.nombres, p.dni,
    p.area?.nombre || '—', p.cargo?.nombre || '—',
    p.ficha_medica ? 'Sí' : 'No',
    p.ficha_medica?.estado_civil || '—',
    p.ficha_medica?.turno || '—',
    (p.ficha_medica?.exposiciones_laborales || []).join('; ') || '—',
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([cols.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `fichas_medicas_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function FichasMedicasListPage() {
  const navigate = useNavigate()
  const [lista, setLista]         = useState([])
  const [meta, setMeta]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [areas, setAreas]         = useState([])
  const [filtroArea, setFArea]    = useState('')
  const [filtroFicha, setFFicha]  = useState('')
  const [pagina, setPagina]       = useState(1)

  useEffect(() => {
    api.get('/areas').then(r => setAreas(r.data.data || r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setPagina(1)
  }, [search, filtroArea, filtroFicha])

  useEffect(() => { cargar() }, [pagina, search, filtroArea, filtroFicha])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/salud/fichas-medicas', {
        params: {
          search:      search || undefined,
          area_id:     filtroArea || undefined,
          tiene_ficha: filtroFicha || undefined,
          per_page: 20,
          page: pagina,
        },
      })
      setLista(data.data || data)
      setMeta(data.meta || null)
    } catch { } finally { setLoading(false) }
  }

  const conFicha    = lista.filter(p => p.ficha_medica).length
  const sinFicha    = lista.filter(p => !p.ficha_medica).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/salud')} className="btn-back">
            <ArrowLeft size={14} /> Salud
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fichas Médicas</h1>
            <p className="text-gray-500 text-sm mt-0.5">Gestión de fichas médicas de todos los trabajadores</p>
          </div>
        </div>
        <button onClick={() => exportarCSV(lista)}
          className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total trabajadores', value: (meta?.total ?? lista.length), color: 'text-gray-700',    icon: Users,         bg: 'bg-gray-50' },
          { label: 'Con ficha médica',   value: conFicha,                       color: 'text-emerald-600', icon: CheckCircle,   bg: 'bg-emerald-50' },
          { label: 'Sin ficha médica',   value: sinFicha,                       color: 'text-amber-600',   icon: AlertCircle,   bg: 'bg-amber-50' },
        ].map(({ label, value, color, icon: Icon, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
        </div>
        <select value={filtroArea} onChange={e => setFArea(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select value={filtroFicha} onChange={e => setFFicha(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todas</option>
          <option value="si">Con ficha</option>
          <option value="no">Sin ficha</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin resultados</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Trabajador','Área / Cargo','Ficha','Estado civil','Turno','Exposiciones','Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lista.map(p => {
                  const ficha = p.ficha_medica
                  const exps  = ficha?.exposiciones_laborales || []
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{p.apellidos}, {p.nombres}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.dni}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <p>{p.area?.nombre || '—'}</p>
                        <p className="text-gray-400">{p.cargo?.nombre || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {ficha ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                            <CheckCircle size={11} /> Completa
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-fit">
                            <AlertCircle size={11} /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 capitalize">
                        {ficha?.estado_civil || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 capitalize">
                        {ficha?.turno || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {exps.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {exps.slice(0, 2).map(e => (
                              <span key={e} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {e}
                              </span>
                            ))}
                            {exps.length > 2 && (
                              <span className="text-[10px] text-gray-400">+{exps.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/salud/ficha-medica?personal_id=${p.id}`)}
                            title={ficha ? 'Ver/editar ficha' : 'Crear ficha'}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                              ficha
                                ? 'text-roka-600 bg-roka-50 hover:bg-roka-100 border border-roka-200'
                                : 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                            }`}>
                            <FileText size={12} />
                            {ficha ? 'Ver ficha' : 'Crear ficha'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Paginación */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Mostrando {meta.from}–{meta.to} de {meta.total} trabajadores
                </p>
                <div className="flex gap-1">
                  <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    ← Anterior
                  </button>
                  <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
