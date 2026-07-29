import { useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, CalendarClock, CheckCircle, X, Trash2,
  AlertTriangle, Stethoscope, MapPin, Clock,
} from 'lucide-react'
import {
  format, parseISO, startOfDay, endOfDay,
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  addDays, addMonths, addQuarters, addYears, getQuarter,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
} from 'date-fns'
import { es } from 'date-fns/locale'

export const ESTADOS_CITA = {
  programada: { label: 'Programada', clase: 'bg-blue-50 text-blue-700 border-blue-200',       bar: '#3b82f6' },
  confirmada: { label: 'Confirmada', clase: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: '#6366f1' },
  realizada:  { label: 'Realizada',  clase: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: '#10b981' },
  cancelada:  { label: 'Cancelada',  clase: 'bg-gray-100 text-gray-500 border-gray-200',      bar: '#9ca3af' },
  no_asistio: { label: 'No asistió', clase: 'bg-red-50 text-red-600 border-red-200',          bar: '#ef4444' },
}

export const TIPO_LABEL = {
  pre_ocupacional: 'Pre-ocupacional',
  periodico: 'Periódico',
  retiro: 'Retiro',
  por_cambio_ocupacional: 'Cambio ocupacional',
}

const LABEL_W = 230
const RIGHT_W = 56
const ROW_H   = 40

// Ancho mínimo de la franja de tiempo según el rango, para que los días
// tengan espacio suficiente y el scroll horizontal haga el resto.
const ANCHO_TIMELINE = { mes: 960, trimestre: 1060, anio: 1020 }

const fechaDe = (cita) =>
  cita.fecha_cita ? parseISO(String(cita.fecha_cita).slice(0, 10)) : null

const claveDia = (fecha) => format(fecha, 'yyyy-MM-dd')

function rangoDe(rango, ancla) {
  if (rango === 'mes')       return [startOfMonth(ancla), endOfMonth(ancla)]
  if (rango === 'trimestre') return [startOfQuarter(ancla), endOfQuarter(ancla)]
  return [startOfYear(ancla), endOfYear(ancla)]
}

function moverAncla(rango, ancla, pasos) {
  if (rango === 'mes')       return addMonths(ancla, pasos)
  if (rango === 'trimestre') return addQuarters(ancla, pasos)
  return addYears(ancla, pasos)
}

function tituloRango(rango, ancla) {
  if (rango === 'mes')       return format(ancla, 'MMMM yyyy', { locale: es })
  if (rango === 'trimestre') return `${getQuarter(ancla)}.º trimestre ${format(ancla, 'yyyy')}`
  return format(ancla, 'yyyy')
}

