import { useState, useEffect } from 'react'
import { Plus, FileText, Download, Trash2, Edit, Calendar, AlertCircle, CheckCircle, Clock, X, Image, Search, AlertTriangle, Bell, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const FRECUENCIAS = {
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  bienal: 'Bienal (2 años)',
  quinquenal: 'Quinquenal (5 años)',
}

const ESTADOS = {
  activo: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  vencido: { label: 'Vencido', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  por_vencer: { label: 'Por vencer', color: 'bg-amber-100 text-amber-700', icon: Clock },
  inactivo: { label: 'Inactivo', color: 'bg-gray-100 text-gray-700', icon: null },
}

export default function EquipoCertificadosPage() {
  const navigate = useNavigate()
  const [certificados, setCertificados] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [total, setTotal] = useState(0)
  const [equiposDisponibles, setEquiposDisponibles] = useState([])
  const [submodulos, setSubmodulos] = useState([])
  const [areas, setAreas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [submoduloFiltro, setSubmoduloFiltro] = useState('')
  const [areaFiltro, setAreaFiltro] = useState('')
  const [alertas, setAlertas] = useState(null)
  const [form, setForm] = useState({
    equipo_catalogo_id: '',
    codigo: '',
    nombre: '',
    frecuencia: 'mensual',
    fecha_informe: '',
    fecha_vencimiento: '',
    estado: 'activo',
    observaciones: '',
    documento: null,
  })

  useEffect(() => { cargar() }, [pagina, busqueda, submoduloFiltro, areaFiltro])

  useEffect(() => {
    cargarTodosEquipos()
    cargarSubmodulos()
    cargarAreas()
    cargarAlertas()
  }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/equipos-certificados', {
        params: {
          page: pagina,
          per_page: 10,
          busqueda: busqueda || undefined,
          submodulo_id: submoduloFiltro || undefined,
          area_id: areaFiltro || undefined
        }
      })
      setCertificados(data.data || [])
      setTotalPaginas(data.last_page || 1)
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Error al cargar certificados:', err)
    } finally {
      setLoading(false)
    }
  }

  const cargarTodosEquipos = async () => {
    try {
      const { data } = await api.get('/equipos-certificados', {
        params: { per_page: 200 }
      })
      setEquiposDisponibles(data.data || [])
    } catch (err) {
      console.error('Error al cargar equipos:', err)
    }
  }

  const cargarSubmodulos = async () => {
    try {
      const { data } = await api.get('/checklist/submodulos')
      setSubmodulos(data || [])
    } catch (err) {
      console.error('Error al cargar submódulos:', err)
    }
  }

  const cargarAreas = async () => {
    try {
      const { data } = await api.get('/equipos-certificados/areas')
      setAreas(data || [])
    } catch (err) {
      console.error('Error al cargar áreas:', err)
    }
  }

  const cargarAlertas = async () => {
    try {
      const { data } = await api.get('/equipos-certificados/alertas')
      setAlertas(data?.resumen || null)
    } catch (err) {
      console.error('Error al cargar alertas:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      Object.keys(form).forEach(key => {
        if (form[key] !== null && form[key] !== '') {
          formData.append(key, form[key])
        }
      })

      if (editando) {
        await api.post(`/equipos-certificados/${editando.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: { _method: 'PUT' }
        })
      } else {
        await api.post('/equipos-certificados', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      await cargar()
      cerrarForm()
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar')
    }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este certificado?')) return
    try {
      await api.delete(`/equipos-certificados/${id}`)
      await cargar()
    } catch (err) {
      alert('Error al eliminar')
    }
  }

  const abrirForm = (cert = null) => {
    if (cert && cert.id) {
      // Editando certificado existente
      setForm({
        equipo_catalogo_id: cert.equipo_id || '',
        codigo: cert.codigo,
        nombre: cert.nombre || '',
        frecuencia: cert.frecuencia || 'mensual',
        fecha_informe: cert.fecha_informe || '',
        fecha_vencimiento: cert.fecha_vencimiento || '',
        estado: cert.estado,
        observaciones: cert.observaciones || '',
        documento: null,
      })
      setEditando(cert)
    } else if (cert && cert.equipo_id) {
      // Agregando certificado para un equipo sin certificado
      setForm({
        equipo_catalogo_id: cert.equipo_id,
        codigo: '',
        nombre: cert.equipo_nombre || '',
        frecuencia: 'mensual',
        fecha_informe: '',
        fecha_vencimiento: '',
        estado: 'activo',
        observaciones: '',
        documento: null,
      })
      setEditando(null)
    } else {
      // Nuevo certificado sin equipo pre-seleccionado
      setForm({
        equipo_catalogo_id: '',
        codigo: '',
        nombre: '',
        frecuencia: 'mensual',
        fecha_informe: '',
        fecha_vencimiento: '',
        estado: 'activo',
        observaciones: '',
        documento: null,
      })
      setEditando(null)
    }
    setMostrarForm(true)
  }

  const cerrarForm = () => {
    setMostrarForm(false)
    setEditando(null)
  }

  const diasParaVencer = (fecha) => {
    if (!fecha) return null
    const diff = Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/equipos')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Equipos
        </button>

        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-7 h-7 text-purple-600" />
          Certificados de Operatividad
        </h1>
        <p className="text-gray-500 mt-1">Gestión de certificados por tipo de equipo</p>
      </div>

      {/* Banner de Alertas */}
      {alertas && (alertas.total_vencidos > 0 || alertas.total_por_vencer > 0) && (
        <div className="mb-6 space-y-3">
          {/* Certificados Vencidos */}
          {alertas.total_vencidos > 0 && (
            <div
              onClick={() => navigate('/equipos/certificados/alertas')}
              className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg cursor-pointer hover:bg-red-100 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-800">
                    ⚠️ {alertas.total_vencidos} Certificado{alertas.total_vencidos > 1 ? 's' : ''} Vencido{alertas.total_vencidos > 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-red-700 mt-0.5">
                    Requieren renovación inmediata. Click para ver detalles.
                  </p>
                </div>
                <Bell className="w-5 h-5 text-red-600 animate-pulse" />
              </div>
            </div>
          )}

          {/* Certificados Próximos a Vencer */}
          {alertas.total_por_vencer > 0 && (
            <div
              onClick={() => navigate('/equipos/certificados/alertas')}
              className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-800">
                    🔔 {alertas.total_por_vencer} Certificado{alertas.total_por_vencer > 1 ? 's' : ''} por Vencer (30 días)
                  </h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Programar renovación próximamente. Click para ver detalles.
                  </p>
                </div>
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros y Acciones */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por equipo o código..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPagina(1)
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Filtro por Sub-módulo */}
        <select
          value={submoduloFiltro}
          onChange={(e) => {
            setSubmoduloFiltro(e.target.value)
            setPagina(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white min-w-[200px]"
        >
          <option value="">Todos los submódulos</option>
          {submodulos.map(submodulo => (
            <option key={submodulo.id} value={submodulo.id}>
              Sub-módulo {submodulo.codigo} — {submodulo.nombre}
            </option>
          ))}
        </select>

        {/* Filtro por Área */}
        <select
          value={areaFiltro}
          onChange={(e) => {
            setAreaFiltro(e.target.value)
            setPagina(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white min-w-[200px]"
        >
          <option value="">Todas las áreas</option>
          {areas.map(area => (
            <option key={area.id} value={area.id}>
              {area.codigo ? `${area.codigo} — ` : ''}{area.nombre}
            </option>
          ))}
        </select>

        {/* Botón Agregar */}
        <button
          onClick={() => abrirForm()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Nuevo Certificado
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-240px)] overflow-y-auto">
          <table className="w-full text-sm relative">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {['Equipo', 'Área', 'Código Cert.', 'Fecha de Informe', 'Fecha de Vencimiento', 'Documentos', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td>
                </tr>
              ) : certificados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">No hay equipos disponibles</td>
                </tr>
              ) : certificados.map(item => {
                const tieneCert = item.tiene_certificado
                const dias = tieneCert && item.fecha_vencimiento ? diasParaVencer(item.fecha_vencimiento) : null
                const IconEstado = tieneCert && item.estado ? ESTADOS[item.estado]?.icon : null

                return (
                  <tr key={`eq-${item.equipo_id}`} className={`hover:bg-gray-50 ${!tieneCert ? 'bg-gray-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.equipo_nombre}</div>
                      <div className="text-xs text-gray-500">{item.equipo_codigo}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{item.equipo_area || '—'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {tieneCert ? item.codigo : <span className="text-gray-400 italic">Sin cert.</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {tieneCert && item.fecha_informe ? format(new Date(item.fecha_informe), 'dd/MM/yyyy', { locale: es }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tieneCert && item.fecha_vencimiento ? (
                        <span className={`${dias < 0 ? 'text-red-600 font-semibold' : dias <= 30 ? 'text-amber-600 font-semibold' : 'text-gray-700'}`}>
                          {format(new Date(item.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tieneCert && item.documento_path ? (() => {
                        const ext = item.documento_path.split('.').pop().toLowerCase()
                        const isImage = ['jpg', 'jpeg', 'png'].includes(ext)
                        return (
                          <a
                            href={`/storage/${item.documento_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 ${isImage ? 'text-blue-600 hover:text-blue-700' : 'text-red-600 hover:text-red-700'}`}
                          >
                            {isImage ? <Image className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                            {isImage ? 'Imagen' : 'PDF'}
                          </a>
                        )
                      })() : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tieneCert && item.estado ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ESTADOS[item.estado].color}`}>
                          {IconEstado && <IconEstado className="w-3 h-3" />}
                          {ESTADOS[item.estado].label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin certificado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tieneCert ? (
                          <>
                            <button
                              onClick={() => abrirForm(item)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminar(item.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => abrirForm({ equipo_catalogo_id: item.equipo_id, nombre: item.equipo_nombre })}
                            className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded border border-purple-300"
                            title="Agregar certificado"
                          >
                            <Plus className="w-3 h-3 inline mr-1" />
                            Agregar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total: <span className="font-semibold">{total}</span> equipos
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Formulario */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {editando ? 'Editar Certificado' : 'Nuevo Certificado'}
              </h2>
              <button onClick={cerrarForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Equipo <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.equipo_catalogo_id}
                  onChange={(e) => {
                    const equipoId = e.target.value
                    const equipo = equiposDisponibles.find(c => c.equipo_id === parseInt(equipoId))
                    setForm({
                      ...form,
                      equipo_catalogo_id: equipoId,
                      codigo: '',
                      nombre: equipo?.equipo_nombre || ''
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">-- Seleccione un equipo --</option>
                  {equiposDisponibles.map(cert => (
                    <option key={cert.equipo_id} value={cert.equipo_id}>
                      {cert.equipo_codigo} - {cert.equipo_nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código del Certificado <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Informe
                  </label>
                  <input
                    type="date"
                    value={form.fecha_informe}
                    onChange={(e) => setForm({ ...form, fecha_informe: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {Object.entries(ESTADOS).map(([val, { label }]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documento (PDF, JPG, PNG)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png"
                  onChange={(e) => setForm({ ...form, documento: e.target.files[0] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {editando?.documento_path && (
                  <p className="text-xs text-gray-500 mt-1">
                    Documento actual: {editando.documento_path.split('/').pop()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={3}
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editando ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={cerrarForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
