import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Power, BookOpen, ChevronDown, ArrowLeft, Trash2 } from 'lucide-react'
import api from '../../services/api'

const TIPO_LABEL = {
  conf_nc_obs: 'C/NC/Obs',
  si_no_na:    'S/N/NA',
  texto:       'Texto',
  numero:      'Número',
  fecha:       'Fecha',
}

const EMPTY = {
  equipo_id: '', texto: '', tipo_respuesta: 'conf_nc_obs',
  es_obligatoria: true, permite_foto: true, permite_nota: true,
  ayuda: '', valor_limite: '', orden: 0,
}

export default function InspeccionPreguntasPage() {
  const navigate = useNavigate()
  const [equipos, setEquipos]       = useState([])
  const [equipoSel, setEquipoSel]   = useState(null)
  const [preguntas, setPreguntas]   = useState([])
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [editId, setEditId]         = useState(null)
  const [saving, setSaving]         = useState(false)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    api.get('/checklist/equipos').then(({ data }) => setEquipos(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!equipoSel) return
    setLoading(true)
    api.get(`/checklist/preguntas/${equipoSel.id}`)
      .then(({ data }) => setPreguntas(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipoSel])

  const abrirNuevo = () => {
    if (!equipoSel) return
    const maxOrden = preguntas.length > 0 ? Math.max(...preguntas.map(p => p.orden)) + 1 : 1
    setForm({ ...EMPTY, equipo_id: equipoSel.id, orden: maxOrden })
    setEditId(null)
    setModal(true)
  }

  const abrirEditar = (p) => {
    setForm({
      equipo_id: p.equipo_id, texto: p.texto, tipo_respuesta: p.tipo_respuesta,
      es_obligatoria: p.es_obligatoria, permite_foto: p.permite_foto,
      permite_nota: p.permite_nota, ayuda: p.ayuda || '', valor_limite: p.valor_limite || '', orden: p.orden,
    })
    setEditId(p.id)
    setModal(true)
  }

  const guardar = async () => {
    if (!form.texto || !form.equipo_id) return
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/checklist/preguntas/${editId}`, form)
      } else {
        await api.post('/checklist/preguntas', form)
      }
      if (equipoSel) {
        const { data } = await api.get(`/checklist/preguntas/${equipoSel.id}`)
        setPreguntas(data)
      }
      setModal(false)
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const toggle = async (p) => {
    await api.patch(`/checklist/preguntas/${p.id}/toggle`).catch(() => {})
    const { data } = await api.get(`/checklist/preguntas/${equipoSel.id}`)
    setPreguntas(data)
  }

  const eliminar = async (p) => {
    if (!window.confirm(`¿Eliminar la pregunta "${p.texto}"?`)) return
    await api.delete(`/checklist/preguntas/${p.id}`).catch(() => {})
    const { data } = await api.get(`/checklist/preguntas/${equipoSel.id}`)
    setPreguntas(data)
  }

  const activas  = preguntas.filter(p => p.activo).length
  const inactivas = preguntas.length - activas

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inspecciones')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors">
            <ArrowLeft size={14} /> Inspecciones
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banco de Preguntas</h1>
            <p className="text-gray-500 text-sm mt-1">Checklist por equipo del catálogo</p>
          </div>
        </div>
        <button onClick={abrirNuevo} disabled={!equipoSel}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
          <Plus size={16} /> Nueva pregunta
        </button>
      </div>

      {/* Selector equipo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <label className="block text-xs font-medium text-gray-500 mb-2">Seleccionar equipo</label>
        <div className="relative max-w-sm">
          <select
            value={equipoSel?.id || ''}
            onChange={e => {
              const found = equipos.find(eq => eq.id === parseInt(e.target.value))
              setEquipoSel(found || null)
              setPreguntas([])
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400 appearance-none pr-8"
          >
            <option value="">Seleccionar equipo...</option>
            {['A','B','C'].map(cod => {
              const grupo = equipos.filter(e => e.submodulo?.codigo === cod)
              if (!grupo.length) return null
              return (
                <optgroup key={cod} label={`Sub-módulo ${cod}`}>
                  {grupo.map(e => (
                    <option key={e.id} value={e.id}>{e.codigo} — {e.nombre}</option>
                  ))}
                </optgroup>
              )
            })}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {equipoSel && (
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span><span className="font-semibold text-gray-700">{activas}</span> preguntas activas</span>
            {inactivas > 0 && <span><span className="font-semibold text-gray-500">{inactivas}</span> inactivas</span>}
            <span className="text-gray-300">|</span>
            <span>Sub-módulo {equipoSel.submodulo?.codigo} — {equipoSel.submodulo?.nombre}</span>
          </div>
        )}
      </div>

      {/* Tabla preguntas */}
      {equipoSel && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['#', 'Texto de la pregunta', 'Tipo', 'Obligatoria', 'Foto', 'Activa', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Cargando...</td></tr>
              ) : preguntas.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin preguntas para este equipo</td></tr>
              ) : preguntas.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 ${!p.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.orden}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-sm">
                    <p className="truncate">{p.texto}</p>
                    {p.ayuda && <p className="text-xs text-gray-400 truncate">{p.ayuda}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                      {TIPO_LABEL[p.tipo_respuesta] || p.tipo_respuesta}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${p.es_obligatoria ? 'text-red-500' : 'text-gray-400'}`}>
                      {p.es_obligatoria ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${p.permite_foto ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {p.permite_foto ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      p.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {p.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirEditar(p)} title="Editar"
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => toggle(p)} title={p.activo ? 'Desactivar' : 'Activar'}
                        className={`p-1.5 rounded hover:bg-gray-100 ${p.activo ? 'text-gray-400 hover:text-amber-500' : 'text-gray-400 hover:text-emerald-500'}`}>
                        <Power size={14} />
                      </button>
                      <button onClick={() => eliminar(p)} title="Eliminar"
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!equipoSel && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
          <BookOpen size={36} className="opacity-40" />
          <p className="text-sm">Selecciona un equipo para ver su banco de preguntas</p>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-900 text-lg">{editId ? 'Editar pregunta' : 'Nueva pregunta'}</h2>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Texto de la pregunta *</label>
              <textarea rows={3} value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
                placeholder="¿El equipo cumple con...?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de respuesta</label>
                <select value={form.tipo_respuesta} onChange={e => setForm(f => ({ ...f, tipo_respuesta: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400">
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Orden</label>
                <input type="number" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: +e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Texto de ayuda</label>
              <input value={form.ayuda} onChange={e => setForm(f => ({ ...f, ayuda: e.target.value }))}
                placeholder="Instrucción para el inspector..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
            </div>

            {form.tipo_respuesta === 'numero' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Valor límite / referencia</label>
                <input value={form.valor_limite} onChange={e => setForm(f => ({ ...f, valor_limite: e.target.value }))}
                  placeholder="Ej: >= 300 lx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-400" />
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {[
                { key: 'es_obligatoria', label: 'Obligatoria' },
                { key: 'permite_foto',   label: 'Permite foto' },
                { key: 'permite_nota',   label: 'Permite nota' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="rounded" />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving || !form.texto}
                className="px-4 py-2 text-sm bg-roka-500 hover:bg-roka-600 text-white rounded-lg font-medium disabled:opacity-40">
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear pregunta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
