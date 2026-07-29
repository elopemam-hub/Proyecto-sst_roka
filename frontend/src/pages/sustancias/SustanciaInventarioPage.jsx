import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Package, TrendingUp, TrendingDown, Search,
  AlertTriangle, ChevronDown, ChevronRight, Plus, X,
  Download, RotateCcw,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../../services/api'

const RIESGO_CFG = {
  muy_alto: { label:'Muy alto', cls:'bg-red-100 text-red-700 border-red-200',       dot:'bg-red-500' },
  alto:     { label:'Alto',     cls:'bg-orange-100 text-orange-700 border-orange-200', dot:'bg-orange-500' },
  medio:    { label:'Medio',    cls:'bg-amber-100 text-amber-700 border-amber-200',  dot:'bg-amber-500' },
  bajo:     { label:'Bajo',     cls:'bg-emerald-100 text-emerald-700 border-emerald-200', dot:'bg-emerald-500' },
}

const GHS_EMOJI = {
  GHS01:'💥',GHS02:'🔥',GHS03:'⭕',GHS04:'🔵',
  GHS05:'⚗️',GHS06:'☠️',GHS07:'⚠️',GHS08:'🫁',GHS09:'🌿',
}

// ── Barra de progreso de stock ──────────────────────────────────────────────
function StockBar({ saldo, minimo, maximo, unidad }) {
  if (!maximo && !minimo) return (
    <span className="text-sm font-bold text-gray-800">{saldo ?? '—'} <span className="text-xs font-normal text-gray-400">{unidad}</span></span>
  )
  const max = maximo || Math.max((saldo || 0) * 2, 10)
  const pct = Math.min(100, (saldo / max) * 100)
  const bajo = minimo && saldo <= minimo
  const color = bajo ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-0.5 min-w-[100px]">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-black ${bajo ? 'text-red-600' : 'text-gray-800'}`}>
          {saldo ?? 0} <span className="text-xs font-normal text-gray-400">{unidad}</span>
        </span>
        {bajo && <AlertTriangle size={12} className="text-red-500 flex-shrink-0"/>}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }}/>
      </div>
      {minimo && <p className="text-[9px] text-gray-400">mín: {minimo}</p>}
    </div>
  )
}

// ── Colores por área ────────────────────────────────────────────────────────
// A nivel de módulo para que la pestaña y la tarjeta usen el mismo color.
const COLORES_POR_AREA = {
  taller:   { bg:'bg-red-50',     border:'border-red-200',     header:'bg-red-50',     text:'text-red-700',     title:'text-red-800',     badge:'bg-red-100 text-red-700 border-red-200',       sub:'bg-white/70', tab:'bg-red-500' },
  limpieza: { bg:'bg-emerald-50', border:'border-emerald-200', header:'bg-emerald-50', text:'text-emerald-700', title:'text-emerald-800', badge:'bg-emerald-100 text-emerald-700 border-emerald-200', sub:'bg-white/70', tab:'bg-emerald-500' },
}
const COLORES_DEFAULT = [
  { bg:'bg-blue-50',   border:'border-blue-200',   header:'bg-blue-50',   text:'text-blue-700',   title:'text-blue-800',   badge:'bg-blue-100 text-blue-700 border-blue-200',     tab:'bg-blue-500' },
  { bg:'bg-violet-50', border:'border-violet-200', header:'bg-violet-50', text:'text-violet-700', title:'text-violet-800', badge:'bg-violet-100 text-violet-700 border-violet-200', tab:'bg-violet-500' },
  { bg:'bg-amber-50',  border:'border-amber-200',  header:'bg-amber-50',  text:'text-amber-700',  title:'text-amber-800',  badge:'bg-amber-100 text-amber-700 border-amber-200',   tab:'bg-amber-500' },
  { bg:'bg-teal-50',   border:'border-teal-200',   header:'bg-teal-50',   text:'text-teal-700',   title:'text-teal-800',   badge:'bg-teal-100 text-teal-700 border-teal-200',      tab:'bg-teal-500' },
  { bg:'bg-sky-50',    border:'border-sky-200',    header:'bg-sky-50',    text:'text-sky-700',    title:'text-sky-800',    badge:'bg-sky-100 text-sky-700 border-sky-200',         tab:'bg-sky-500' },
]

