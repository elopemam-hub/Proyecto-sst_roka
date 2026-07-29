import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, Plus, X, Printer, FileSpreadsheet, RefreshCw,
  Trash2, Pencil, CheckCircle2, ListPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import api from '../../services/api'

const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

const MODULO_LABEL = {
  manual:       'Carga manual',
  capacitacion: 'Capacitaciones',
  inspeccion:   'Inspecciones',
  simulacro:    'Simulacros',
  auditoria:    'Auditorías internas',
  iperc:        'IPERC',
  emo:          'Exámenes médicos (EMO)',
  accidente:    'Accidentes e incidentes',
  documento:    'Documentos del SGSST',
}

const ESTADO_PROGRAMA = {
  borrador:     'bg-gray-100 text-gray-600',
  aprobado:     'bg-emerald-50 text-emerald-700',
  en_ejecucion: 'bg-blue-50 text-blue-700',
  cerrado:      'bg-slate-100 text-slate-600',
}

const colorPct = (pct) =>
  pct === null ? 'text-gray-400' : pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'

const actividadVacia = (elementoId) => ({
  elemento_id: elementoId ?? '', numero: '', actividad: '', meses: [],
  segun_corresponda: false, meta_cantidad: '', meta_texto: '', evidencia_texto: '',
  responsable_texto: '', modulo_vinculado: 'manual', cantidad_ejecutada: '',
  estado: 'pendiente', observaciones: '',
})

