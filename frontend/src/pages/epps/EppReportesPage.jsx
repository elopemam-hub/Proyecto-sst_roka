import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Search, BarChart3 } from 'lucide-react'
import api from '../../services/api'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ESTADO_COLOR = {
  entregado: 'bg-blue-50 text-blue-700 border-blue-200',
  devuelto:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  perdido:   'bg-red-50 text-red-700 border-red-200',
}
const ESTADO_LABEL = { entregado: 'Entregado', devuelto: 'Devuelto', perdido: 'Perdido' }
const MOTIVO_LABEL = { ingreso: 'Ingreso', reposicion: 'Reposición', deterioro: 'Deterioro', talla: 'Cambio talla', perdida: 'Pérdida' }

function exportarCSV(rows) {
  const cols = ['Trabajador', 'DNI', 'EPP', 'Categoría', 'Cantidad', 'Motivo', 'Fecha Entrega', 'Fecha Venc.', 'Estado']
  const lines = rows.map(r => [
    `${r.personal?.nombres || ''} ${r.personal?.apellidos || ''}`.trim(),
    r.personal?.dni || '',
    r.inventario?.nombre || '',
    r.inventario?.categoria?.nombre || '',
    r.cantidad,
    MOTIVO_LABEL[r.motivo_entrega] || r.motivo_entrega || '',
    r.fecha_entrega || '',
    r.fecha_vencimiento || '',
    ESTADO_LABEL[r.estado] || r.estado || '',
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([cols.join(',') + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = 'trazabilidad_epps.csv'; a.click()
  URL.revokeObjectURL(a.href)
}

export default function EppReportesPage() {
  const navigate          = useNavigate()
  const [rows, setRows]   = useState([])
  const [loading, setLoading] = useState(false)
  const [meta, setMeta]   = useState(null)
  const [pagina, setPagina] = useState(1)
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', estado: '' })

  useEffect(() => { cargar() }, [pagina])

  const cargar = async (f = filtros) => {
    setLoading(true)
    try {
      const params = { page: pagina }
      if (f.desde)  params.desde  = f.desde
      if (f.hasta)  params.hasta  = f.hasta
      if (f.estado) params.estado = f.estado
      const { data } = await api.get('/epps/trazabilidad', { params })
      setRows(data.data || [])
      setMeta(data.meta || null)
    } catch { toast.error('Error al cargar') }
    finally { setLoading(false) }
  }

  const buscar = (e) => {
    e.preventDefault()
    setPagina(1)
    cargar(filtros)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Trazabilidad</h1>
          <p className="text-gray-500 text-sm mt-1">Historial completo de entregas y devoluciones de EPPs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/epps')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft size={14} /> EPPs
          </button>
          <button onClick={() => exportarCSV(rows)} disabled={rows.length === 0}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <form onSubmit={buscar} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={filtros.desde} onChange={e => setFiltros({...filtros, desde: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={filtros.hasta} onChange={e => setFiltros({...filtros, hasta: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select value={filtros.estado} onChange={e => setFiltros({...filtros, estado: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
            <option value="">Todos</option>
            <option value="entregado">Entregado</option>
            <option value="devuelto">Devuelto</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>
        <button type="submit"
          className="flex items-center gap-1.5 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Search size={14} /> Buscar
        </button>
      </form>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Trabajador', 'DNI', 'EPP', 'Categoría', 'Cant.', 'Motivo', 'Entrega', 'Vencimiento', 'Estado'].map(h => (
                <th key={h} className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                <BarChart3 size={32} className="mx-auto mb-2 text-gray-300" />
                <p>Sin registros. Aplica filtros y haz click en Buscar.</p>
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">
                  {r.personal?.nombres} {r.personal?.apellidos}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-gray-500">{r.personal?.dni || '—'}</td>
                <td className="px-3 py-3 text-gray-700 max-w-[140px] truncate">{r.inventario?.nombre}</td>
                <td className="px-3 py-3 text-gray-500">{r.inventario?.categoria?.nombre || '—'}</td>
                <td className="px-3 py-3 text-center text-gray-700 font-medium">{r.cantidad}</td>
                <td className="px-3 py-3 text-gray-500 text-xs">{MOTIVO_LABEL[r.motivo_entrega] || r.motivo_entrega || '—'}</td>
                <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                  {r.fecha_entrega ? format(parseISO(r.fecha_entrega), 'dd MMM yy', { locale: es }) : '—'}
                </td>
                <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                  {r.fecha_vencimiento ? format(parseISO(r.fecha_vencimiento), 'dd MMM yy', { locale: es }) : '—'}
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADO_COLOR[r.estado] || ''}`}>
                    {ESTADO_LABEL[r.estado] || r.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta && meta.last_page > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-400">Mostrando {meta.from}–{meta.to} de {meta.total}</span>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs">Anterior</button>
              <button disabled={pagina === meta.last_page} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
