import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Trash2, Save, PackagePlus } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const UNIDADES = ['unidad', 'par', 'juego', 'caja', 'paquete', 'rollo']

const filaVacia = () => ({
  _id:            Math.random(),
  categoria_id:   '',
  nombre:         '',
  marca:          '',
  codigo_interno: '',
  talla:          '',
  unidad:         'unidad',
  stock_total:    '',
  stock_disponible: '',
  stock_minimo:   '',
  costo_unitario: '',
  proveedor:      '',
})

export default function EppInventarioInicialPage() {
  const navigate          = useNavigate()
  const [categorias, setCategorias] = useState([])
  const [filas, setFilas] = useState([filaVacia()])
  const [saving, setSaving] = useState(false)
  const [guardados, setGuardados] = useState(0)

  useEffect(() => {
    api.get('/epps/categorias')
      .then(({ data }) => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const setFila = (id, campo, valor) =>
    setFilas(prev => prev.map(f => f._id === id ? { ...f, [campo]: valor } : f))

  const agregarFila = () => setFilas(prev => [...prev, filaVacia()])

  const eliminarFila = (id) => {
    if (filas.length === 1) return
    setFilas(prev => prev.filter(f => f._id !== id))
  }

  const guardar = async () => {
    const validas = filas.filter(f => f.nombre.trim() && f.categoria_id && f.stock_total !== '')
    if (validas.length === 0) {
      toast.error('Completa al menos una fila con nombre, categoría y stock')
      return
    }
    setSaving(true)
    let ok = 0, errores = 0
    for (const fila of validas) {
      try {
        await api.post('/epps', {
          categoria_id:     fila.categoria_id,
          nombre:           fila.nombre.trim(),
          marca:            fila.marca || null,
          codigo_interno:   fila.codigo_interno || null,
          talla:            fila.talla || null,
          unidad:           fila.unidad || 'unidad',
          stock_total:      parseInt(fila.stock_total) || 0,
          stock_disponible: parseInt(fila.stock_disponible || fila.stock_total) || 0,
          stock_minimo:     parseInt(fila.stock_minimo) || 0,
          costo_unitario:   fila.costo_unitario ? parseFloat(fila.costo_unitario) : null,
          proveedor:        fila.proveedor || null,
        })
        ok++
      } catch { errores++ }
    }
    setSaving(false)
    setGuardados(prev => prev + ok)
    if (ok > 0)     toast.success(`${ok} EPP${ok > 1 ? 's' : ''} registrado${ok > 1 ? 's' : ''} correctamente`)
    if (errores > 0) toast.error(`${errores} fila${errores > 1 ? 's' : ''} con error`)
    if (ok > 0) setFilas([filaVacia()])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario Inicial</h1>
          <p className="text-gray-500 text-sm mt-1">Registro masivo de EPPs · ingresa varios a la vez</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/epps')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft size={14} /> EPPs
          </button>
          <button onClick={() => navigate('/epps/inventario')}
            className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Ver inventario completo →
          </button>
          <button onClick={guardar} disabled={saving}
            className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar todo'}
          </button>
        </div>
      </div>

      {guardados > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
          ✓ {guardados} EPP{guardados > 1 ? 's' : ''} registrado{guardados > 1 ? 's' : ''} en total en esta sesión
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
        Completa las filas con los EPPs a registrar. Los campos <strong>Nombre</strong>, <strong>Categoría</strong> y <strong>Stock Total</strong> son obligatorios.
        Si no indicas <em>Stock Disponible</em>, se tomará igual al Stock Total.
      </div>

      {/* Tabla de filas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Categoría *', 'Nombre *', 'Marca', 'Código', 'Talla', 'Unidad', 'Stock Total *', 'Stock Disp.', 'Stock Mín.', 'Costo unit.', 'Proveedor', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((fila, idx) => (
              <tr key={fila._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                {/* Categoría */}
                <td className="px-2 py-2">
                  <select value={fila.categoria_id} onChange={e => setFila(fila._id, 'categoria_id', e.target.value)}
                    className="w-36 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500">
                    <option value="">— Seleccionar —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </td>
                {/* Nombre */}
                <td className="px-2 py-2">
                  <input value={fila.nombre} onChange={e => setFila(fila._id, 'nombre', e.target.value)}
                    placeholder="Ej: Casco de seguridad"
                    className="w-44 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </td>
                {/* Marca */}
                <td className="px-2 py-2">
                  <input value={fila.marca} onChange={e => setFila(fila._id, 'marca', e.target.value)}
                    placeholder="3M, MSA..."
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </td>
                {/* Código */}
                <td className="px-2 py-2">
                  <input value={fila.codigo_interno} onChange={e => setFila(fila._id, 'codigo_interno', e.target.value)}
                    placeholder="EPP-001"
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </td>
                {/* Talla */}
                <td className="px-2 py-2">
                  <input value={fila.talla} onChange={e => setFila(fila._id, 'talla', e.target.value)}
                    placeholder="S/M/L/XL"
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </td>
                {/* Unidad */}
                <td className="px-2 py-2">
                  <select value={fila.unidad} onChange={e => setFila(fila._id, 'unidad', e.target.value)}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500">
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                {/* Stock total */}
                <td className="px-2 py-2">
                  <input type="number" min="0" value={fila.stock_total} onChange={e => setFila(fila._id, 'stock_total', e.target.value)}
                    placeholder="0"
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500 text-center" />
                </td>
                {/* Stock disponible */}
                <td className="px-2 py-2">
                  <input type="number" min="0" value={fila.stock_disponible} onChange={e => setFila(fila._id, 'stock_disponible', e.target.value)}
                    placeholder="= Total"
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500 text-center" />
                </td>
                {/* Stock mínimo */}
                <td className="px-2 py-2">
                  <input type="number" min="0" value={fila.stock_minimo} onChange={e => setFila(fila._id, 'stock_minimo', e.target.value)}
                    placeholder="0"
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500 text-center" />
                </td>
                {/* Costo */}
                <td className="px-2 py-2">
                  <input type="number" min="0" step="0.01" value={fila.costo_unitario} onChange={e => setFila(fila._id, 'costo_unitario', e.target.value)}
                    placeholder="0.00"
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500 text-right" />
                </td>
                {/* Proveedor */}
                <td className="px-2 py-2">
                  <input value={fila.proveedor} onChange={e => setFila(fila._id, 'proveedor', e.target.value)}
                    placeholder="Nombre proveedor"
                    className="w-32 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-roka-500" />
                </td>
                {/* Eliminar */}
                <td className="px-2 py-2">
                  <button onClick={() => eliminarFila(fila._id)} disabled={filas.length === 1}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-20">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Botón añadir fila */}
        <div className="border-t border-gray-100 p-3">
          <button onClick={agregarFila}
            className="flex items-center gap-1.5 text-sm text-roka-600 hover:text-roka-700 font-medium transition-colors">
            <Plus size={16} /> Añadir fila
          </button>
        </div>
      </div>

      {/* Botón guardar bottom */}
      <div className="flex justify-end gap-3 pb-4">
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
          <PackagePlus size={16} /> {saving ? 'Guardando...' : `Guardar ${filas.filter(f => f.nombre.trim() && f.categoria_id).length} EPP${filas.filter(f => f.nombre.trim() && f.categoria_id).length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