/** Color por nombre de área, con reserva por índice */
const colorDeArea = (nombre, idx) =>
  Object.entries(COLORES_POR_AREA).find(([k]) => nombre.toLowerCase().includes(k))?.[1]
  ?? COLORES_DEFAULT[idx % COLORES_DEFAULT.length]

/** Mismo criterio de búsqueda en la pestaña y en la tarjeta */
const filtrarPorBusqueda = (sustancias, busq) => {
  if (!busq) return sustancias
  const q = busq.toLowerCase()
  return sustancias.filter(s =>
    s.nombre.toLowerCase().includes(q) || s.nombre_quimico?.toLowerCase().includes(q))
}

// ── Tarjeta de área ─────────────────────────────────────────────────────────
function TarjetaArea({ areaData, onMovimiento, busq, colorIdx }) {
  const [abierto, setAbierto] = useState(true)

  const c = colorDeArea(areaData.area, colorIdx)
  const filtradas = filtrarPorBusqueda(areaData.sustancias, busq)

  if (filtradas.length === 0) return null

  // Totales del área
  const totalEntradas = filtradas.reduce((s, x) => s + (x.total_entradas || 0), 0)
  const totalSalidas  = filtradas.reduce((s, x) => s + (x.total_salidas  || 0), 0)
  const alertas       = filtradas.filter(x => x.alerta_stock).length

  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden shadow-sm`}>
      {/* Header área */}
      <button onClick={() => setAbierto(!abierto)}
        className={`w-full flex items-center gap-3 px-5 py-4 ${c.header} border-b ${c.border} hover:brightness-97 transition-all text-left`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${c.border}`}>
          <Package size={15} className={c.text}/>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-base ${c.title}`}>{areaData.area}</h3>
          <p className="text-gray-400 text-xs">{filtradas.length} producto{filtradas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {alertas > 0 && (
            <span className="text-[10px] bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-full font-bold">
              ⚠ {alertas} bajo mínimo
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>
            {filtradas.length} items
          </span>
          {abierto ? <ChevronDown size={15} className="text-gray-400"/> : <ChevronRight size={15} className="text-gray-400"/>}
        </div>
      </button>

      {/* Tabla */}
      {abierto && (
        <div className={`${c.bg}`}>
          {/* Sub-totales del área */}
          <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-gray-100 bg-white/60">
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium">Total ingresos</p>
              <p className="text-lg font-black text-emerald-600">
                +{totalEntradas.toFixed(totalEntradas % 1 === 0 ? 0 : 2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium">Total salidas</p>
              <p className="text-lg font-black text-red-500">
                -{totalSalidas.toFixed(totalSalidas % 1 === 0 ? 0 : 2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium">Productos</p>
              <p className="text-lg font-black text-gray-700">{filtradas.length}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr>
                  {['Producto','Pictogramas GHS','Nivel riesgo','Ingresos','Salidas','Saldo actual','Última mov.','Acciones'].map(h => (
                    <th key={h} className={`text-left px-4 py-2.5 text-[11px] font-semibold uppercase text-gray-500`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtradas.map(s => {
                  const riesgo = RIESGO_CFG[s.nivel_riesgo]
                  return (
                    <tr key={s.id} className={`hover:bg-white/70 transition-colors ${s.alerta_stock ? 'bg-red-50/60' : ''}`}>
                      {/* Producto */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{s.nombre}</p>
                        {s.nombre_quimico && <p className="text-xs text-gray-400 mt-0.5">{s.nombre_quimico}</p>}
                      </td>

                      {/* GHS */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-0.5">
                          {(s.pictogramas || []).map(g => (
                            <span key={g} title={g} className="text-base">{GHS_EMOJI[g]}</span>
                          ))}
                          {(!s.pictogramas || s.pictogramas.length === 0) && <span className="text-gray-300 text-xs">—</span>}
                        </div>
                      </td>

                      {/* Riesgo */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${riesgo?.cls || ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${riesgo?.dot}`}/>
                          {riesgo?.label || s.nivel_riesgo}
                        </span>
                      </td>

                      {/* Ingresos */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <TrendingUp size={12} className="text-emerald-500 flex-shrink-0"/>
                          <span className="font-bold text-emerald-600">
                            {s.total_entradas > 0
                              ? `+${s.total_entradas % 1 === 0 ? s.total_entradas : s.total_entradas.toFixed(2)}`
                              : <span className="text-gray-300 font-normal">—</span>}
                          </span>
                          <span className="text-xs text-gray-400">{s.unidad_medida}</span>
                        </div>
                      </td>

                      {/* Salidas */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <TrendingDown size={12} className="text-red-400 flex-shrink-0"/>
                          <span className="font-bold text-red-500">
                            {s.total_salidas > 0
                              ? `-${s.total_salidas % 1 === 0 ? s.total_salidas : s.total_salidas.toFixed(2)}`
                              : <span className="text-gray-300 font-normal">—</span>}
                          </span>
                          <span className="text-xs text-gray-400">{s.unidad_medida}</span>
                        </div>
                      </td>

                      {/* Saldo */}
                      <td className="px-4 py-3">
                        <StockBar
                          saldo={s.saldo}
                          minimo={s.stock_minimo}
                          maximo={s.stock_maximo}
                          unidad={s.unidad_medida}
                        />
                      </td>

                      {/* Última fecha */}
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {s.ultima_fecha
                          ? new Date(s.ultima_fecha).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })
                          : <span className="text-gray-200">Sin movimientos</span>}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <button onClick={() => onMovimiento(s.id, 'entrada')}
                            className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-medium transition-colors">
                            + Entrada
                          </button>
                          <button onClick={() => onMovimiento(s.id, 'salida')}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium transition-colors">
                            − Salida
                          </button>
                        </div>
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