export default function CitasGantt({ citas, onRealizar, onCambiarEstado, onEliminar }) {
  const [rango, setRango]         = useState('mes')       // 'mes' | 'trimestre' | 'anio'
  const [ancla, setAncla]         = useState(() => new Date())
  const [agruparPor, setAgrupar]  = useState('personal')  // 'personal' | 'clinica'
  const [seleccionada, setSel]    = useState(null)

  const [inicio, fin] = useMemo(() => rangoDe(rango, ancla), [rango, ancla])
  const totalMs = fin - inicio

  const pct    = (fecha) => ((fecha - inicio) / totalMs) * 100
  const ancho  = (desde, hasta) =>
    ((Math.min(hasta, fin) - Math.max(desde, inicio)) / totalMs) * 100

  // ── Columnas de la cabecera según el rango ──────────────────────
  const ticks = useMemo(() => {
    if (rango === 'mes') {
      return eachDayOfInterval({ start: inicio, end: fin }).map(d => ({
        key:   claveDia(d),
        label: format(d, 'd'),
        sub:   format(d, 'EEEEEE', { locale: es }),
        ancho: ancho(startOfDay(d), endOfDay(d)),
        finde: [0, 6].includes(d.getDay()),
      }))
    }
    if (rango === 'trimestre') {
      return eachWeekOfInterval({ start: inicio, end: fin }, { weekStartsOn: 1 }).map(d => ({
        key:   claveDia(d),
        label: format(d, 'd MMM', { locale: es }),
        sub:   null,
        ancho: ancho(startOfDay(d), endOfDay(addDays(d, 6))),
        finde: false,
      }))
    }
    return eachMonthOfInterval({ start: inicio, end: fin }).map(d => ({
      key:   claveDia(d),
      label: format(d, 'MMM', { locale: es }),
      sub:   null,
      ancho: ancho(startOfMonth(d), endOfMonth(d)),
      finde: false,
    }))
  }, [rango, inicio, fin])

  // ── Filas: citas del rango agrupadas por trabajador o clínica ───
  const filas = useMemo(() => {
    const grupos = new Map()

    for (const c of citas) {
      const f = fechaDe(c)
      if (!f || f < inicio || f > fin) continue

      const p = c.personal || {}
      const clave = agruparPor === 'clinica'
        ? (c.clinica?.trim() || '__sin_clinica')
        : `p-${c.personal_id}`

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          clave,
          titulo: agruparPor === 'clinica'
            ? (c.clinica?.trim() || 'Sin clínica asignada')
            : `${p.apellidos || ''}, ${p.nombres || ''}`.trim().replace(/^,\s*/, ''),
          subtitulo: agruparPor === 'clinica'
            ? null
            : (p.area?.nombre || p.dni || null),
          citas: [],
        })
      }
      grupos.get(clave).citas.push({ ...c, _fecha: f })
    }

    const filas = [...grupos.values()]
    for (const fila of filas) {
      fila.citas.sort((a, b) => a._fecha - b._fecha)
      fila.primera    = fila.citas[0]._fecha
      fila.pendientes = fila.citas.filter(c => ['programada', 'confirmada'].includes(c.estado)).length
      // Reparte el ancho del día entre las citas que caen el mismo día
      const porDia = new Map()
      for (const c of fila.citas) {
        const k = claveDia(c._fecha)
        if (!porDia.has(k)) porDia.set(k, [])
        porDia.get(k).push(c)
      }
      for (const delDia of porDia.values()) {
        delDia.forEach((c, i) => { c._slot = i; c._slots = delDia.length })
      }
    }
    filas.sort((a, b) => a.primera - b.primera || a.titulo.localeCompare(b.titulo))
    return filas
  }, [citas, inicio, fin, agruparPor])

  const totalCitas = filas.reduce((n, f) => n + f.citas.length, 0)

  const hoy      = new Date()
  const hoyDentro= hoy >= inicio && hoy <= fin
  const hoyPct   = hoyDentro ? pct(hoy) : 0

  const anchoTimeline = ANCHO_TIMELINE[rango]
  const mostrarHora   = rango === 'mes'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Controles del cronograma */}
      <div className="flex items-center gap-3 flex-wrap px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
          <button onClick={() => setAncla(a => moverAncla(rango, a, -1))}
            title="Período anterior"
            className="px-2 py-1.5 text-gray-500 hover:bg-gray-100">
            <ChevronLeft size={15} />
          </button>
          <span className="px-3 text-sm font-semibold text-gray-700 capitalize min-w-36 text-center">
            {tituloRango(rango, ancla)}
          </span>
          <button onClick={() => setAncla(a => moverAncla(rango, a, 1))}
            title="Período siguiente"
            className="px-2 py-1.5 text-gray-500 hover:bg-gray-100">
            <ChevronRight size={15} />
          </button>
        </div>

        <button onClick={() => setAncla(new Date())}
          className="text-xs text-gray-600 border border-gray-300 bg-white px-3 py-2 rounded-lg hover:bg-gray-100">
          Hoy
        </button>

        <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
          {[['mes', 'Mes'], ['trimestre', 'Trimestre'], ['anio', 'Año']].map(([k, label]) => (
            <button key={k} onClick={() => setRango(k)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${rango === k ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-400">Agrupar por</span>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
            {[['personal', 'Trabajador'], ['clinica', 'Clínica']].map(([k, label]) => (
              <button key={k} onClick={() => setAgrupar(k)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${agruparPor === k ? 'bg-roka-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: LABEL_W + anchoTimeline + RIGHT_W }}>

          {/* Cabecera de tiempo */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div style={{ width: LABEL_W, minWidth: LABEL_W }}
              className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 flex-shrink-0">
              {agruparPor === 'clinica' ? 'Clínica' : 'Trabajador'}
            </div>
            <div className="flex flex-1">
              {ticks.map(t => (
                <div key={t.key} style={{ width: `${t.ancho}%` }}
                  className={`text-center py-1.5 border-r border-gray-100 last:border-0 overflow-hidden ${t.finde ? 'bg-gray-100/70' : ''}`}>
                  <p className="text-[10px] font-semibold text-gray-500 leading-tight">{t.label}</p>
                  {t.sub && <p className="text-[9px] text-gray-400 leading-tight">{t.sub}</p>}
                </div>
              ))}
            </div>
            <div style={{ width: RIGHT_W, minWidth: RIGHT_W }}
              className="flex-shrink-0 border-l border-gray-200 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase">
              Citas
            </div>
          </div>

          {/* Filas */}
          <div className="relative">
            {/* Rejilla de fondo */}
            <div className="absolute inset-y-0 flex pointer-events-none"
              style={{ left: LABEL_W, right: RIGHT_W }}>
              {ticks.map(t => (
                <div key={t.key} style={{ width: `${t.ancho}%` }}
                  className={`border-r border-gray-100 last:border-0 h-full ${t.finde ? 'bg-gray-50' : ''}`} />
              ))}
            </div>

            {/* Línea de HOY */}
            {hoyDentro && filas.length > 0 && (
              <div className="absolute inset-y-0 pointer-events-none z-20"
                style={{ left: LABEL_W, right: RIGHT_W }}>
                <div className="absolute top-0 bottom-0 w-px bg-roka-500 opacity-70"
                  style={{ left: `${hoyPct}%` }} />
              </div>
            )}

            {filas.length === 0 ? (
              <div className="text-center py-16 relative">
                <CalendarClock size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 font-medium">Sin citas en este período</p>
                <p className="text-sm text-gray-400 mt-1">
                  Cambia de {rango === 'mes' ? 'mes' : rango === 'trimestre' ? 'trimestre' : 'año'} o amplía el rango.
                </p>
              </div>
            ) : filas.map(fila => (
              <div key={fila.clave}
                className="flex items-center border-b border-gray-100 last:border-0 relative transition-colors hover:bg-roka-50/30"
                style={{ height: ROW_H }}>

                {/* Etiqueta */}
                <div style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="flex items-center gap-2 px-3 border-r border-gray-200 h-full flex-shrink-0 overflow-hidden bg-inherit z-10">
                  <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {agruparPor === 'clinica'
                      ? <MapPin size={12} className="text-gray-400" />
                      : <Stethoscope size={12} className="text-gray-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{fila.titulo}</p>
                    {fila.subtitulo && (
                      <p className="text-[10px] text-gray-400 truncate leading-tight">{fila.subtitulo}</p>
                    )}
                  </div>
                </div>

                {/* Franja de tiempo */}
                <div className="flex-1 relative h-full">
                  {fila.citas.map(c => {
                    const est      = ESTADOS_CITA[c.estado] || ESTADOS_CITA.programada
                    const anchoDia = ancho(startOfDay(c._fecha), endOfDay(c._fecha))
                    const left     = pct(startOfDay(c._fecha)) + (anchoDia / c._slots) * c._slot
                    const p        = c.personal || {}
                    const hora     = c.hora ? String(c.hora).slice(0, 5) : null

                    return (
                      <button key={c.id}
                        onClick={() => setSel(c)}
                        title={[
                          format(c._fecha, "d 'de' MMMM yyyy", { locale: es }) + (hora ? ` · ${hora}` : ''),
                          agruparPor === 'clinica' ? `${p.apellidos || ''} ${p.nombres || ''}`.trim() : (c.clinica || 'Sin clínica'),
                          `${TIPO_LABEL[c.tipo] || c.tipo} · ${est.label}`,
                        ].filter(Boolean).join('\n')}
                        style={{
                          left:  `${left}%`,
                          width: `${anchoDia / c._slots}%`,
                          minWidth: c._slots === 1 ? 16 : 5,
                          backgroundColor: est.bar,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        className={`absolute h-[22px] rounded-md px-1 flex items-center justify-center overflow-hidden transition-all hover:brightness-90 hover:z-30 ${c.vencida ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}>
                        {mostrarHora && hora && c._slots === 1 && (
                          <span className="text-[9px] font-bold text-white/95 whitespace-nowrap">{hora}</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Contador */}
                <div style={{ width: RIGHT_W, minWidth: RIGHT_W }}
                  className="flex-shrink-0 border-l border-gray-100 text-center h-full flex flex-col justify-center">
                  <span className="text-xs font-bold text-gray-700 leading-tight">{fila.citas.length}</span>
                  {fila.pendientes > 0 && (
                    <span className="text-[9px] text-blue-500 leading-tight">{fila.pendientes} pend.</span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex-wrap">
        {Object.entries(ESTADOS_CITA).map(([k, s]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.bar }} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-red-500 flex-shrink-0" />
          Fecha vencida
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-px h-3 bg-roka-500 opacity-70" />
          Hoy
        </span>
        <span className="ml-auto">
          {totalCitas} cita{totalCitas === 1 ? '' : 's'} · {filas.length} {agruparPor === 'clinica' ? 'clínicas' : 'trabajadores'}
        </span>
      </div>

      {seleccionada && (
        <DetalleCita
          cita={seleccionada}
          onCerrar={() => setSel(null)}
          onRealizar={() => { const c = seleccionada; setSel(null); onRealizar(c) }}
          onCambiarEstado={(estado) => { const c = seleccionada; setSel(null); onCambiarEstado(c, estado) }}
          onEliminar={() => { const c = seleccionada; setSel(null); onEliminar(c) }}
        />
      )}
    </div>
  )
}

// ── Detalle de una cita del cronograma ────────────────────────────
function DetalleCita({ cita, onCerrar, onRealizar, onCambiarEstado, onEliminar }) {
  const est       = ESTADOS_CITA[cita.estado] || ESTADOS_CITA.programada
  const p         = cita.personal || {}
  const fecha     = fechaDe(cita)
  const pendiente = ['programada', 'confirmada'].includes(cita.estado)

  const filas = [
    ['Trabajador', `${p.apellidos || ''} ${p.nombres || ''}`.trim() || '—'],
    ['DNI',        p.dni || '—'],
    ['Área',       p.area?.nombre || '—'],
    ['Tipo',       TIPO_LABEL[cita.tipo] || cita.tipo],
    ['Clínica',    cita.clinica || '—'],
    ['Médico',     cita.medico || '—'],
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <CalendarClock size={17} className="text-roka-500" />
              {fecha ? format(fecha, "d 'de' MMMM yyyy", { locale: es }) : 'Cita'}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${est.clase}`}>{est.label}</span>
              {cita.hora && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={11} /> {String(cita.hora).slice(0, 5)}
                </span>
              )}
              {cita.vencida && (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle size={11} /> Fecha vencida
                </span>
              )}
            </div>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          {filas.map(([label, valor]) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-800 font-medium text-right">{valor}</span>
            </div>
          ))}
          {cita.observaciones && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm text-gray-700">{cita.observaciones}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onEliminar}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 mr-auto">
            <Trash2 size={14} /> Eliminar
          </button>
          {pendiente && (
            <>
              {cita.estado === 'programada' && (
                <button onClick={() => onCambiarEstado('confirmada')}
                  className="px-3 py-2 text-sm text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                  Confirmar
                </button>
              )}
              <button onClick={() => onCambiarEstado('no_asistio')}
                className="px-3 py-2 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100">
                No asistió
              </button>
              <button onClick={onRealizar}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                <CheckCircle size={14} /> Registrar examen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