export default function ProgramaMatrizPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [datos, setDatos]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [modal, setModal]     = useState(null)   // {tipo:'seccion'|'actividad', form, editandoId}

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/programa/${id}`)
      setDatos(data)
    } catch {
      toast.error('No se pudo cargar el programa')
    } finally {
      setLoading(false)
    }
  }

  const programa    = datos?.programa
  const elementos   = datos?.elementos ?? []
  const actividades = datos?.actividades ?? []
  const modulos     = datos?.modulos ?? ['manual']

  // El programa puede arrancar a mitad de año, como el formato de referencia
  // que va de junio a diciembre.
  const mesesVisibles = useMemo(() => {
    const desde = programa?.mes_inicio || 1
    return Array.from({ length: 12 - desde + 1 }, (_, i) => desde + i)
  }, [programa?.mes_inicio])

  // Filas en orden de impresión: cada sección seguida de sus actividades.
  const filas = useMemo(() => {
    const salida = []
    elementos.forEach(el => {
      salida.push({ tipo: 'seccion', elemento: el })
      actividades
        .filter(a => a.elemento_id === el.id)
        .forEach(a => salida.push({ tipo: 'actividad', actividad: a, elemento: el }))
    })
    const sueltas = actividades.filter(a => !elementos.some(el => el.id === a.elemento_id))
    if (sueltas.length) {
      salida.push({ tipo: 'seccion', elemento: { id: null, numero: '', nombre: 'SIN SECCIÓN' } })
      sueltas.forEach(a => salida.push({ tipo: 'actividad', actividad: a, elemento: null }))
    }
    return salida
  }, [elementos, actividades])

  const cumplimientoGlobal = programa?.porcentaje_cumplimiento ?? 0

  // ── Acciones ────────────────────────────────────────────────────────────

  const alternarMes = async (actividad, mes) => {
    if (actividad.segun_corresponda) return
    // Optimista: la matriz es una grilla y esperar al servidor en cada X la
    // vuelve inusable.
    const meses = actividad.meses?.includes(mes)
      ? actividad.meses.filter(m => m !== mes)
      : [...(actividad.meses ?? []), mes].sort((a, b) => a - b)

    setDatos(d => ({
      ...d,
      actividades: d.actividades.map(a => a.id === actividad.id ? { ...a, meses } : a),
    }))

    try {
      await api.patch(`/programa/actividades/${actividad.id}/mes`, { mes })
    } catch {
      toast.error('No se pudo guardar la programación')
      cargar()
    }
  }

  const recalcular = async () => {
    setSaving(true)
    try {
      const { data } = await api.post(`/programa/${id}/recalcular`)
      setDatos(data.programa)
      toast.success(data.message)
    } catch {
      toast.error('No se pudo recalcular el cumplimiento')
    } finally {
      setSaving(false)
    }
  }

  const generarPlantilla = async () => {
    setSaving(true)
    try {
      const { data } = await api.post(`/programa/${id}/plantilla`)
      setDatos(data.programa)
      toast.success(data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo generar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  const aprobar = async () => {
    setSaving(true)
    try {
      const { data } = await api.post(`/programa/${id}/aprobar`)
      setDatos(data)
      toast.success('Programa aprobado')
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo aprobar el programa')
    } finally {
      setSaving(false)
    }
  }

  const eliminarSeccion = async (elemento) => {
    const cuantas = actividades.filter(a => a.elemento_id === elemento.id).length
    if (!confirm(`¿Eliminar la sección "${elemento.nombre}"${cuantas ? ` y sus ${cuantas} actividades` : ''}?`)) return
    try {
      await api.delete(`/programa/elementos/${elemento.id}`)
      toast.success('Sección eliminada')
      cargar()
    } catch { toast.error('No se pudo eliminar la sección') }
  }

  const eliminarActividad = async (actividad) => {
    if (!confirm(`¿Eliminar la actividad ${actividad.numero || ''}?`)) return
    try {
      await api.delete(`/programa/actividades/${actividad.id}`)
      toast.success('Actividad eliminada')
      cargar()
    } catch { toast.error('No se pudo eliminar la actividad') }
  }

  const guardarModal = async () => {
    const { tipo, form, editandoId } = modal
    setSaving(true)
    try {
      if (tipo === 'seccion') {
        if (editandoId) await api.put(`/programa/elementos/${editandoId}`, form)
        else            await api.post(`/programa/${id}/elementos`, form)
      } else {
        const payload = {
          ...form,
          elemento_id:        form.elemento_id || null,
          meta_cantidad:      form.meta_cantidad === '' ? null : Number(form.meta_cantidad),
          cantidad_ejecutada: form.cantidad_ejecutada === '' ? null : Number(form.cantidad_ejecutada),
        }
        if (editandoId) await api.put(`/programa/actividades/${editandoId}`, payload)
        else            await api.post(`/programa/${id}/actividades`, payload)
      }
      setModal(null)
      toast.success('Guardado')
      cargar()
    } catch (e) {
      const errores = e.response?.data?.errors
      toast.error(errores ? Object.values(errores)[0][0] : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const exportarExcel = () => {
    const cabecera = [
      'N°', 'ACTIVIDADES',
      ...mesesVisibles.map(m => MESES[m - 1]),
      'META', 'EVIDENCIA', 'CUMPLIMIENTO', 'RESPONSABLES',
    ]

    const cuerpo = filas.map(fila => {
      if (fila.tipo === 'seccion') {
        return { 'N°': fila.elemento.numero, 'ACTIVIDADES': fila.elemento.nombre }
      }
      const a = fila.actividad
      const columnas = {
        'N°': a.numero || '',
        'ACTIVIDADES': a.actividad,
      }
      mesesVisibles.forEach(m => {
        columnas[MESES[m - 1]] = a.segun_corresponda ? '' : (a.meses?.includes(m) ? 'X' : '')
      })
      columnas['META']         = [a.meta_cantidad, a.meta_texto].filter(Boolean).join(' ')
      columnas['EVIDENCIA']    = a.evidencia_texto || ''
      columnas['CUMPLIMIENTO'] = a.segun_corresponda && !a.meta_cantidad
        ? 'Según corresponda'
        : `${a.cantidad_ejecutada}${a.meta_cantidad ? `/${a.meta_cantidad}` : ''}`
      columnas['RESPONSABLES'] = a.responsable_texto || ''
      return columnas
    })

    const hoja = XLSX.utils.json_to_sheet(cuerpo, { header: cabecera })
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, `PASST ${programa.anio}`)
    XLSX.writeFile(libro, `programa_anual_sst_${programa.anio}.xlsx`)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-roka-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!programa) return (
    <div className="text-center py-16 text-gray-400">No se encontró el programa</div>
  )

  const totalColumnas = 2 + mesesVisibles.length + 4

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button onClick={() => navigate('/programa')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_PROGRAMA[programa.estado] || 'bg-gray-100 text-gray-600'}`}>
          {programa.estado}
        </span>
        <div className="flex-1" />

        {actividades.length === 0 && (
          <button onClick={generarPlantilla} disabled={saving}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
            <ListPlus size={15} /> Generar plantilla RM 050
          </button>
        )}
        <button onClick={() => setModal({ tipo: 'seccion', form: { numero: elementos.length + 1, nombre: '' } })}
          className="flex items-center gap-2 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
          <Plus size={15} /> Sección
        </button>
        <button onClick={recalcular} disabled={saving}
          className="flex items-center gap-2 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={15} className={saving ? 'animate-spin' : ''} /> Recalcular cumplimiento
        </button>
        <button onClick={exportarExcel}
          className="flex items-center gap-2 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
          <FileSpreadsheet size={15} /> Excel
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
          <Printer size={15} /> Imprimir
        </button>
        {programa.estado === 'borrador' && (
          <button onClick={aprobar} disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
            <CheckCircle2 size={15} /> Aprobar
          </button>
        )}
        <button onClick={() => navigate(`/programa/${id}/editar`)}
          className="flex items-center gap-2 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
          <Pencil size={15} /> Encabezado
        </button>
      </div>

      {/* Formato PASST */}
      <div id="passt" className="bg-white border border-gray-300 shadow-sm overflow-x-auto">
        {/* Encabezado del formato */}
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 w-40 text-center align-middle">
                <span className="font-bold text-gray-700 text-xs leading-tight block">
                  {programa.empresa?.razon_social || 'EMPRESA'}
                </span>
              </td>
              <td className="border border-gray-400 p-3 text-center align-middle">
                <div className="font-bold text-gray-900 text-sm uppercase">
                  Programa Anual de Seguridad y Salud en el Trabajo
                </div>
                <div className="font-bold text-gray-800 mt-1">{programa.anio}</div>
                {programa.nombre && <div className="text-gray-500 mt-0.5">{programa.nombre}</div>}
              </td>
              <td className="border border-gray-400 p-0 w-56">
                {[
                  ['Código:',     programa.codigo],
                  ['Versión:',    programa.version],
                  ['Aprobación:', programa.fecha_aprobacion?.slice(0, 10)],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="flex border-b border-gray-400 last:border-b-0">
                    <span className="px-2 py-1.5 font-semibold text-gray-700 w-24 border-r border-gray-400">{etiqueta}</span>
                    <span className="px-2 py-1.5 font-bold text-gray-900 flex-1 text-center">{valor || '—'}</span>
                  </div>
                ))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Matriz */}
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 px-1 py-2 w-10">N°</th>
              <th className="border border-gray-400 px-2 py-2 text-left min-w-[280px]">ACTIVIDADES</th>
              {mesesVisibles.map(m => (
                <th key={m} className="border border-gray-400 px-0.5 py-2 w-6">
                  {/* Rotado como en el formato impreso: 12 meses no entran horizontales */}
                  <span className="block whitespace-nowrap text-[9px] font-semibold"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' }}>
                    {MESES[m - 1]}
                  </span>
                </th>
              ))}
              <th className="border border-gray-400 px-2 py-2 min-w-[150px]">META</th>
              <th className="border border-gray-400 px-2 py-2 min-w-[150px]">EVIDENCIA</th>
              <th className="border border-gray-400 px-2 py-2 w-28">CUMPLIMIENTO</th>
              <th className="border border-gray-400 px-2 py-2 min-w-[150px]">RESPONSABLES</th>
              <th className="border border-gray-400 px-1 py-2 w-14 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={totalColumnas + 1} className="border border-gray-400 text-center py-12 text-gray-400">
                  El programa no tiene actividades. Use «Generar plantilla RM 050» para partir de la estructura estándar.
                </td>
              </tr>
            )}

            {filas.map((fila, i) => fila.tipo === 'seccion' ? (
              <tr key={`s-${fila.elemento.id ?? 'sueltas'}-${i}`} className="bg-orange-200/80">
                <td className="border border-gray-400 px-1 py-1.5 text-center font-bold text-gray-800">
                  {fila.elemento.numero}
                </td>
                <td colSpan={totalColumnas - 1}
                  className="border border-gray-400 px-2 py-1.5 font-bold text-gray-800 uppercase">
                  {fila.elemento.nombre}
                </td>
                <td className="border border-gray-400 px-1 py-1.5 print:hidden">
                  {fila.elemento.id && (
                    <div className="flex items-center justify-center gap-1">
                      <button title="Agregar actividad"
                        onClick={() => setModal({ tipo: 'actividad', form: actividadVacia(fila.elemento.id) })}
                        className="p-0.5 text-gray-500 hover:text-roka-600"><Plus size={13} /></button>
                      <button title="Editar sección"
                        onClick={() => setModal({ tipo: 'seccion', editandoId: fila.elemento.id, form: { numero: fila.elemento.numero, nombre: fila.elemento.nombre } })}
                        className="p-0.5 text-gray-500 hover:text-gray-800"><Pencil size={12} /></button>
                      <button title="Eliminar sección" onClick={() => eliminarSeccion(fila.elemento)}
                        className="p-0.5 text-gray-500 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              <FilaActividad
                key={fila.actividad.id}
                actividad={fila.actividad}
                mesesVisibles={mesesVisibles}
                onAlternarMes={alternarMes}
                onEditar={() => setModal({
                  tipo: 'actividad',
                  editandoId: fila.actividad.id,
                  form: {
                    ...actividadVacia(fila.actividad.elemento_id),
                    ...fila.actividad,
                    meta_cantidad:      fila.actividad.meta_cantidad ?? '',
                    cantidad_ejecutada: fila.actividad.cantidad_ejecutada ?? '',
                  },
                })}
                onEliminar={() => eliminarActividad(fila.actividad)}
              />
            ))}
          </tbody>
        </table>

        {/* Pie: cumplimiento global y leyenda */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-3 py-2.5 border-t border-gray-400 bg-gray-50">
          <div className="flex items-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border border-gray-400 flex items-center justify-center font-bold text-gray-800">X</span>
              Programado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border border-gray-400 bg-emerald-100" />
              Con ejecución registrada en el sistema
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-600">Cumplimiento global</span>
            <span className={`text-xl font-bold ${colorPct(cumplimientoGlobal)}`}>{cumplimientoGlobal}%</span>
          </div>
        </div>
      </div>

      {modal && (
        <ModalEdicion
          modal={modal}
          setModal={setModal}
          elementos={elementos}
          modulos={modulos}
          saving={saving}
          onGuardar={guardarModal}
        />
      )}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body * { visibility: hidden; }
          #passt, #passt * { visibility: visible; }
          #passt { position: absolute; top: 0; left: 0; width: 100%; border: 0; box-shadow: none; }
          .print\\:hidden { display: none !important; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
    </div>
  )
}

// ── Fila de actividad ─────────────────────────────────────────────────────

function FilaActividad({ actividad: a, mesesVisibles, onAlternarMes, onEditar, onEliminar }) {
  const pct = a.porcentaje_cumplimiento
  const ejecutados = a.meses_ejecutados ?? []

  return (
    <tr className="hover:bg-gray-50/60">
      <td className="border border-gray-400 px-1 py-1.5 text-center text-gray-600 align-top">{a.numero || ''}</td>
      <td className="border border-gray-400 px-2 py-1.5 text-gray-800 align-top">
        {a.actividad}
        {a.observaciones && <span className="block text-[10px] text-gray-400 mt-0.5">{a.observaciones}</span>}
      </td>

      {a.segun_corresponda ? (
        <td colSpan={mesesVisibles.length}
          className="border border-gray-400 px-2 py-1.5 text-center text-gray-600 italic">
          Según corresponda
        </td>
      ) : mesesVisibles.map(mes => {
        const programado = a.meses?.includes(mes)
        const ejecutado  = ejecutados.includes(mes)
        return (
          <td key={mes}
            onClick={() => onAlternarMes(a, mes)}
            title={ejecutado ? 'Con ejecución registrada' : 'Clic para programar'}
            className={`border border-gray-400 text-center font-bold text-gray-800 cursor-pointer select-none
              ${ejecutado ? 'bg-emerald-100' : 'hover:bg-roka-50'}`}>
            {programado ? 'X' : ''}
          </td>
        )
      })}

      <td className="border border-gray-400 px-2 py-1.5 text-center align-top">
        <span className="text-roka-700 font-medium">
          {a.meta_cantidad ? `${a.meta_cantidad} ` : ''}{a.meta_texto || ''}
        </span>
      </td>
      <td className="border border-gray-400 px-2 py-1.5 text-center text-roka-700 align-top">
        {a.evidencia_texto || '—'}
      </td>
      <td className="border border-gray-400 px-2 py-1.5 text-center align-top">
        {pct === null ? (
          <span className="text-gray-400">—</span>
        ) : (
          <>
            <span className={`font-bold ${colorPct(pct)}`}>{pct}%</span>
            {a.meta_cantidad > 0 && (
              <span className="block text-[10px] text-gray-400">{a.cantidad_ejecutada}/{a.meta_cantidad}</span>
            )}
          </>
        )}
        {a.modulo_vinculado !== 'manual' && (
          <span className="block text-[9px] text-gray-400 print:hidden">auto · {MODULO_LABEL[a.modulo_vinculado]}</span>
        )}
      </td>
      <td className="border border-gray-400 px-2 py-1.5 text-center text-roka-700 align-top">
        {a.responsable_texto || (a.responsable ? `${a.responsable.nombres} ${a.responsable.apellidos}` : '—')}
      </td>
      <td className="border border-gray-400 px-1 py-1.5 print:hidden align-top">
        <div className="flex items-center justify-center gap-1">
          <button title="Editar" onClick={onEditar} className="p-0.5 text-gray-400 hover:text-gray-700"><Pencil size={12} /></button>
          <button title="Eliminar" onClick={onEliminar} className="p-0.5 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
        </div>
      </td>
    </tr>
  )
}

// ── Modal de sección / actividad ──────────────────────────────────────────

function ModalEdicion({ modal, setModal, elementos, modulos, saving, onGuardar }) {
  const { tipo, form, editandoId } = modal
  const set = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }))

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roka-500'
  const label = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">
            {tipo === 'seccion'
              ? (editandoId ? 'Editar sección' : 'Nueva sección')
              : (editandoId ? 'Editar actividad' : 'Nueva actividad')}
          </h3>
          <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {tipo === 'seccion' ? (
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={label}>N° *</label>
              <input type="number" min="1" value={form.numero}
                onChange={e => set('numero', e.target.value)} className={input} />
            </div>
            <div className="col-span-3">
              <label className={label}>Nombre de la sección *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className={input} placeholder="Ej: CAPACITACIÓN" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-3">
              <div>
                <label className={label}>N°</label>
                <input value={form.numero || ''} onChange={e => set('numero', e.target.value)}
                  className={input} placeholder="3.1" />
              </div>
              <div className="col-span-5">
                <label className={label}>Sección</label>
                <select value={form.elemento_id || ''} onChange={e => set('elemento_id', e.target.value)} className={input}>
                  <option value="">Sin sección</option>
                  {elementos.map(el => <option key={el.id} value={el.id}>{el.numero}. {el.nombre}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={label}>Actividad *</label>
              <textarea rows={2} value={form.actividad} onChange={e => set('actividad', e.target.value)}
                className={`${input} resize-none`} />
            </div>

            <div>
              <label className={label}>Programación</label>
              <div className="flex flex-wrap gap-1">
                {MESES.map((nombre, i) => {
                  const mes = i + 1
                  const activo = (form.meses ?? []).includes(mes)
                  return (
                    <button key={mes} type="button" disabled={form.segun_corresponda}
                      onClick={() => set('meses', activo
                        ? form.meses.filter(m => m !== mes)
                        : [...(form.meses ?? []), mes].sort((a, b) => a - b))}
                      className={`px-2 py-1 rounded text-[11px] border transition-colors disabled:opacity-40
                        ${activo ? 'bg-roka-500 border-roka-500 text-white' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                      {nombre.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
              <label className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                <input type="checkbox" checked={!!form.segun_corresponda}
                  onChange={e => set('segun_corresponda', e.target.checked)} className="accent-roka-500" />
                Según corresponda (sin meses fijos)
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Meta (cantidad)</label>
                <input type="number" min="0" value={form.meta_cantidad}
                  onChange={e => set('meta_cantidad', e.target.value)} className={input} />
              </div>
              <div className="col-span-2">
                <label className={label}>Meta (descripción)</label>
                <input value={form.meta_texto || ''} onChange={e => set('meta_texto', e.target.value)}
                  className={input} placeholder="Reuniones realizadas por el Comité de SST" />
              </div>
            </div>

            <div>
              <label className={label}>Evidencia</label>
              <input value={form.evidencia_texto || ''} onChange={e => set('evidencia_texto', e.target.value)}
                className={input} placeholder="Registro de asistencia" />
            </div>

            <div>
              <label className={label}>Responsables</label>
              <input value={form.responsable_texto || ''} onChange={e => set('responsable_texto', e.target.value)}
                className={input} placeholder="Unidad de Recursos Humanos" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Origen del cumplimiento</label>
                <select value={form.modulo_vinculado} onChange={e => set('modulo_vinculado', e.target.value)} className={input}>
                  {modulos.map(m => <option key={m} value={m}>{MODULO_LABEL[m] || m}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  {form.modulo_vinculado === 'manual'
                    ? 'La cantidad ejecutada se carga a mano.'
                    : 'Se cuenta automáticamente desde los registros del módulo.'}
                </p>
              </div>
              <div>
                <label className={label}>Cantidad ejecutada</label>
                <input type="number" min="0" value={form.cantidad_ejecutada}
                  disabled={form.modulo_vinculado !== 'manual'}
                  onChange={e => set('cantidad_ejecutada', e.target.value)}
                  className={`${input} disabled:bg-gray-100 disabled:text-gray-400`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Estado</label>
                <select value={form.estado} onChange={e => set('estado', e.target.value)} className={input}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="completado">Completado</option>
                  <option value="no_aplica">No aplica</option>
                </select>
              </div>
              <div>
                <label className={label}>Observaciones</label>
                <input value={form.observaciones || ''} onChange={e => set('observaciones', e.target.value)} className={input} />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setModal(null)}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={onGuardar} disabled={saving}
            className="px-4 py-2 bg-roka-500 hover:bg-roka-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
