import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  BarChart3, AlertTriangle, ClipboardCheck, GraduationCap,
  HardHat, HeartPulse, ShieldCheck, Printer, RefreshCw,
  TrendingDown, TrendingUp, Minus, Download,
  FileSearch, Siren, LifeBuoy,
} from 'lucide-react'
import api from '../../services/api'

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - i)

const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

/**
 * Etiqueta de valor sobre cada barra/punto. Los ceros se omiten: en series
 * mensuales la mayoría de meses vienen vacíos y llenarlos de "0" estorba.
 *
 * OJO con los colores: la app va en tema claro mediante overrides de clases
 * en index.css, pero Recharts recibe atributos SVG en línea que esos overrides
 * no alcanzan. Por eso aquí se fijan colores para fondo CLARO.
 */
const sinCeros = (v) => (Number(v) > 0 ? v : '')

const ESTILO_VALOR = { fontSize: 11, fontWeight: 700, fill: '#334155' }

const VALOR_ENCIMA  = { position: 'top',    style: ESTILO_VALOR, formatter: sinCeros }
const VALOR_DERECHA = { position: 'right',  style: ESTILO_VALOR, formatter: sinCeros }
// Dentro de una barra de color el texto va en blanco para que contraste
const VALOR_DENTRO  = { position: 'center', style: { ...ESTILO_VALOR, fill: '#ffffff' }, formatter: sinCeros }

// Paleta de ejes y rejilla acorde al tema claro
const COLOR_EJE    = '#64748b'
const COLOR_REJILLA = '#e2e8f0'

/**
 * Carga un reporte y expone el error en vez de tragárselo: si el endpoint falla,
 * el usuario debe ver el motivo, no un "Sin datos" que parece un año vacío.
 */
function useReporte(endpoint, anio, onDatos) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let vigente = true
    setLoading(true)
    setError(null)

    api.get(`/reportes/${endpoint}`, { params: { anio } })
      .then(r => {
        if (!vigente) return
        setData(r.data)
        onDatos?.(r.data)
      })
      .catch(err => {
        if (!vigente) return
        setError(err.response?.data?.message || err.message || 'No se pudo cargar el reporte')
      })
      .finally(() => { if (vigente) setLoading(false) })

    return () => { vigente = false }
  }, [endpoint, anio])

  return { data, loading, error }
}

const EstadoCarga = ({ loading, error }) => {
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
  }
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <AlertTriangle size={22} className="mx-auto mb-2 text-red-400" />
        <p className="text-red-300 font-medium">No se pudo generar el reporte</p>
        <p className="text-red-400/70 text-sm mt-1">{error}</p>
      </div>
    )
  }
  return <div className="text-center py-12 text-slate-500">Sin datos disponibles</div>
}

// ─── Exportación CSV ─────────────────────────────────────────────────────────

const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

