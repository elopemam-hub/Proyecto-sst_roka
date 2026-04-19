import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, HeartPulse, AlertTriangle, Clock, ShieldAlert, Pencil, Trash2 } from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const parseDate = (d) => d ? parseISO(d.length === 10 ? d + 'T00:00:00' : d) : null

const RESULTADOS = {
  apto:                   { label: 'Apto',                color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  apto_con_restricciones: { label: 'Apto c/Restricciones', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  no_apto:                { label: 'No apto',             color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const TIPOS_EMO = {
  pre_ocupacional:        'Pre-ocupacional',
  periodico:              'Periódico',
  retiro:                 'Retiro',
  por_cambio_ocupacional: 'Cambio ocup.',
}

const TIPOS_ATENCION = {
  primeros_auxilios: 'Primeros auxilios',
  consulta:          'Consulta',
  emergencia:        'Emergencia',
  seguimiento:       'Seguimiento',
}

export default function SaludListPage() {
  const navigate = useNavigate()
  const [tab, setTab]       = useState('emo')
  const [emos, setEmos]     = useState([])
  const [atenciones, setAtenciones] = useState([])
  const [restricciones, setRestricciones] = useState([])
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo]         = useState('')
  const [filtroResultado, setFiltroResultado] = useState('')
  const [filtroVencidas, setFiltroVencidas]   = useState(false)
  const [filtroProximas, setFiltroProximas]   = useState(false)
  const [pagina, setPagina] = useState(1)
  const [meta, setMeta]     = useState(null)

  useEffect(() => { cargarStats() }, [])
  useEffect(() => {
    if (tab === 'emo') cargarEmos()
    else if (tab === 'atenciones') cargarAtenciones()
    else cargarRestricciones()
  }, [tab, filtroTipo, filtroResultado, filtroVencidas, filtroProximas, pagina])

  const cargarStats = async () => {
    try {
      const { data } = await api.get('/salud/estadisticas')
      setStats(data)
    } catch { /* silent */ }
  }

  const cargarEmos = async () => {
    setLoading(true)
    try {
      const params = { page: pagina, per_page: 20 }
      if (filtroTipo)      params.tipo       = filtroTipo
      if (filtroResultado) params.resultado  = filtroResultado
      if (filtroVencidas)  params.vencidas   = 1
      if (filtroProximas)  params.proximas   = 1
      const { data } = await api.get('/salud', { params })
      setEmos(data.data || data)
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarAtenciones = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/salud/atenciones', { params: { page: pagina, per_page: 20 } })
      setAtenciones(data.data || data)
      setMeta(data.meta || null)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const cargarRestricciones = async () => {
    setLoading(true)
    try {
      setRestricciones([])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const eliminarEmo = async (e, emo) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar EMO de ${emo.personal?.nombres} ${emo.personal?.apellidos}?`)) return
    try {
      await api.delete(`/salud/${emo.id}`)
      setEmos(prev => prev.filter(x => x.id !== emo.id))
      cargarStats()
    } catch { alert('Error al eliminar') }
  }

  const vencimientoColor = (emo) => {
    if (!emo.fecha_vencimiento) return 'text-slate-500'
    if (emo.esta_vencida) return 'text-red-400'
    if (emo.dias_para_vencer != null && emo.dias_para_vencer <= 30) return 'text-amber-400'
    return 'text-emerald-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Salud / EMO</h1>
          <p className="text-slate-400 text-sm mt-1">Exámenes médicos ocupacionales · Ley 29783 Art. 49</p>
        </div>
        <button
          onClick={() => navigate('/salud/nuevo')}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Nuevo EMO
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'EMO Vigentes',    valor: (stats.por_resultado?.find(r => r.resultado === 'apto')?.total ?? 0), icon: HeartPulse, color: 'text-emerald-400' },
            { label: 'Vencidos',        valor: stats.vencidas,        icon: AlertTriangle, color: 'text-red-400' },
            { label: 'Próximos 30 días',valor: stats.proximas_30d,    icon: Clock,         color: 'text-amber-400' },
            { label: 'Con restricciones', valor: stats.con_restricciones, icon: ShieldAlert, color: 'text-blue-400' },
          ].map(({ label, valor, icon: Icon, color }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <Icon size={20} className={color} />
                <div>
                  <p className="text-2xl font-bold text-white">{valor ?? '—'}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-lg p-1 w-fit">
        {[
          { key: 'emo',          label: 'EMO' },
          { key: 'atenciones',   label: 'Atenciones' },
          { key: 'restricciones', label: 'Restricciones' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPagina(1) }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros EMO */}
      {tab === 'emo' && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-wrap gap-3">
          <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_EMO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filtroResultado} onChange={e => { setFiltroResultado(e.target.value); setPagina(1) }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
            <option value="">Todos los resultados</option>
            {Object.entries(RESULTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={filtroVencidas} onChange={e => setFiltroVencidas(e.target.checked)} className="w-4 h-4" />
            Solo vencidos
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={filtroProximas} onChange={e => setFiltroProximas(e.target.checked)} className="w-4 h-4" />
            Próximos 30 días
          </label>
        </div>
      )}

      {/* Tabla EMO */}
      {tab === 'emo' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                {['Personal', 'Tipo', 'Fecha Examen', 'Vencimiento', 'Clínica', 'Resultado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">Cargando...</td></tr>
              ) : emos.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No hay EMO registrados</td></tr>
              ) : emos.map(e => (
                <tr key={e.id} onClick={() => navigate(`/salud/${e.id}`)}
                  className="hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-slate-200 font-medium">{e.personal?.nombres} {e.personal?.apellidos}</div>
                    <div className="text-xs text-slate-500 font-mono">{e.personal?.dni}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{TIPOS_EMO[e.tipo] || e.tipo}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {e.fecha_examen ? format(parseDate(e.fecha_examen), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {e.fecha_vencimiento ? (
                      <span className={vencimientoColor(e)}>
                        {format(parseDate(e.fecha_vencimiento), 'dd/MM/yyyy')}
                        {e.esta_vencida && ' (Vencido)'}
                        {!e.esta_vencida && e.dias_para_vencer != null && e.dias_para_vencer <= 30 && ` (${e.dias_para_vencer}d)`}
                      </span>
                    ) : <span className="text-slate-600">Sin vencimiento</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{e.clinica || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${RESULTADOS[e.resultado]?.color}`}>
                      {RESULTADOS[e.resultado]?.label || e.resultado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                      <button onClick={() => navigate(`/salud/${e.id}/editar`)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-roka-300 hover:bg-slate-700 transition-colors"
                        title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={ev => eliminarEmo(ev, e)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                        title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta && meta.last_page > 1 && (
            <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">Total: {meta.total}</span>
              <div className="flex gap-2">
                <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                  className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Anterior</button>
                <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                  className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla Atenciones */}
      {tab === 'atenciones' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                {['Personal', 'Fecha', 'Tipo', 'Descripción', 'Baja laboral'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">Cargando...</td></tr>
              ) : atenciones.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No hay atenciones registradas</td></tr>
              ) : atenciones.map(a => (
                <tr key={a.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 text-slate-200">{a.personal?.nombres} {a.personal?.apellidos}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {a.fecha ? format(new Date(a.fecha), 'dd/MM/yyyy HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{TIPOS_ATENCION[a.tipo] || a.tipo}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-48 truncate">{a.descripcion}</td>
                  <td className="px-4 py-3">
                    {a.baja_laboral ? (
                      <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-full">
                        Sí {a.dias_descanso > 0 ? `(${a.dias_descanso}d)` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Restricciones */}
      {tab === 'restricciones' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <ShieldAlert size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Las restricciones se gestionan desde el detalle de cada EMO</p>
          <p className="text-slate-500 text-sm mt-1">o desde el perfil de cada trabajador</p>
        </div>
      )}
    </div>
  )
}
