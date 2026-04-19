import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, CheckCircle, Archive, Download, History, Clock } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const TIPOS_LABELS = {
  politica:      'Política',
  procedimiento: 'Procedimiento',
  instructivo:   'Instructivo',
  registro:      'Registro',
  plan:          'Plan',
  programa:      'Programa',
  otro:          'Otro',
}

const TIPO_COLORS = {
  politica:      'bg-purple-900/50 text-purple-400',
  procedimiento: 'bg-blue-900/50 text-blue-400',
  instructivo:   'bg-cyan-900/50 text-cyan-400',
  registro:      'bg-amber-900/50 text-amber-400',
  plan:          'bg-orange-900/50 text-orange-400',
  programa:      'bg-indigo-900/50 text-indigo-400',
  otro:          'bg-slate-700 text-slate-300',
}

const ESTADO_COLORS = {
  borrador:    'bg-slate-700 text-slate-300',
  en_revision: 'bg-yellow-900/50 text-yellow-400',
  aprobado:    'bg-green-900/50 text-green-400',
  obsoleto:    'bg-slate-800 text-slate-500',
}

export default function DocumentoDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [documento, setDocumento] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(false)

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/documentos/${id}`)
      setDocumento(data)
    } catch {
      toast.error('Documento no encontrado')
      navigate('/documentos')
    } finally {
      setLoading(false)
    }
  }

  const handleAprobar = async () => {
    if (!confirm('¿Aprobar este documento?')) return
    setAccionando(true)
    try {
      const { data } = await api.post(`/documentos/${id}/aprobar`)
      setDocumento(d => ({ ...d, ...data }))
      toast.success('Documento aprobado')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al aprobar')
    } finally {
      setAccionando(false)
    }
  }

  const handleObsoleto = async () => {
    if (!confirm('¿Marcar como obsoleto? El documento ya no estará vigente.')) return
    setAccionando(true)
    try {
      const { data } = await api.post(`/documentos/${id}/obsoleto`)
      setDocumento(d => ({ ...d, ...data }))
      toast.success('Documento marcado como obsoleto')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error')
    } finally {
      setAccionando(false)
    }
  }

  const handleDescargar = async () => {
    try {
      const response = await api.get(`/documentos/${id}/descargar`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = documento.archivo_nombre || 'documento'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar el archivo')
    }
  }

  if (loading) return <div className="p-12 text-center text-slate-400">Cargando...</div>
  if (!documento) return null

  const estadoCfg = ESTADO_COLORS[documento.estado] || ''
  const tipoCfg   = TIPO_COLORS[documento.tipo] || ''

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/documentos')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{documento.titulo}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${estadoCfg}`}>
                {documento.estado === 'en_revision' ? 'En revisión' : documento.estado.charAt(0).toUpperCase() + documento.estado.slice(1)}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${tipoCfg}`}>
                {TIPOS_LABELS[documento.tipo] || documento.tipo}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              {documento.codigo} · v{documento.version_actual}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {documento.archivo_path && (
            <button
              onClick={handleDescargar}
              className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg text-sm"
            >
              <Download size={15} /> Descargar
            </button>
          )}
          {['borrador', 'en_revision'].includes(documento.estado) && (
            <>
              <button
                onClick={() => navigate(`/documentos/${id}/editar`)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg text-sm"
              >
                <Edit size={15} /> Editar
              </button>
              <button
                onClick={handleAprobar}
                disabled={accionando}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <CheckCircle size={15} /> Aprobar
              </button>
            </>
          )}
          {documento.estado === 'aprobado' && (
            <>
              <button
                onClick={() => navigate(`/documentos/${id}/editar`)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg text-sm"
              >
                <Edit size={15} /> Editar
              </button>
              <button
                onClick={handleObsoleto}
                disabled={accionando}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Archive size={15} /> Marcar Obsoleto
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-slate-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Información del Documento</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 text-sm">
          <Campo label="Código" valor={documento.codigo} mono />
          <Campo label="Versión actual" valor={`v${documento.version_actual}`} mono />
          <Campo label="Tipo" valor={TIPOS_LABELS[documento.tipo] || documento.tipo} />
          <Campo label="Área" valor={documento.area?.nombre || '—'} />
          <Campo label="Creado por" valor={`${documento.creado_por?.nombres || ''} ${documento.creado_por?.apellidos || ''}`} />
          {documento.aprobado_por && (
            <Campo label="Aprobado por" valor={`${documento.aprobado_por?.nombres || ''} ${documento.aprobado_por?.apellidos || ''}`} />
          )}
          {documento.fecha_aprobacion && (
            <Campo label="Fecha aprobación" valor={new Date(documento.fecha_aprobacion).toLocaleDateString('es-PE')} />
          )}
          {documento.fecha_revision && (
            <Campo
              label="Próxima revisión"
              valor={new Date(documento.fecha_revision).toLocaleDateString('es-PE')}
              alert={new Date(documento.fecha_revision) <= new Date(Date.now() + 30 * 86400000)}
            />
          )}
        </div>
        {documento.descripcion && (
          <div className="mt-4">
            <div className="text-slate-500 text-xs mb-1">Descripción</div>
            <div className="text-slate-300 text-sm">{documento.descripcion}</div>
          </div>
        )}
        {documento.observaciones && (
          <div className="mt-4">
            <div className="text-slate-500 text-xs mb-1">Observaciones</div>
            <div className="text-slate-300 text-sm">{documento.observaciones}</div>
          </div>
        )}
      </div>

      {/* Archivo */}
      {documento.archivo_nombre && (
        <div className="bg-slate-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Archivo actual</h2>
          <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3">
            <div>
              <div className="text-sm text-slate-300">{documento.archivo_nombre}</div>
              <div className="text-xs text-slate-500 mt-0.5">Versión {documento.version_actual}</div>
            </div>
            <button
              onClick={handleDescargar}
              className="flex items-center gap-2 px-3 py-1.5 bg-roka-700 hover:bg-roka-600 text-white rounded text-xs"
            >
              <Download size={13} /> Descargar
            </button>
          </div>
        </div>
      )}

      {/* Historial de versiones */}
      {documento.versiones?.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">Historial de versiones</h2>
          </div>
          <div className="space-y-2">
            {documento.versiones.map((v, i) => (
              <div
                key={v.id}
                className={`flex items-start justify-between p-3 rounded-lg ${i === 0 ? 'bg-slate-700' : 'bg-slate-900'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs text-slate-400 mt-0.5 flex-shrink-0">v{v.version}</span>
                  <div>
                    <div className="text-sm text-slate-300">{v.cambios || 'Sin descripción'}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <Clock size={11} />
                      {new Date(v.created_at).toLocaleString('es-PE')}
                      {v.creado_por && ` · ${v.creado_por.nombres} ${v.creado_por.apellidos}`}
                    </div>
                  </div>
                </div>
                {i === 0 && (
                  <span className="text-xs bg-roka-800/50 text-roka-300 px-2 py-0.5 rounded flex-shrink-0">Actual</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, valor, mono = false, alert = false }) {
  return (
    <div>
      <div className="text-slate-500 text-xs mb-0.5">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''} ${alert ? 'text-amber-400' : 'text-slate-200'}`}>
        {alert && <Clock size={12} className="inline mr-1" />}
        {valor || '—'}
      </div>
    </div>
  )
}