function descargarCSV(nombre, columnas, filas) {
  const contenido = [columnas, ...filas].map(f => f.map(celda).join(';')).join('\r\n')
  // BOM para que Excel en español respete los acentos
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Convierte los datos de cada tab en columnas + filas para el CSV */
function csvDelTab(tab, d, anio) {
  if (!d) return null

  const planas = (obj, prefijo = '') =>
    Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? planas(v, `${prefijo}${k}.`)
        : [[`${prefijo}${k}`, v]]
    )

  switch (tab) {
    case 'accidentabilidad':
      return {
        nombre: `accidentabilidad_${anio}`,
        columnas: ['Mes', 'Accidentes', 'Incidentes', 'Mortales', 'Días perdidos', 'HHT', 'IF', 'IG', 'ISAL'],
        filas: d.serie.map(r => [r.mes, r.accidentes, r.incidentes, r.mortales ?? 0, r.dias_perdidos, r.hht, r.IF, r.IG, r.ISAL]),
      }
    case 'inspecciones':
      return {
        nombre: `inspecciones_${anio}`,
        columnas: ['Mes', 'Programadas', 'Realizadas', 'Cerradas', 'Cumplimiento %'],
        filas: d.por_mes.map(r => [r.mes, r.total, r.realizadas ?? 0, r.cerradas, r.cumplimiento]),
      }
    case 'capacitaciones':
      return {
        nombre: `capacitaciones_${anio}`,
        columnas: ['Mes', 'Programadas', 'Ejecutadas', 'Horas'],
        filas: d.por_mes.map(r => [r.mes, r.total, r.ejecutadas, r.horas]),
      }
    case 'salud':
      return {
        nombre: `salud_emo_${anio}`,
        columnas: ['Mes', 'EMO realizados', 'Atenciones', 'Bajas laborales'],
        filas: d.por_mes.map(r => [r.mes, r.emos, r.atenciones, r.bajas]),
      }
    case 'epps':
      return {
        nombre: `epps_${anio}`,
        columnas: ['Mes', 'Entregas'],
        filas: d.por_mes.map(r => [r.mes, r.entregas]),
      }
    case 'simulacros':
      return {
        nombre: `simulacros_${anio}`,
        columnas: ['Mes', 'Programados', 'Ejecutados', 'Personas evacuadas'],
        filas: d.por_mes.map(r => [r.mes, r.total, r.ejecutados, r.evacuadas]),
      }
    case 'auditorias':
      return {
        nombre: `auditorias_${anio}`,
        columnas: ['Mes', 'Programadas', 'Completadas'],
        filas: d.por_mes.map(r => [r.mes, r.total, r.completadas]),
      }
    case 'equipos':
      // El registro 07 se entrega como inventario detallado, no como serie
      return {
        nombre: `equipos_emergencia_${anio}`,
        columnas: ['Código', 'Equipo', 'Categoría', 'Ubicación', 'Área', 'Próxima revisión', 'Estado'],
        filas: (d.detalle || []).map(e => [
          e.codigo, e.nombre, e.categoria, e.ubicacion, e.area, e.fecha_proxima_revision, e.estado,
        ]),
      }
    default: // consolidado y sunafil: volcado indicador → valor
      return {
        nombre: `${tab}_${anio}`,
        columnas: ['Indicador', 'Valor'],
        filas: planas(d),
      }
  }
}