// ── Página principal ────────────────────────────────────────────────────────
export default function SustanciaInventarioPage() {
  const navigate = useNavigate()
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [busq, setBusq]           = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState('')
  const [areaActiva, setAreaActiva] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      // El área ya no se filtra en el servidor: se traen todas y cada una
      // es una pestaña, así cambiar de pestaña no vuelve a pedir datos.
      const params = {}
      if (filtroRiesgo) params.nivel_riesgo = filtroRiesgo
      const { data: d } = await api.get('/sustancias/inventario-stock', { params })
      setData(d)
    } catch { } finally { setLoading(false) }
  }, [filtroRiesgo])

  useEffect(() => { cargar() }, [cargar])

  const areas = data?.por_area || []

  // Productos que coinciden con la búsqueda, por área: alimenta el contador
  // de cada pestaña para no tener que ir abriéndolas una por una.
  const coincidencias = Object.fromEntries(
    areas.map(a => [a.area, filtrarPorBusqueda(a.sustancias, busq).length])
  )

  // Al cargar (o si desaparece el área activa) se abre la primera pestaña.
  // Depende de `data`, no de `areas`, que es un array nuevo en cada render.
  useEffect(() => {
    const lista = data?.por_area || []
    if (lista.length === 0) { setAreaActiva(''); return }
    setAreaActiva(prev => lista.some(a => a.area === prev) ? prev : lista[0].area)
  }, [data])

  const areaVisible = areas.find(a => a.area === areaActiva)

  const onMovimiento = (id, tipo) => {
    navigate(`/sustancias/${id}/movimientos`)
  }

  const exportar = () => {
    if (!data) return
    const filas = []
    data.por_area.forEach(area => {
      area.sustancias.forEach(s => {
        filas.push({
          'Área':           area.area,
          'Producto':       s.nombre,
          'Nombre Químico': s.nombre_quimico || '',
          'Nivel Riesgo':   s.nivel_riesgo,
          'GHS':            (s.pictogramas || []).join(', '),
          'Ingresos':       s.total_entradas,
          'Salidas':        s.total_salidas,
          'Saldo actual':   s.saldo,
          'Stock mínimo':   s.stock_minimo || '',
          'Stock máximo':   s.stock_maximo || '',
          'Unidad':         s.unidad_medida,
          'Alerta stock':   s.alerta_stock ? 'SÍ' : 'NO',
          'Última mov.':    s.ultima_fecha || '',
        })
      })
    })
    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = Object.keys(filas[0] || {}).map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario Stock')
    XLSX.writeFile(wb, `inventario_stock_sustancias_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  // KPIs globales
  const totalSustancias = data?.total_sustancias || 0
  const totalBajoStock  = data?.total_bajo_stock  || 0
  const allSustancias   = (data?.por_area || []).flatMap(a => a.sustancias)
  const totalEntradas   = allSustancias.reduce((s, x) => s + (x.total_entradas || 0), 0)
  const totalSalidas    = allSustancias.reduce((s, x) => s + (x.total_salidas  || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/sustancias')} className="btn-back">
            <ArrowLeft size={14}/> Sustancias
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={22} className="text-purple-600"/> Inventario de Stock
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Ingresos · Salidas · Saldo por producto y área
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={cargar} className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm">
            <RotateCcw size={13}/> Actualizar
          </button>
          <button onClick={exportar} disabled={!data}
            className="flex items-center gap-2 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40">
            <Download size={14}/> Exportar Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total productos', val:totalSustancias, color:'text-purple-600', bg:'bg-purple-50', border:'border-purple-200', icon: Package },
          { label:'Total ingresos',  val:`+${totalEntradas.toFixed(totalEntradas % 1 === 0 ? 0 : 2)}`, color:'text-emerald-600', bg:'bg-emerald-50', border:'border-emerald-200', icon: TrendingUp },
          { label:'Total salidas',   val:`-${totalSalidas.toFixed(totalSalidas % 1 === 0 ? 0 : 2)}`,   color:'text-red-500',     bg:'bg-red-50',     border:'border-red-200',     icon: TrendingDown },
          { label:'Bajo stock mínimo', val:totalBajoStock, color: totalBajoStock > 0 ? 'text-amber-600' : 'text-gray-400', bg: totalBajoStock > 0 ? 'bg-amber-50' : 'bg-gray-50', border:'border-amber-200', icon: AlertTriangle },
        ].map(({ label, val, color, bg, border, icon: Icon }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-4 flex items-center gap-3 shadow-sm`}>
            <Icon size={20} className={`${color} flex-shrink-0`}/>
            <div>
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={busq} onChange={e => setBusq(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full border border-gray-300 text-sm rounded-lg pl-8 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500"/>
          {busq && <button onClick={() => setBusq('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13}/></button>}
        </div>

        {/* El área ya no se filtra aquí: cada una tiene su propia pestaña */}

        {/* Filtro riesgo */}
        <select value={filtroRiesgo} onChange={e => setFiltroRiesgo(e.target.value)}
          className="border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-roka-500">
          <option value="">Todos los riesgos</option>
          <option value="muy_alto">Muy alto</option>
          <option value="alto">Alto</option>
          <option value="medio">Medio</option>
          <option value="bajo">Bajo</option>
        </select>

        {(busq || filtroRiesgo) && (
          <button onClick={() => { setBusq(''); setFiltroRiesgo('') }}
            className="text-xs text-gray-500 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Una pestaña por área */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-roka-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : areas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Package size={40} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-500 font-medium">No se encontraron sustancias</p>
          <p className="text-xs text-gray-400 mt-1">Registra sustancias con área de uso asignada</p>
          <button onClick={() => navigate('/sustancias/nueva')}
            className="mt-4 flex items-center gap-2 bg-roka-500 text-white px-4 py-2 rounded-lg text-sm font-medium mx-auto">
            <Plus size={14}/> Nueva sustancia
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap border-b border-gray-200 pb-px">
            {areas.map((a, idx) => {
              const c        = colorDeArea(a.area, idx)
              const activa   = a.area === areaActiva
              const coincide = coincidencias[a.area] ?? 0
              // Al buscar, las áreas sin coincidencias se atenúan pero siguen accesibles
              const apagada  = busq && coincide === 0

              return (
                <button key={a.area} onClick={() => setAreaActiva(a.area)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium border border-b-0 -mb-px transition-colors ${
                    activa
                      ? `${c.bg} ${c.border} ${c.title}`
                      : `bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 ${apagada ? 'opacity-40' : ''}`
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${c.tab} ${apagada ? 'opacity-40' : ''}`}/>
                  {a.area}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${activa ? c.badge + ' border' : 'bg-gray-200 text-gray-600'}`}>
                    {coincide}
                  </span>
                </button>
              )
            })}
          </div>

          {areaVisible && coincidencias[areaVisible.area] > 0 ? (
            <TarjetaArea
              key={areaVisible.area}
              areaData={areaVisible}
              onMovimiento={onMovimiento}
              busq={busq}
              colorIdx={areas.findIndex(a => a.area === areaVisible.area)}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <Package size={36} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-gray-500 font-medium">
                Sin coincidencias en «{areaActiva}»
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {busq
                  ? 'Otras pestañas pueden tener resultados: el número junto a cada área lo indica.'
                  : 'Esta área no tiene productos registrados.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
