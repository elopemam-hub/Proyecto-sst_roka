import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Download, Search, Eye, X,
  CheckCircle, Clock, Award, TrendingUp, FileText, Calendar
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ESTADO_CONFIG = {
  al_dia: { label: 'Al día', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  atencion: { label: 'Atención', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  critico: { label: 'Crítico', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  sin_capacitacion: { label: 'Sin capacitación', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
}

const TIPO_LABELS = {
  induccion: 'Inducción',
  especifica: 'Específica',
  general: 'General',
  sensibilizacion: 'Sensibilización'
}

// Modal de Detalle Individual
function ModalDetalle({ personalId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    cargarDetalle()
  }, [personalId])

  const cargarDetalle = async () => {
    try {
      setLoading(true)
      const { data: result } = await api.get(`/personal/${personalId}/capacitaciones`)
      setData(result)
    } catch (err) {
      toast.error('Error al cargar detalle')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roka-600 mx-auto"></div>
      </div>
    </div>
  )

  if (!data) return null

  const { personal, resumen, capacitaciones, evolucion_mensual } = data

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-roka-500 to-roka-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {personal.nombre_completo.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{personal.nombre_completo}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <span className="font-mono">{personal.dni}</span>
                <span>•</span>
                <span>{personal.cargo}</span>
                <span>•</span>
                <span>{personal.area}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen KPIs */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-blue-600" size={24} />
                <div>
                  <p className="text-sm text-gray-500">Capacitaciones</p>
                  <p className="text-2xl font-bold text-gray-900">{resumen.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <Clock className="text-purple-600" size={24} />
                <div>
                  <p className="text-sm text-gray-500">Horas Acumuladas</p>
                  <p className="text-2xl font-bold text-gray-900">{resumen.horas}h</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-green-600" size={24} />
                <div>
                  <p className="text-sm text-gray-500">Asistencia</p>
                  <p className="text-2xl font-bold text-gray-900">{resumen.asistencia}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Evolución */}
        <div className="p-6 border-b">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-roka-600" />
            Evolución de Horas (Últimos 6 meses)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={evolucion_mensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="mes_label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 12,
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="horas" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Historial de Capacitaciones */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-roka-600" />
            Historial de Capacitaciones ({capacitaciones.length})
          </h3>
          <div className="max-h-96 overflow-y-auto">
            {capacitaciones.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Sin capacitaciones registradas</p>
            ) : (
              <div className="space-y-2">
                {capacitaciones.map((cap, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{cap.tema}</span>
                        {cap.bloque && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            {cap.bloque}
                          </span>
                        )}
                        {cap.tipo && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {TIPO_LABELS[cap.tipo] || cap.tipo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>📅 {new Date(cap.fecha).toLocaleDateString('es-PE')}</span>
                        <span>•</span>
                        <span>⏰ {cap.duracion}h</span>
                        {cap.expositor && (
                          <>
                            <span>•</span>
                            <span>👨‍🏫 {cap.expositor}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cap.asistio ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          <CheckCircle size={12} />
                          Asistió
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                          No asistió
                        </span>
                      )}
                      {cap.nota !== null && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          cap.aprobado
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          Nota: {cap.nota}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MatrizTrabajadoresPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tabla')
  const [trabajadores, setTrabajadores] = useState([])
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [personalIdDetalle, setPersonalIdDetalle] = useState(null)

  // Estado para matriz de competencias
  const [matrizData, setMatrizData] = useState({ temas: [], matriz: [], anios_disponibles: [] })
  const [loadingMatriz, setLoadingMatriz] = useState(false)
  const [anioMatriz, setAnioMatriz] = useState(new Date().getFullYear())

  // Estado para notas por trabajador
  const [notasData, setNotasData] = useState([])
  const [loadingNotas, setLoadingNotas] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/capacitaciones/matriz-trabajadores')
      setTrabajadores(data.trabajadores || [])
      setStats(data.stats || {})
    } catch (err) {
      toast.error('Error al cargar matriz de trabajadores')
    } finally {
      setLoading(false)
    }
  }

  const cargarMatriz = async (anio = anioMatriz) => {
    setLoadingMatriz(true)
    try {
      const { data } = await api.get('/capacitaciones/matriz-competencias', { params: { anio } })
      setMatrizData(data)
    } catch (err) {
      toast.error('Error al cargar matriz')
    } finally {
      setLoadingMatriz(false)
    }
  }

  const cambiarAnioMatriz = (anio) => {
    setAnioMatriz(anio)
    cargarMatriz(anio)
  }

  const exportarExcel = () => {
    const headers = ['DNI', 'Nombre', 'Cargo', 'Área', 'Capacitaciones', 'Horas', 'Asistencia %', 'Última Cap.', 'Días', 'Estado']
    const rows = trabajadoresFiltrados.map(t => [
      t.dni,
      t.nombre_completo,
      t.cargo,
      t.area,
      t.total_capacitaciones,
      t.horas_acumuladas,
      t.porcentaje_asistencia,
      t.ultima_capacitacion || '-',
      t.dias_sin_capacitacion !== null ? t.dias_sin_capacitacion : '-',
      ESTADO_CONFIG[t.estado]?.label || t.estado
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `matriz-trabajadores-${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast.success('Matriz exportada correctamente')
  }

  const trabajadoresFiltrados = trabajadores.filter(t => {
    const matchSearch = !search ||
      t.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      t.dni.includes(search) ||
      t.cargo.toLowerCase().includes(search.toLowerCase())

    const matchArea = !filtroArea || t.area === filtroArea
    const matchEstado = !filtroEstado || t.estado === filtroEstado

    return matchSearch && matchArea && matchEstado
  })

  // Filtrar matriz de competencias (incluye filtro de estado mediante lookup)
  const matrizFiltrada = matrizData.matriz.filter(t => {
    const matchSearch = !search ||
      t.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      t.dni.includes(search) ||
      t.cargo.toLowerCase().includes(search.toLowerCase())

    const matchArea = !filtroArea || t.area === filtroArea

    // Filtro de estado: buscar el estado del trabajador en la lista de trabajadores
    let matchEstado = !filtroEstado
    if (filtroEstado && trabajadores.length > 0) {
      const trabajadorData = trabajadores.find(tr => tr.personal_id === t.personal_id || tr.dni === t.dni)
      matchEstado = trabajadorData && trabajadorData.estado === filtroEstado
    }

    return matchSearch && matchArea && matchEstado
  })

  // Promedio de avance del grupo visible en la matriz (respeta los filtros activos).
  // Se suman completadas y totales en vez de promediar los porcentajes ya redondeados
  // de cada fila, para que el total no arrastre el error de redondeo de cada trabajador.
  const promedioMatriz = (() => {
    if (matrizFiltrada.length === 0) return null

    const completadas = matrizFiltrada.reduce((s, t) => s + (t.completadas || 0), 0)
    const totales     = matrizFiltrada.reduce((s, t) => s + (t.total_temas || 0), 0)

    // Avance sobre lo que ya se dictó: deja fuera los temas del plan aún no ejecutados,
    // que son inalcanzables y hunden el porcentaje sobre el plan completo.
    const hechas    = matrizFiltrada.reduce((s, t) => s + (t.completadas_ejecutadas || 0), 0)
    const dictadas  = (matrizData.temas_ejecutados || 0) * matrizFiltrada.length

    return {
      completadas,
      totales,
      trabajadores: matrizFiltrada.length,
      plan:      totales  > 0 ? Math.round((completadas / totales) * 100) : 0,
      ejecutado: dictadas > 0 ? Math.round((hechas / dictadas) * 100) : null,
    }
  })()

  // Filtrar notas por trabajador
  const notasFiltradas = notasData.filter(t => {
    const matchSearch = !search ||
      t.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      t.dni.includes(search) ||
      (t.cargo && t.cargo.toLowerCase().includes(search.toLowerCase()))

    const matchArea = !filtroArea || t.area === filtroArea

    return matchSearch && matchArea
  })

  const areasUnicas = [...new Set(trabajadores.map(t => t.area))].filter(Boolean).sort()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roka-600"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/capacitaciones/lista')} className="btn-back">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="text-roka-600" size={28} />
              Matriz de Trabajadores
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Seguimiento de capacitaciones por trabajador
            </p>
          </div>
        </div>

        <button
          onClick={exportarExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Download size={16} />
          Exportar Excel
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Users className="text-gray-400" size={20} />
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_trabajadores || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <div>
              <p className="text-xs text-gray-500">Al día</p>
              <p className="text-2xl font-bold text-green-600">{stats.al_dia || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div>
              <p className="text-xs text-gray-500">Atención</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.atencion || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div>
              <p className="text-xs text-gray-500">Crítico</p>
              <p className="text-2xl font-bold text-red-600">{stats.critico || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <div>
              <p className="text-xs text-gray-500">Sin capacit.</p>
              <p className="text-2xl font-bold text-gray-600">{stats.sin_capacitacion || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setTab('tabla')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              tab === 'tabla'
                ? 'bg-roka-50 text-roka-700 border-b-2 border-roka-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📋 Tabla Resumen
          </button>
          <button
            onClick={() => setTab('matriz')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              tab === 'matriz'
                ? 'bg-roka-50 text-roka-700 border-b-2 border-roka-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            ✅ Matriz de Competencias
          </button>
          <button
            onClick={() => setTab('notas')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              tab === 'notas'
                ? 'bg-roka-50 text-roka-700 border-b-2 border-roka-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📝 Notas por trabajador
          </button>
        </div>

        <div className="p-6">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, DNI o cargo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-roka-400"
                />
              </div>
            </div>

            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-roka-400"
            >
              <option value="">Todas las áreas</option>
              {areasUnicas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-roka-400"
            >
              <option value="">Todos los estados</option>
              <option value="al_dia">🟢 Al día</option>
              <option value="atencion">🟡 Atención</option>
              <option value="critico">🔴 Crítico</option>
              <option value="sin_capacitacion">⚪ Sin capacitación</option>
            </select>

            {(search || filtroArea || filtroEstado) && (
              <button
                onClick={() => {
                  setSearch('')
                  setFiltroArea('')
                  setFiltroEstado('')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* TAB: Tabla Resumen */}
          {tab === 'tabla' && (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">DNI</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Trabajador</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Cargo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Área</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Capacit.</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Horas</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Asist. %</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Última</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {trabajadoresFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-12 text-gray-400">
                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No se encontraron trabajadores</p>
                      </td>
                    </tr>
                  ) : (
                    trabajadoresFiltrados.map((t) => (
                      <tr key={t.personal_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">{t.dni}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{t.nombre_completo}</td>
                        <td className="py-3 px-4 text-gray-600">{t.cargo}</td>
                        <td className="py-3 px-4 text-gray-600">{t.area}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-xs">
                            {t.total_capacitaciones}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-purple-700 font-semibold">
                            <Clock size={14} />
                            {t.horas_acumuladas}h
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-semibold ${
                            t.porcentaje_asistencia >= 80 ? 'text-green-600' :
                            t.porcentaje_asistencia >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {t.porcentaje_asistencia}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-gray-500">
                          {t.dias_sin_capacitacion !== null ? (
                            <span>hace {t.dias_sin_capacitacion}d</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_CONFIG[t.estado]?.color}`}>
                            <span className={`w-2 h-2 rounded-full ${ESTADO_CONFIG[t.estado]?.dot}`}></span>
                            {ESTADO_CONFIG[t.estado]?.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setPersonalIdDetalle(t.personal_id)}
                            className="p-2 text-roka-600 hover:bg-roka-50 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: Matriz de Competencias */}
          {tab === 'matriz' && (
            <div>
              {/* Selector de año: cada año tiene su propio plan de capacitaciones.
                  Se muestra aunque el año elegido esté vacío, para poder volver. */}
              {matrizData.anios_disponibles?.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={15} className="text-gray-400" />
                  <span className="text-sm text-gray-600">Plan del año</span>
                  <select
                    value={anioMatriz}
                    onChange={e => cambiarAnioMatriz(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-roka-500"
                  >
                    {(matrizData.anios_disponibles?.length
                      ? matrizData.anios_disponibles
                      : [anioMatriz]
                    ).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              )}

              {/* Resumen del avance del grupo visible, sobre la tabla */}
              {!loadingMatriz && matrizData.temas.length > 0 && promedioMatriz && (
                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-white p-2 text-roka-600 border border-gray-200">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          Avance promedio · plan {matrizData.anio ?? anioMatriz}
                        </p>
                        <p className={`text-2xl font-bold leading-tight ${
                          promedioMatriz.plan >= 80 ? 'text-green-600' :
                          promedioMatriz.plan >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {promedioMatriz.plan}%
                        </p>
                      </div>
                    </div>

                    {promedioMatriz.ejecutado !== null && (
                      <div className="border-l border-gray-200 pl-8">
                        <p className="text-xs text-gray-500">Sobre lo ya dictado</p>
                        <p className={`text-2xl font-bold leading-tight ${
                          promedioMatriz.ejecutado >= 80 ? 'text-green-600' :
                          promedioMatriz.ejecutado >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {promedioMatriz.ejecutado}%
                        </p>
                      </div>
                    )}

                    <div className="border-l border-gray-200 pl-8">
                      <p className="text-xs text-gray-500">Asistencias registradas</p>
                      <p className="text-2xl font-bold leading-tight text-gray-900">
                        {promedioMatriz.completadas}
                        <span className="text-sm font-normal text-gray-400">/{promedioMatriz.totales}</span>
                      </p>
                    </div>

                    {/* Barra de avance sobre el plan del año */}
                    <div className="min-w-[180px] flex-1">
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>{promedioMatriz.trabajadores} trabajadores</span>
                        <span>
                          {matrizData.temas_ejecutados ?? 0} de {matrizData.temas.length} capacit. dictadas
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            promedioMatriz.plan >= 80 ? 'bg-green-500' :
                            promedioMatriz.plan >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${promedioMatriz.plan}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!loadingMatriz && matrizData.temas.length === 0 && (
                <div className="text-center">
                  <button
                    onClick={() => cargarMatriz()}
                    className="px-6 py-3 bg-roka-600 text-white rounded-lg hover:bg-roka-700"
                  >
                    Cargar Matriz de Competencias
                  </button>
                  {matrizData.anios_disponibles?.length > 0 && (
                    <p className="text-sm text-gray-500 mt-3">
                      El año {anioMatriz} no tiene capacitaciones programadas.
                    </p>
                  )}
                </div>
              )}

              {loadingMatriz && (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roka-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Cargando matriz...</p>
                </div>
              )}

              {!loadingMatriz && matrizData.temas.length > 0 && (
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 sticky top-0 z-20">
                        <th className="sticky left-0 bg-gray-50 border border-gray-300 p-2 text-left font-semibold text-gray-700 min-w-[150px] align-bottom z-30">
                          Trabajador
                        </th>
                        {matrizData.temas.map((tema, idx) => (
                          <th key={idx}
                            title={[
                              tema.titulo,
                              tema.tema && `Categoría: ${tema.tema}`,
                              tema.fecha && `Programada: ${tema.fecha}`,
                              tema.ejecutada ? `Ejecutada (${tema.ejecutadas} de ${tema.total})` : 'Aún no ejecutada',
                            ].filter(Boolean).join('\n')}
                            className={`border border-gray-300 font-semibold w-[74px] min-w-[74px] max-w-[74px] h-60 p-1 align-bottom ${
                              tema.ejecutada ? 'text-gray-700 bg-gray-50' : 'text-gray-400 bg-gray-100'
                            }`}>
                            {/* Texto vertical de abajo hacia arriba. writing-mode hace que la
                                altura marque el largo de línea, así que los títulos largos se
                                envuelven en varias líneas dentro del ancho de la columna. */}
                            <div className="flex justify-center h-[228px]">
                              <div
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                className="h-full text-xs leading-tight font-normal"
                              >
                                {!tema.ejecutada && <Clock size={10} className="inline mb-1" />}
                                {tema.titulo}
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="border border-gray-300 p-2 text-center font-semibold text-gray-700 align-bottom bg-gray-50 min-w-[70px]">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrizFiltrada.map((fila, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="sticky left-0 bg-white border border-gray-300 p-2 font-medium text-gray-900 align-middle z-10">
                            <div>{fila.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{fila.cargo}</div>
                          </td>
                          {matrizData.temas.map((tema, tIdx) => (
                            <td key={tIdx} className={`border border-gray-300 p-2 text-center align-middle ${tema.ejecutada ? '' : 'bg-gray-50'}`}>
                              <div className="flex items-center justify-center">
                                {fila.competencias[tema.titulo] ? (
                                  <CheckCircle size={18} className="text-green-600" />
                                ) : tema.ejecutada ? (
                                  <X size={18} className="text-red-400" />
                                ) : (
                                  <span className="text-gray-300" title="Capacitación aún no ejecutada">—</span>
                                )}
                              </div>
                            </td>
                          ))}
                          <td className="border border-gray-300 p-2 text-center align-middle">
                            <span className={`font-bold ${
                              fila.porcentaje_cumplimiento >= 80 ? 'text-green-600' :
                              fila.porcentaje_cumplimiento >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {fila.porcentaje_cumplimiento}%
                            </span>
                            <div className="text-[10px] text-gray-400 whitespace-nowrap">
                              {fila.completadas}/{fila.total_temas}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                    <p>
                      <strong>{matrizData.temas.length}</strong> capacitaciones del cronograma {matrizData.anio ?? anioMatriz}
                      {' · '}
                      <span className="text-green-700">{matrizData.temas_ejecutados ?? 0} ejecutados</span>
                      {' · '}
                      <span className="text-gray-500">
                        {matrizData.temas.length - (matrizData.temas_ejecutados ?? 0)} pendientes
                      </span>
                    </p>
                    <p>
                      <strong>{matrizFiltrada.length}</strong> trabajadores
                      {matrizFiltrada.length !== matrizData.matriz.length && ` (de ${matrizData.matriz.length} totales)`}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><CheckCircle size={13} className="text-green-600" /> Asistió</span>
                      <span className="flex items-center gap-1"><X size={13} className="text-red-400" /> No asistió</span>
                      <span className="flex items-center gap-1"><span className="text-gray-300 font-bold">—</span> Tema aún no ejecutado</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Notas por trabajador */}
          {tab === 'notas' && (
            <div>
              {!loadingNotas && notasData.length === 0 && (
                <button
                  onClick={async () => {
                    setLoadingNotas(true)
                    try {
                      const { data } = await api.get('/capacitaciones/notas-trabajadores')
                      setNotasData(data)
                    } catch (err) {
                      toast.error('Error al cargar notas')
                    } finally {
                      setLoadingNotas(false)
                    }
                  }}
                  className="mx-auto block px-6 py-3 bg-roka-600 text-white rounded-lg hover:bg-roka-700"
                >
                  Cargar Notas por Trabajador
                </button>
              )}

              {loadingNotas && (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roka-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Cargando notas...</p>
                </div>
              )}

              {!loadingNotas && notasData.length > 0 && (
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">DNI</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Trabajador</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Cargo</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Área</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Total Evaluaciones</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                          <div className="flex flex-col items-center">
                            <span>Aprobadas</span>
                            <span className="text-xs font-normal text-green-600">(≥11)</span>
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                          <div className="flex flex-col items-center">
                            <span>Desaprobadas</span>
                            <span className="text-xs font-normal text-red-600">(&lt;11)</span>
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Promedio</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Nota Máxima</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50">Nota Mínima</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notasFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="text-center py-12 text-gray-400">
                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No se encontraron trabajadores que coincidan con los filtros</p>
                          </td>
                        </tr>
                      ) : (
                        notasFiltradas.map((trabajador) => (
                          <tr key={trabajador.personal_id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-xs text-gray-500">{trabajador.dni}</td>
                            <td className="py-3 px-4 font-medium text-gray-900">{trabajador.nombre_completo}</td>
                            <td className="py-3 px-4 text-gray-600">{trabajador.cargo}</td>
                            <td className="py-3 px-4 text-gray-600">{trabajador.area}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-full font-semibold">
                                {trabajador.total_evaluaciones}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-full font-semibold">
                                {trabajador.aprobadas}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-10 bg-red-100 text-red-700 rounded-full font-semibold">
                                {trabajador.desaprobadas}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-bold text-lg ${
                                trabajador.promedio && trabajador.promedio >= 14 ? 'text-green-600' :
                                trabajador.promedio && trabajador.promedio >= 11 ? 'text-yellow-600' :
                                trabajador.promedio ? 'text-red-600' : 'text-gray-400'
                              }`}>
                                {trabajador.promedio !== null && trabajador.promedio !== undefined
                                  ? Number(trabajador.promedio).toFixed(1)
                                  : '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-green-600 font-semibold">
                                {trabajador.nota_maxima !== null && trabajador.nota_maxima !== undefined
                                  ? Number(trabajador.nota_maxima).toFixed(1)
                                  : '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-gray-600 font-semibold">
                                {trabajador.nota_minima !== null && trabajador.nota_minima !== undefined
                                  ? Number(trabajador.nota_minima).toFixed(1)
                                  : '-'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 Criterios de Estado:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-blue-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span><strong>Al día:</strong> Última capacitación ≤30 días</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span><strong>Atención:</strong> Entre 31-60 días</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span><strong>Crítico:</strong> Más de 60 días</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
            <span><strong>Sin capacitación:</strong> Nunca capacitado</span>
          </div>
        </div>
      </div>

      {/* Modal de Detalle */}
      {personalIdDetalle && (
        <ModalDetalle
          personalId={personalIdDetalle}
          onClose={() => setPersonalIdDetalle(null)}
        />
      )}
    </div>
  )
}