const KpiCard = ({ label, valor, sub, color = 'text-white', icon: Icon, iconColor = 'text-roka-400' }) => (
  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{valor ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      {Icon && <Icon size={20} className={iconColor} />}
    </div>
  </div>
)

const SectionTitle = ({ children }) => (
  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{children}</h3>
)

// ─── Tab Consolidado ─────────────────────────────────────────────────────────

function TabConsolidado({ anio, onDatos }) {
  const { data, loading, error } = useReporte('consolidado', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const { accidentabilidad: acc, inspecciones: insp, capacitaciones: cap, salud, epps, auditorias } = data

  return (
    <div className="space-y-6">
      {/* Indicadores legales */}
      <div>
        <SectionTitle>Indicadores de Accidentabilidad — {anio}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Accidentes" valor={acc.accidentes} sub={`${acc.mortales} mortal(es)`} icon={AlertTriangle} iconColor="text-red-400" color={acc.accidentes > 0 ? 'text-red-400' : 'text-white'} />
          <KpiCard label="Índice de Frecuencia" valor={acc.indice_frecuencia} sub="× 10⁶ HHT" icon={TrendingUp} iconColor="text-orange-400" />
          <KpiCard label="Índice de Gravedad" valor={acc.indice_gravedad} sub="× 10⁶ HHT" icon={TrendingDown} iconColor="text-amber-400" />
          <KpiCard label="Días sin accidentes" valor={acc.dias_sin_accidentes} icon={ShieldCheck} iconColor="text-emerald-400" color="text-emerald-400" />
        </div>
      </div>

      {/* Gestión SST */}
      <div>
        <SectionTitle>Gestión SST — {anio}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Inspecciones" valor={insp.total} sub={`${insp.cumplimiento_pct}% cumplimiento`} icon={ClipboardCheck} iconColor="text-blue-400" />
          <KpiCard label="Capacitaciones" valor={cap.total} sub={`${cap.horas}h ejecutadas`} icon={GraduationCap} iconColor="text-purple-400" />
          <KpiCard label="EMO Vencidos" valor={salud.emos_vencidos} sub={`${salud.emos_proximos} próximos 30d`} icon={HeartPulse} iconColor={salud.emos_vencidos > 0 ? 'text-red-400' : 'text-slate-500'} color={salud.emos_vencidos > 0 ? 'text-red-400' : 'text-white'} />
          <KpiCard label="EPP Stock Crítico" valor={epps.stock_critico} sub={`${epps.entregas_mes} entregas este mes`} icon={HardHat} iconColor={epps.stock_critico > 0 ? 'text-amber-400' : 'text-slate-500'} color={epps.stock_critico > 0 ? 'text-amber-400' : 'text-white'} />
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Módulo', 'KPI Principal', 'Valor', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {[
              { mod: 'Accidentabilidad',  kpi: 'Accidentes año',        val: acc.accidentes,           ok: acc.accidentes === 0 },
              { mod: 'Inspecciones',      kpi: 'Cumplimiento %',         val: `${insp.cumplimiento_pct}%`, ok: insp.cumplimiento_pct >= 80 },
              { mod: 'Capacitaciones',    kpi: 'Ejecutadas vs. programadas', val: `${cap.ejecutadas}/${cap.total}`, ok: cap.cumplimiento_pct >= 80 },
              { mod: 'Salud/EMO',         kpi: 'EMO vencidos',           val: salud.emos_vencidos,       ok: salud.emos_vencidos === 0 },
              { mod: 'EPPs',              kpi: 'Stock crítico',          val: epps.stock_critico,        ok: epps.stock_critico === 0 },
              { mod: 'Auditorías',        kpi: 'Hallazgos abiertos',     val: auditorias.hallazgos_abiertos, ok: auditorias.hallazgos_abiertos === 0 },
            ].map(({ mod, kpi, val, ok }) => (
              <tr key={mod} className="hover:bg-slate-700/30">
                <td className="px-4 py-3 text-slate-200 font-medium">{mod}</td>
                <td className="px-4 py-3 text-slate-400">{kpi}</td>
                <td className="px-4 py-3 text-slate-200">{val}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {ok ? 'OK' : 'Atención'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab Accidentabilidad ────────────────────────────────────────────────────

function TabAccidentabilidad({ anio, onDatos }) {
  const { data, loading, error } = useReporte('accidentabilidad', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const { resumen: r, serie } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Accidentes" valor={r.total_accidentes} sub={`${r.mortales} mortal(es)`} icon={AlertTriangle} iconColor="text-red-400" color={r.total_accidentes > 0 ? 'text-red-400' : 'text-white'} />
        <KpiCard label="IF" valor={r.IF_anual} sub="Índice de Frecuencia" />
        <KpiCard label="IG" valor={r.IG_anual} sub="Índice de Gravedad" />
        <KpiCard label="ISAL" valor={r.ISAL_anual} sub="Índice de Accidentabilidad" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Accidentes e Incidentes por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={serie} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="mes" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis tick={{ fill: COLOR_EJE, fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Legend />
              <Bar dataKey="accidentes" name="Accidentes" fill="#ef4444" radius={[4,4,0,0]}>
                <LabelList dataKey="accidentes" {...VALOR_ENCIMA} />
              </Bar>
              <Bar dataKey="incidentes" name="Incidentes" fill="#f59e0b" radius={[4,4,0,0]}>
                <LabelList dataKey="incidentes" {...VALOR_ENCIMA} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>IF mensual (Índice de Frecuencia)</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={serie} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="mes" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="IF" name="IF" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }}>
                <LabelList dataKey="IF" {...VALOR_ENCIMA} />
              </Line>
              <Line type="monotone" dataKey="IG" name="IG" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }}>
                <LabelList dataKey="IG" {...VALOR_ENCIMA} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla mensual */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              {['Mes', 'Accid.', 'Incid.', 'Días perd.', 'IF', 'IG', 'ISAL'].map(h => (
                <th key={h} className="text-left px-3 py-3 text-xs font-medium text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {serie.map(row => (
              <tr key={row.mes} className="hover:bg-slate-700/30">
                <td className="px-3 py-2 text-slate-300 font-medium">{row.mes}</td>
                <td className="px-3 py-2 text-slate-400">{row.accidentes}</td>
                <td className="px-3 py-2 text-slate-400">{row.incidentes}</td>
                <td className="px-3 py-2 text-slate-400">{row.dias_perdidos}</td>
                <td className="px-3 py-2 text-slate-300">{row.IF}</td>
                <td className="px-3 py-2 text-slate-300">{row.IG}</td>
                <td className="px-3 py-2 text-slate-300">{row.ISAL}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab Inspecciones ────────────────────────────────────────────────────────

function TabInspecciones({ anio, onDatos }) {
  const { data, loading, error } = useReporte('inspecciones', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const total      = data.por_mes.reduce((s, m) => s + m.total, 0)
  const realizadas = data.por_mes.reduce((s, m) => s + (m.realizadas ?? 0), 0)
  const cerradas   = data.por_mes.reduce((s, m) => s + m.cerradas, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Programadas" valor={total} icon={ClipboardCheck} iconColor="text-blue-400" />
        <KpiCard label="Realizadas" valor={realizadas} sub={`${cerradas} cerradas`} icon={ClipboardCheck} iconColor="text-emerald-400" />
        <KpiCard label="Cumplimiento" valor={`${total > 0 ? Math.round((realizadas/total)*100) : 0}%`} />
        <KpiCard label="Hallazgos abiertos" valor={data.hallazgos_por_estado?.find(h => h.estado === 'abierto')?.total ?? 0} iconColor="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Inspecciones por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="mes" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis tick={{ fill: COLOR_EJE, fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="total" name="Programadas" fill="#3b82f6" radius={[4,4,0,0]}>
                <LabelList dataKey="total" {...VALOR_ENCIMA} />
              </Bar>
              <Bar dataKey="realizadas" name="Realizadas" fill="#10b981" radius={[4,4,0,0]}>
                <LabelList dataKey="realizadas" {...VALOR_ENCIMA} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Por tipo de inspección</SectionTitle>
          {data.por_tipo?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.por_tipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={90} label={({ tipo, percent }) => `${tipo} ${(percent * 100).toFixed(0)}%`}>
                  {data.por_tipo.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin inspecciones registradas</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Capacitaciones ──────────────────────────────────────────────────────

function TabCapacitaciones({ anio, onDatos }) {
  const { data, loading, error } = useReporte('capacitaciones', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const total = data.por_mes.reduce((s, m) => s + m.total, 0)
  const exec  = data.por_mes.reduce((s, m) => s + m.ejecutadas, 0)
  const horas = data.por_mes.reduce((s, m) => s + m.horas, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total programadas" valor={total} icon={GraduationCap} iconColor="text-purple-400" />
        <KpiCard label="Ejecutadas" valor={exec} iconColor="text-emerald-400" />
        <KpiCard label="Horas totales" valor={horas} sub="horas-capacitación" />
        <KpiCard label="Asistencia promedio" valor={`${data.asistencia_promedio}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Capacitaciones y horas por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="mes" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: COLOR_EJE, fontSize: 11 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Bar yAxisId="left" dataKey="ejecutadas" name="Ejecutadas" fill="#8b5cf6" radius={[4,4,0,0]}>
                <LabelList dataKey="ejecutadas" {...VALOR_ENCIMA} />
              </Bar>
              <Bar yAxisId="right" dataKey="horas" name="Horas" fill="#06b6d4" radius={[4,4,0,0]}>
                <LabelList dataKey="horas" {...VALOR_ENCIMA} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Por modalidad</SectionTitle>
          {data.por_modalidad?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.por_modalidad} dataKey="total" nameKey="modalidad" cx="50%" cy="50%" outerRadius={90}
                  label={({ modalidad, percent }) => `${modalidad} ${(percent*100).toFixed(0)}%`}>
                  {data.por_modalidad.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin datos de modalidad</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Salud ───────────────────────────────────────────────────────────────

function TabSalud({ anio, onDatos }) {
  const { data, loading, error } = useReporte('salud', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const totalEmos = data.por_mes.reduce((s, m) => s + m.emos, 0)
  const totalAten = data.por_mes.reduce((s, m) => s + m.atenciones, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="EMO realizados" valor={totalEmos} icon={HeartPulse} iconColor="text-emerald-400" />
        <KpiCard label="Atenciones" valor={totalAten} />
        <KpiCard label="Restricciones activas" valor={data.restricciones_activas} iconColor="text-amber-400" />
        <KpiCard label="Bajas laborales" valor={data.por_mes.reduce((s, m) => s + m.bajas, 0)} iconColor="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>EMO y atenciones por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="mes" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis tick={{ fill: COLOR_EJE, fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="emos" name="EMO" fill="#10b981" radius={[4,4,0,0]}>
                <LabelList dataKey="emos" {...VALOR_ENCIMA} />
              </Bar>
              <Bar dataKey="atenciones" name="Atenciones" fill="#3b82f6" radius={[4,4,0,0]}>
                <LabelList dataKey="atenciones" {...VALOR_ENCIMA} />
              </Bar>
              <Bar dataKey="bajas" name="Bajas" fill="#ef4444" radius={[4,4,0,0]}>
                <LabelList dataKey="bajas" {...VALOR_ENCIMA} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>EMO por resultado</SectionTitle>
          {data.por_resultado?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.por_resultado} dataKey="total" nameKey="resultado" cx="50%" cy="50%" outerRadius={90}
                  label={({ resultado, percent }) => `${resultado?.replace(/_/g,' ')} ${(percent*100).toFixed(0)}%`}>
                  {data.por_resultado.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin EMO registrados</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab EPPs ────────────────────────────────────────────────────────────────

function TabEpps({ anio, onDatos }) {
  const { data, loading, error } = useReporte('epps', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const totalEntregas = data.por_mes.reduce((s, m) => s + m.entregas, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Entregas en el año" valor={totalEntregas} icon={HardHat} iconColor="text-roka-400" />
        <KpiCard label="Stock crítico" valor={data.stock_critico} iconColor={data.stock_critico > 0 ? 'text-red-400' : 'text-slate-500'} color={data.stock_critico > 0 ? 'text-red-400' : 'text-white'} />
        <KpiCard label="Categorías" valor={data.por_categoria?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Entregas por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="mes" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis tick={{ fill: COLOR_EJE, fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="entregas" name="Entregas" fill="#f59e0b" radius={[4,4,0,0]}>
                <LabelList dataKey="entregas" {...VALOR_ENCIMA} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Stock por categoría</SectionTitle>
          {data.por_categoria?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.por_categoria} layout="vertical" margin={{ top: 22, right: 34, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
                <XAxis type="number" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
                <YAxis type="category" dataKey="categoria" width={90} tick={{ fill: COLOR_EJE, fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
                <Bar dataKey="stock" name="Stock disp." fill="#3b82f6" radius={[0,4,4,0]}>
                  <LabelList dataKey="stock" {...VALOR_DERECHA} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin EPPs registrados</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab SUNAFIL ─────────────────────────────────────────────────────────────

function TabSunafil({ anio, onDatos }) {
  const { data, loading, error } = useReporte('sunafil', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const { empresa, personal, accidentabilidad: a, gestion: g } = data

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Encabezado imprimible */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{empresa.razon_social || 'Empresa'}</h2>
            <p className="text-slate-400 text-sm">RUC: {empresa.ruc} · Año: {anio}</p>
            <p className="text-xs text-slate-500 mt-1">Generado: {new Date(data.generado_en).toLocaleString('es-PE')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Resumen para inspección</p>
            <p className="text-xs font-semibold text-roka-400">SUNAFIL</p>
          </div>
        </div>
      </div>

      {/* Personal */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <SectionTitle>Personal y Horas-Hombre</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard label="Total trabajadores activos" valor={personal.total_activo} />
          <KpiCard label="HHT estimadas (año)" valor={personal.hht_anual.toLocaleString('es-PE')} />
        </div>
      </div>

      {/* Accidentabilidad */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <SectionTitle>Registro de Accidentabilidad — {anio}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Accidentes mortales" valor={a.mortales} color={a.mortales > 0 ? 'text-red-400' : 'text-white'} />
          <KpiCard label="Accidentes incapacitantes" valor={a.incapacitantes} />
          <KpiCard label="Accidentes leves" valor={a.leves} />
          <KpiCard label="Incidentes peligrosos" valor={a.incidentes_peligrosos ?? 0} sub={`${a.incidentes ?? 0} incidentes`} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard label="Días perdidos" valor={a.dias_perdidos} />
          <KpiCard label="IF" valor={a.IF} sub="Índice de Frecuencia" />
          <KpiCard label="IG" valor={a.IG} sub="Índice de Gravedad" />
          <KpiCard label="ISAL" valor={a.ISAL} sub="Índice de Accidentabilidad" />
        </div>
      </div>

      {/* Gestión SST */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <SectionTitle>Gestión SST — {anio}</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Inspecciones" valor={`${g.inspecciones_ejec ?? 0}/${g.inspecciones}`} sub="realizadas / programadas" />
          <KpiCard label="Capacitaciones" valor={`${g.capacitaciones_ejec}/${g.capacitaciones_total}`} sub="ejecutadas / programadas" />
          <KpiCard label="Simulacros" valor={`${g.simulacros_ejec ?? 0}/${g.simulacros}`} sub="ejecutados / programados" />
          <KpiCard label="Auditorías SST" valor={`${g.auditorias_completadas ?? 0}/${g.auditorias}`} sub="completadas / programadas" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard label="Hallazgos abiertos" valor={g.hallazgos_abiertos ?? 0} color={g.hallazgos_abiertos > 0 ? 'text-amber-400' : 'text-white'} />
          <KpiCard label="EMO vencidos" valor={g.emos_vencidos} color={g.emos_vencidos > 0 ? 'text-red-400' : 'text-white'} />
          <KpiCard label="Documentos vigentes" valor={g.documentos_vigentes} />
          <KpiCard label="Formatos RM-050 vigentes" valor={g.formatos_vigentes} />
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center">
        Resumen generado automáticamente por SST ROKA — No reemplaza los registros físicos obligatorios (RM 050-2013-TR)
      </p>
    </div>
  )
}

// ─── Tab Auditorías · Registro 08 ────────────────────────────────────────────

const HALLAZGO_LABEL = {
  no_conformidad_mayor: 'No conformidad mayor',
  no_conformidad_menor: 'No conformidad menor',
  observacion:          'Observación',
  oportunidad_mejora:   'Oportunidad de mejora',
}

function TabAuditorias({ anio, onDatos }) {
  const { data, loading, error } = useReporte('auditorias', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const r = data.resumen

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Auditorías programadas" valor={r.total} icon={FileSearch} iconColor="text-cyan-400" />
        <KpiCard label="Completadas" valor={r.completadas} iconColor="text-emerald-400" />
        <KpiCard label="Hallazgos" valor={r.hallazgos_total} sub={`${r.hallazgos_cerrados} cerrados`} />
        <KpiCard label="Hallazgos vencidos" valor={r.hallazgos_vencidos}
          sub={`${r.cierre_pct}% de cierre`}
          color={r.hallazgos_vencidos > 0 ? 'text-red-400' : 'text-white'} iconColor="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Auditorías por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="mes" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis tick={{ fill: COLOR_EJE, fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Legend />
              <Bar dataKey="total" name="Programadas" fill="#06b6d4" radius={[4,4,0,0]}>
                <LabelList dataKey="total" {...VALOR_ENCIMA} />
              </Bar>
              <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[4,4,0,0]}>
                <LabelList dataKey="completadas" {...VALOR_ENCIMA} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Hallazgos por tipo</SectionTitle>
          {data.hallazgos_por_tipo?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.hallazgos_por_tipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={90}
                  label={({ tipo, percent }) => `${HALLAZGO_LABEL[tipo] || tipo} ${(percent*100).toFixed(0)}%`}>
                  {data.hallazgos_por_tipo.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin hallazgos registrados</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Simulacros · Registro 09 ────────────────────────────────────────────

const SIMULACRO_LABEL = {
  sismo: 'Sismo', incendio: 'Incendio', derrame: 'Derrame',
  evacuacion: 'Evacuación', primeros_auxilios: 'Primeros auxilios', violencia: 'Violencia',
}

function TabSimulacros({ anio, onDatos }) {
  const { data, loading, error } = useReporte('simulacros', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const r = data.resumen

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Programados" valor={r.total} icon={Siren} iconColor="text-orange-400" />
        <KpiCard label="Ejecutados" valor={r.ejecutados} iconColor="text-emerald-400" />
        <KpiCard label="Personas evacuadas" valor={r.personas_evacuadas} />
        <KpiCard label="Tiempo de respuesta" valor={`${r.tiempo_respuesta_min} min`} sub="promedio" />
      </div>

      {r.convocados > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Convocados" valor={r.convocados} />
          <KpiCard label="Asistentes" valor={r.asistentes} sub={`${r.asistencia_pct}% asistencia`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Simulacros por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_mes} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="mes" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis tick={{ fill: COLOR_EJE, fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Legend />
              <Bar dataKey="total" name="Programados" fill="#f59e0b" radius={[4,4,0,0]}>
                <LabelList dataKey="total" {...VALOR_ENCIMA} />
              </Bar>
              <Bar dataKey="ejecutados" name="Ejecutados" fill="#10b981" radius={[4,4,0,0]}>
                <LabelList dataKey="ejecutados" {...VALOR_ENCIMA} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <SectionTitle>Por tipo de emergencia</SectionTitle>
          {data.por_tipo?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.por_tipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={90}
                  label={({ tipo, percent }) => `${SIMULACRO_LABEL[tipo] || tipo} ${(percent*100).toFixed(0)}%`}>
                  {data.por_tipo.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Sin simulacros registrados</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Equipos de emergencia · Registro 07 ─────────────────────────────────

const CATEGORIA_LABEL = {
  contra_incendio:   'Contra incendio',
  primeros_auxilios: 'Primeros auxilios',
  evacuacion:        'Evacuación',
  comunicaciones:    'Comunicaciones',
}
const ESTADO_EQUIPO = {
  operativo:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  mantenimiento: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  baja:          'bg-red-500/10 text-red-400 border-red-500/20',
  inactivo:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function TabEquiposEmergencia({ anio, onDatos }) {
  // Este registro es un inventario vigente, no una serie anual
  const { data, loading, error } = useReporte('equipos-emergencia', anio, onDatos)
  if (!data) return <EstadoCarga loading={loading} error={error} />

  const r = data.resumen
  const hoy = new Date()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Equipos de emergencia" valor={r.total} icon={LifeBuoy} iconColor="text-cyan-400" />
        <KpiCard label="Operativos" valor={r.operativos} sub={`${r.operatividad_pct}% operatividad`} iconColor="text-emerald-400" />
        <KpiCard label="Revisión vencida" valor={r.revision_vencida}
          color={r.revision_vencida > 0 ? 'text-red-400' : 'text-white'} iconColor="text-red-400" />
        <KpiCard label="Vencen en 30 días" valor={r.revision_proxima}
          color={r.revision_proxima > 0 ? 'text-amber-400' : 'text-white'} iconColor="text-amber-400" />
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <SectionTitle>Por categoría</SectionTitle>
        {data.por_categoria?.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.por_categoria.map(c => ({ ...c, categoria: CATEGORIA_LABEL[c.categoria] || c.categoria }))}
              margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLOR_REJILLA} />
              <XAxis dataKey="categoria" tick={{ fill: COLOR_EJE, fontSize: 11 }} />
              <YAxis tick={{ fill: COLOR_EJE, fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
              <Legend />
              <Bar dataKey="operativos" name="Operativos" fill="#10b981" radius={[4,4,0,0]} stackId="a">
                <LabelList dataKey="operativos" {...VALOR_DENTRO} />
              </Bar>
              <Bar dataKey="en_mantenimiento" name="En mantenimiento" fill="#f59e0b" radius={[4,4,0,0]} stackId="a">
                <LabelList dataKey="en_mantenimiento" {...VALOR_DENTRO} />
              </Bar>
              <Bar dataKey="fuera_servicio" name="Fuera de servicio" fill="#ef4444" radius={[4,4,0,0]} stackId="a">
                <LabelList dataKey="fuera_servicio" {...VALOR_DENTRO} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            Sin equipos clasificados como de emergencia en el catálogo
          </div>
        )}
      </div>

      {/* Detalle: es lo que se entrega en una inspección */}
      {data.detalle?.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 pt-5"><SectionTitle>Detalle del registro</SectionTitle></div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700 sticky top-0">
                <tr>
                  {['Código', 'Equipo', 'Categoría', 'Ubicación', 'Área', 'Próx. revisión', 'Estado'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {data.detalle.map((e, i) => {
                  const vencida = e.fecha_proxima_revision && new Date(e.fecha_proxima_revision) < hoy
                  return (
                    <tr key={`${e.codigo}-${i}`} className="hover:bg-slate-700/30">
                      <td className="px-3 py-2 text-slate-400 font-mono text-xs">{e.codigo || '—'}</td>
                      <td className="px-3 py-2 text-slate-200">{e.nombre}</td>
                      <td className="px-3 py-2 text-slate-400">{CATEGORIA_LABEL[e.categoria] || e.categoria}</td>
                      <td className="px-3 py-2 text-slate-400">{e.ubicacion || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{e.area || '—'}</td>
                      <td className={`px-3 py-2 ${vencida ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
                        {e.fecha_proxima_revision
                          ? new Date(e.fecha_proxima_revision).toLocaleDateString('es-PE')
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ESTADO_EQUIPO[e.estado] || ESTADO_EQUIPO.inactivo}`}>
                          {e.estado}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

const TABS = [
  { key: 'consolidado',    label: 'Consolidado',    icon: BarChart3 },
  { key: 'accidentabilidad', label: 'Accidentabilidad', icon: AlertTriangle },
  { key: 'inspecciones',   label: 'Inspecciones',   icon: ClipboardCheck },
  { key: 'capacitaciones', label: 'Capacitaciones', icon: GraduationCap },
  { key: 'salud',          label: 'Salud/EMO',      icon: HeartPulse },
  { key: 'epps',           label: 'EPPs',           icon: HardHat },
  { key: 'simulacros',     label: 'Simulacros',     icon: Siren },
  { key: 'equipos',        label: 'Equipos emerg.', icon: LifeBuoy },
  { key: 'auditorias',     label: 'Auditorías',     icon: FileSearch },
  { key: 'sunafil',        label: 'SUNAFIL',        icon: ShieldCheck },
]

export default function ReportesPage() {
  const [tab, setTab]   = useState('consolidado')
  const [anio, setAnio] = useState(ANIO_ACTUAL)
  const [datos, setDatos] = useState(null)

  // Cada cambio de tab o año invalida los datos cargados del anterior
  useEffect(() => { setDatos(null) }, [tab, anio])

  const recibirDatos = useCallback((d) => setDatos(d), [])

  const exportar = () => {
    const csv = csvDelTab(tab, datos, anio)
    if (csv) descargarCSV(csv.nombre, csv.columnas, csv.filas)
  }

  const TabComponent = {
    consolidado:    TabConsolidado,
    accidentabilidad: TabAccidentabilidad,
    inspecciones:   TabInspecciones,
    capacitaciones: TabCapacitaciones,
    salud:          TabSalud,
    epps:           TabEpps,
    simulacros:     TabSimulacros,
    equipos:        TabEquiposEmergencia,
    auditorias:     TabAuditorias,
    sunafil:        TabSunafil,
  }[tab]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes MINTRA</h1>
          <p className="text-slate-400 text-sm mt-1">Indicadores legales SST · RM 050-2013-TR · Ley 29783</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2"
          >
            {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={exportar}
            disabled={!datos}
            title={datos ? 'Descargar los datos de esta pestaña en CSV' : 'Esperando datos del reporte'}
            className="flex items-center gap-2 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Exportar CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-lg p-1 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      <TabComponent anio={anio} onDatos={recibirDatos} key={`${tab}-${anio}`} />
    </div>
  )
}
