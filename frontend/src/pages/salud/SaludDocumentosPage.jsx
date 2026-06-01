import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, Download, FileText, FileImage,
  File, Eye, ChevronRight, Upload, FolderOpen,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_LABEL = {
  pre_ocupacional:'Pre-ocupacional', periodico:'Periódico anual',
  retiro:'Retiro', por_cambio_ocupacional:'Cambio de puesto',
}
const RESULTADO_COLOR = {
  apto:                  'bg-emerald-50 text-emerald-700 border-emerald-200',
  apto_con_restricciones:'bg-amber-50 text-amber-700 border-amber-200',
  no_apto:               'bg-red-50 text-red-700 border-red-200',
}
const RESULTADO_LABEL = { apto:'APTO', apto_con_restricciones:'APTO C/R', no_apto:'NO APTO' }

function FileIcon({ tipo, size = 18 }) {
  if (['jpg','jpeg','png','gif','webp'].includes(tipo))
    return <FileImage size={size} className="text-blue-500" />
  if (tipo === 'pdf')
    return <FileText size={size} className="text-red-500" />
  return <File size={size} className="text-gray-400" />
}

function FileTypeTag({ tipo }) {
  const cfg = {
    pdf:  'bg-red-50 text-red-600 border-red-200',
    jpg:  'bg-blue-50 text-blue-600 border-blue-200',
    jpeg: 'bg-blue-50 text-blue-600 border-blue-200',
    png:  'bg-indigo-50 text-indigo-600 border-indigo-200',
  }
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${cfg[tipo] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {tipo || 'doc'}
    </span>
  )
}

export default function SaludDocumentosPage() {
  const navigate = useNavigate()
  const [docs, setDocs]         = useState([])
  const [meta, setMeta]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtroTipo, setFTipo]  = useState('')
  const [pagina, setPagina]     = useState(1)
  const [vista, setVista]       = useState('tabla') // 'tabla' | 'tarjetas'

  useEffect(() => { setPagina(1) }, [search, filtroTipo])
  useEffect(() => { cargar() }, [pagina, search, filtroTipo])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/salud/documentos', {
        params: {
          search:   search || undefined,
          tipo:     filtroTipo || undefined,
          per_page: 20,
          page:     pagina,
        },
      })
      setDocs(data.data || data)
      setMeta(data.meta || null)
    } catch { toast.error('Error al cargar documentos') } finally { setLoading(false) }
  }

  const descargar = (doc) => {
    if (!doc.archivo_url) { toast.error('Este registro no tiene archivo adjunto'); return }
    const a = document.createElement('a')
    a.href     = doc.archivo_url
    a.download = `EMO_${doc.personal?.apellidos}_${doc.personal?.nombres}_${doc.fecha_examen}.${doc.archivo_tipo || 'pdf'}`
    a.target   = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const verArchivo = (doc) => {
    if (!doc.archivo_url) { toast.error('Sin archivo adjunto'); return }
    window.open(doc.archivo_url, '_blank')
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/salud')} className="btn-back">
            <ArrowLeft size={14} /> Salud
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documentos EMO</h1>
            <p className="text-gray-500 text-sm mt-0.5">Informes y archivos adjuntos de exámenes médicos</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Toggle vista */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setVista('tabla')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${vista === 'tabla' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              Lista
            </button>
            <button onClick={() => setVista('tarjetas')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${vista === 'tarjetas' ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              Tarjetas
            </button>
          </div>
          <button onClick={() => navigate('/salud/nuevo')}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Upload size={14} /> Subir documento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500" />
        </div>
        <select value={filtroTipo} onChange={e => setFTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Contador */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <FolderOpen size={15} className="text-roka-500" />
        <span><strong className="text-gray-700">{meta?.total ?? docs.length}</strong> documentos encontrados</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <FolderOpen size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-medium">Sin documentos adjuntos</p>
          <p className="text-sm text-gray-400 mt-1">Los documentos aparecen al subir un archivo al registrar un EMO</p>
          <button onClick={() => navigate('/salud/nuevo')}
            className="mt-4 inline-flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Upload size={14} /> Registrar EMO con documento
          </button>
        </div>
      ) : vista === 'tabla' ? (

        /* ── Vista tabla ── */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Documento','Trabajador','Tipo examen','Fecha','Resultado','Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileIcon tipo={doc.archivo_tipo} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <FileTypeTag tipo={doc.archivo_tipo} />
                          <span className="text-xs text-gray-400">EMO-{doc.id}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[120px] mt-0.5">
                          {doc.clinica || 'Sin clínica'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{doc.personal?.apellidos}, {doc.personal?.nombres}</p>
                    <p className="text-xs text-gray-400 font-mono">{doc.personal?.dni}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {TIPO_LABEL[doc.tipo] || doc.tipo}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {doc.fecha_examen ? format(new Date(doc.fecha_examen), 'd MMM yyyy', { locale: es }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {doc.resultado && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RESULTADO_COLOR[doc.resultado]}`}>
                        {RESULTADO_LABEL[doc.resultado]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => verArchivo(doc)}
                        title="Ver documento"
                        className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                        <Eye size={12} /> Ver
                      </button>
                      <button onClick={() => descargar(doc)}
                        title="Descargar"
                        className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                        <Download size={12} /> Descargar
                      </button>
                      <button onClick={() => navigate(`/salud/${doc.id}`)}
                        title="Ver EMO"
                        className="p-1.5 text-gray-400 hover:text-roka-600 hover:bg-roka-50 rounded-lg transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Mostrando {meta.from}–{meta.to} de {meta.total} documentos
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
        </div>

      ) : (

        /* ── Vista tarjetas ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map(doc => (
            <div key={doc.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {/* Preview del tipo de archivo */}
              <div className={`h-24 flex items-center justify-center ${
                doc.archivo_tipo === 'pdf'
                  ? 'bg-red-50'
                  : ['jpg','jpeg','png'].includes(doc.archivo_tipo)
                  ? 'bg-blue-50'
                  : 'bg-gray-50'
              }`}>
                <FileIcon tipo={doc.archivo_tipo} size={36} />
              </div>
              <div className="p-4 flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <FileTypeTag tipo={doc.archivo_tipo} />
                  {doc.resultado && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${RESULTADO_COLOR[doc.resultado]}`}>
                      {RESULTADO_LABEL[doc.resultado]}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 leading-snug">
                  {TIPO_LABEL[doc.tipo] || doc.tipo}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  {doc.personal?.apellidos}, {doc.personal?.nombres}
                </p>
                <p className="text-[11px] text-gray-400">
                  {doc.fecha_examen ? format(new Date(doc.fecha_examen), 'd MMM yyyy', { locale: es }) : '—'}
                  {doc.clinica ? ` · ${doc.clinica}` : ''}
                </p>
              </div>
              {/* Acciones */}
              <div className="px-4 pb-4 flex gap-2">
                <button onClick={() => verArchivo(doc)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-2 rounded-lg transition-colors font-medium">
                  <Eye size={13} /> Ver
                </button>
                <button onClick={() => descargar(doc)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2 rounded-lg transition-colors font-medium">
                  <Download size={13} /> Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
