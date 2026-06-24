import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Trash2, Save, PackagePlus, Upload, Download, FileSpreadsheet, X } from 'lucide-react'
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
  const fileInputRef      = useRef(null)
  const [categorias, setCategorias] = useState([])
  const [filas, setFilas] = useState([filaVacia()])
  const [saving, setSaving] = useState(false)
  const [guardados, setGuardados] = useState(0)
  const [showImportModal, setShowImportModal] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [idsImportados, setIdsImportados] = useState([])

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

  // ── Importación desde Excel ───────────────────────────────────────
  const descargarPlantilla = async () => {
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      // ═══ HOJA 1: DATOS ═══════════════════════════════════════════
      const headers = ['CATEGORIA', 'NOMBRE', 'MARCA', 'MODELO', 'CODIGO_INTERNO',
                       'TALLA', 'UNIDAD', 'STOCK_TOTAL', 'STOCK_DISPONIBLE',
                       'STOCK_MINIMO', 'COSTO_UNITARIO', 'PROVEEDOR']

      // Ejemplos base por tipo de categoría
      const ejemplosBase = {
        'Arnes de seguridad':       ['Arnés de cuerpo completo', 'Miller', 'ML-PRO', 'M/L', 'unidad', '15', '15', '3', '280.00', 'Altura Segura'],
        'Botas de seguridad':       ['Botas de seguridad punta de acero', 'Caterpillar', 'CAT-500', '42', 'par', '30', '30', '5', '150.00', 'Safety Peru'],
        'Careta de soldadura':      ['Careta de soldar automática', 'Miller', 'Digital Elite', 'Única', 'unidad', '10', '10', '2', '320.00', 'Welding Supply'],
        'Casco de seguridad':       ['Casco de seguridad blanco', '3M', 'H-700', 'M', 'unidad', '50', '50', '10', '45.00', 'Safety Peru'],
        'Chaleco reflectivo':       ['Chaleco reflectivo naranja', 'Surtek', 'CH-100', 'L', 'unidad', '60', '60', '15', '18.00', 'Importadora SST'],
        'Guantes de cuero':         ['Guantes de cuero reforzado', 'Ansell', 'GX-100', 'L', 'par', '100', '100', '20', '12.50', 'Safety Peru'],
        'Guantes de nitrilo':       ['Guantes de nitrilo azul', 'Kimberly-Clark', 'KC-500', 'M', 'par', '200', '200', '40', '8.50', 'Importadora SST'],
        'Guantes anticorte':        ['Guantes anticorte nivel 5', 'Superior Glove', 'S18TAFNT', 'L', 'par', '80', '80', '15', '35.00', 'Safety Peru'],
        'Guantes badana':           ['Guantes badana premium', 'SafeHands', 'BD-200', 'M', 'par', '120', '120', '25', '15.00', 'Importadora SST'],
        'Lentes de seguridad':      ['Lentes de seguridad claros', 'Uvex', 'UV-200', '', 'unidad', '80', '80', '15', '8.50', 'Safety Peru'],
        'Línea de vida':            ['Línea de vida retráctil 3m', 'Miller', 'TurboLite', '', 'unidad', '8', '8', '2', '450.00', 'Altura Segura'],
        'Mascarilla N95':           ['Mascarilla N95 respirador', '3M', '8210', '', 'unidad', '500', '500', '100', '3.50', 'Importadora SST'],
        'Orejeras de protección':   ['Orejeras de protección 30dB', 'Peltor', '3M-X5A', '', 'unidad', '40', '40', '8', '65.00', 'Safety Peru'],
        'Respirador full face':     ['Respirador cara completa', '3M', '6800', 'M', 'unidad', '12', '12', '3', '380.00', 'Safety Peru'],
        'Ropa de trabajo':          ['Mameluco de drill azul', 'Workteam', 'WK-500', 'L', 'unidad', '35', '35', '8', '85.00', 'Confecciones Industriales'],
        'Tapones auditivos':        ['Tapones auditivos espuma', '3M', 'E-A-R Classic', '', 'par', '300', '300', '60', '0.80', 'Importadora SST'],
        'Traje Tyvek':              ['Traje Tyvek desechable', 'DuPont', 'TY125S', 'L', 'unidad', '25', '25', '5', '22.00', 'Safety Peru'],
        'Zapatos de seguridad':     ['Zapatos de seguridad punta de acero', 'Cat', 'CAT-P90803', '42', 'par', '20', '20', '4', '180.00', 'Safety Peru'],
        'Barbiquejo':               ['Barbiquejo para casco de seguridad', 'MSA', 'V-Gard', '', 'unidad', '100', '100', '20', '5.50', 'Safety Peru'],
        'Botas de jebe':            ['Botas de jebe impermeables', 'Berrendo', 'BJ-100', '42', 'par', '40', '40', '8', '45.00', 'Importadora SST'],
        'Poncho impermeable':       ['Poncho impermeable PVC', 'Redline', 'RL-PONCHO', 'L', 'unidad', '50', '50', '10', '28.00', 'Safety Peru'],
      }

      // Generar ejemplos dinámicamente basados en categorías existentes
      const ejemplos = categorias.map((cat, idx) => {
        const nombre = cat.nombre
        const ejemplo = ejemplosBase[nombre] || [
          `${nombre} estándar`,
          'Marca genérica',
          'MOD-' + (idx + 1).toString().padStart(3, '0'),
          cat.requiere_talla ? 'M' : '',
          'unidad',
          '50',
          '50',
          '10',
          '50.00',
          'Proveedor genérico'
        ]

        const codigo = nombre.split(' ').map(p => p[0]).join('').toUpperCase() + '-' + (idx + 1).toString().padStart(3, '0')

        return [nombre, ...ejemplo.slice(0, 2), codigo, ...ejemplo.slice(2)]
      })

      const wsDatos = XLSX.utils.aoa_to_sheet([headers, ...ejemplos])

      // Configurar ancho de columnas
      wsDatos['!cols'] = [
        { wch: 18 },  // CATEGORIA
        { wch: 35 },  // NOMBRE
        { wch: 15 },  // MARCA
        { wch: 15 },  // MODELO
        { wch: 18 },  // CODIGO_INTERNO
        { wch: 10 },  // TALLA
        { wch: 12 },  // UNIDAD
        { wch: 15 },  // STOCK_TOTAL
        { wch: 18 },  // STOCK_DISPONIBLE
        { wch: 15 },  // STOCK_MINIMO
        { wch: 16 },  // COSTO_UNITARIO
        { wch: 25 },  // PROVEEDOR
      ]

      XLSX.utils.book_append_sheet(wb, wsDatos, 'DATOS')

      // ═══ HOJA 2: INSTRUCCIONES ═══════════════════════════════════
      const instrucciones = [
        ['PLANTILLA DE IMPORTACIÓN - INVENTARIO INICIAL DE EPPs'],
        [''],
        ['INSTRUCCIONES DE USO:'],
        [''],
        ['1. Llena la hoja "DATOS" con la información de tus EPPs'],
        ['2. NO modifiques los encabezados de la primera fila (columnas)'],
        ['3. Elimina las filas de ejemplo antes de importar (o reemplázalas con tus datos)'],
        ['4. Guarda el archivo y súbelo desde el sistema'],
        [''],
        ['CAMPOS OBLIGATORIOS (marcados con *):'],
        [''],
        ['• CATEGORIA *          → Nombre de la categoría (debe existir previamente en el sistema)'],
        ['• NOMBRE *             → Nombre descriptivo del EPP'],
        ['• STOCK_TOTAL *        → Cantidad total de unidades'],
        [''],
        ['CAMPOS OPCIONALES:'],
        [''],
        ['• MARCA               → Marca del fabricante (ej: 3M, MSA, Ansell)'],
        ['• MODELO              → Modelo o referencia del producto'],
        ['• CODIGO_INTERNO      → Código de identificación interno de tu empresa'],
        ['• TALLA               → Talla si aplica (XS, S, M, L, XL, XXL, 38, 40, 42, etc.)'],
        ['• UNIDAD              → Unidad de medida (unidad, par, juego, caja, paquete, rollo)'],
        ['                        Si no se especifica, se usará "unidad"'],
        ['• STOCK_DISPONIBLE    → Stock disponible para entrega'],
        ['                        Si no se especifica, se usará el mismo valor de STOCK_TOTAL'],
        ['• STOCK_MINIMO        → Stock mínimo requerido para alertas'],
        ['• COSTO_UNITARIO      → Costo por unidad en soles (ej: 45.00)'],
        ['• PROVEEDOR           → Nombre del proveedor o distribuidor'],
        [''],
        ['CATEGORÍAS VÁLIDAS:'],
        [''],
        ['Las categorías deben existir previamente en el sistema.'],
        ['Verifica las categorías disponibles en: EPPs → Configuración'],
        [''],
        ['Ejemplos de categorías comunes:'],
        ['• Cascos, Guantes, Botas, Lentes, Respiradores, Arneses, Protectores auditivos, etc.'],
        [''],
        ['UNIDADES PERMITIDAS:'],
        [''],
        ['• unidad    → Para elementos individuales (cascos, lentes, respiradores)'],
        ['• par       → Para elementos que vienen en pares (guantes, botas)'],
        ['• juego     → Para conjuntos de elementos'],
        ['• caja      → Para cajas con múltiples unidades'],
        ['• paquete   → Para paquetes de elementos'],
        ['• rollo     → Para elementos enrollados (cinta, cable)'],
        [''],
        ['TALLAS COMUNES:'],
        [''],
        ['• Ropa/Guantes: XS, S, M, L, XL, XXL, XXXL'],
        ['• Calzado: 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46'],
        ['• Ajustable: Ajustable, Universal, Única'],
        [''],
        ['TIPS Y RECOMENDACIONES:'],
        [''],
        ['✓ Usa nombres descriptivos (ej: "Casco de seguridad blanco" en vez de solo "Casco")'],
        ['✓ Mantén consistencia en nombres de categorías (escríbelas exactamente igual)'],
        ['✓ Si un EPP no tiene talla, deja la celda vacía'],
        ['✓ Los costos deben usar punto como decimal (45.50 no 45,50)'],
        ['✓ Revisa que los stocks sean números positivos'],
        [''],
        ['ERRORES COMUNES:'],
        [''],
        ['✗ Escribir mal el nombre de la categoría → Verifica en el sistema antes de importar'],
        ['✗ Usar comas en decimales (45,50) → Usa punto (45.50)'],
        ['✗ Dejar vacíos los campos obligatorios → Completa CATEGORIA, NOMBRE y STOCK_TOTAL'],
        ['✗ Poner texto en campos numéricos → STOCK_TOTAL debe ser un número'],
        [''],
        ['SOPORTE:'],
        [''],
        ['Si tienes problemas con la importación:'],
        ['1. Verifica que las categorías existan en el sistema'],
        ['2. Revisa los mensajes de error específicos que muestra el sistema'],
        ['3. Corrige los errores en el archivo Excel y vuelve a intentar'],
        [''],
        ['Sistema SST ROKA - Gestión de EPPs'],
      ]

      const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
      wsInstrucciones['!cols'] = [{ wch: 85 }]
      XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'INSTRUCCIONES')

      // Guardar archivo
      XLSX.writeFile(wb, 'Plantilla_Inventario_EPPs.xlsx')
      toast.success('Plantilla descargada exitosamente')
    } catch (err) {
      toast.error('Error al descargar plantilla')
      console.error(err)
    }
  }

  const procesarExcel = async (file) => {
    setProcesando(true)
    setResultado(null)
    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })

      if (rows.length < 2) {
        toast.error('El archivo debe tener al menos 1 fila de datos')
        setProcesando(false)
        return
      }

      const registros = rows.slice(1)
        .filter(row => row.some(cell => cell !== undefined && cell !== ''))
        .map(row => ({
          categoria:        row[0],
          nombre:           row[1],
          marca:            row[2],
          modelo:           row[3],
          codigo_interno:   row[4],
          talla:            row[5],
          unidad:           row[6] || 'unidad',
          stock_total:      row[7],
          stock_disponible: row[8],
          stock_minimo:     row[9],
          costo_unitario:   row[10],
          proveedor:        row[11],
        }))

      // Enviar al backend
      const { data: result } = await api.post('/epps/importar', { registros })
      setResultado(result)

      if (result.ok > 0) {
        toast.success(`${result.ok} EPP${result.ok > 1 ? 's' : ''} importado${result.ok > 1 ? 's' : ''} correctamente`)
        setGuardados(prev => prev + result.ok)

        // Guardar IDs de EPPs importados
        if (result.ids_creados && result.ids_creados.length > 0) {
          setIdsImportados(prev => [...prev, ...result.ids_creados])
        }

        // Mostrar EPPs importados en la tabla
        if (result.epps_creados && result.epps_creados.length > 0) {
          // Convertir EPPs a formato de filas
          const nuevasFilas = result.epps_creados.map(epp => ({
            _id: Math.random(),
            categoria_id: epp.categoria_id,
            nombre: epp.nombre,
            marca: epp.marca || '',
            modelo: epp.modelo || '',
            codigo_interno: epp.codigo_interno || '',
            talla: epp.talla || '',
            unidad: epp.unidad || 'unidad',
            stock_total: epp.stock_total,
            stock_disponible: epp.stock_disponible,
            stock_minimo: epp.stock_minimo ?? '',
            costo_unitario: epp.costo_unitario ?? '',
            proveedor: epp.proveedor || '',
          }))

          // Agregar las nuevas filas al principio de la tabla
          setFilas(prev => [...nuevasFilas, ...prev])
        }
      }
      if (result.errores.length > 0) {
        toast.error(`${result.errores.length} error${result.errores.length > 1 ? 'es' : ''}`)
      }

      // Resetear el input para permitir cargar otro archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      toast.error('Error al procesar el archivo')
      console.error(err)

      // Resetear el input incluso si hay error
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setProcesando(false)
    }
  }

  const resetearImportacion = () => {
    setResultado(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const eliminarTodoImportado = async () => {
    if (idsImportados.length === 0) {
      toast.error('No hay EPPs importados para eliminar')
      return
    }

    if (!confirm(`¿Eliminar ${idsImportados.length} EPP${idsImportados.length > 1 ? 's' : ''} importado${idsImportados.length > 1 ? 's' : ''}?`)) {
      return
    }

    setProcesando(true)
    try {
      const { data } = await api.post('/epps/eliminar-multiple', { ids: idsImportados })
      toast.success(`${data.eliminados} EPP${data.eliminados > 1 ? 's' : ''} eliminado${data.eliminados > 1 ? 's' : ''} correctamente`)

      // Resetear todo
      setIdsImportados([])
      setGuardados(0)
      setResultado(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      toast.error('Error al eliminar EPPs')
      console.error(err)
    } finally {
      setProcesando(false)
    }
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
            className="btn-back">
            <ArrowLeft size={14} /> EPPs
          </button>
          <button onClick={() => navigate('/epps/inventario')}
            className="btn-back">
            Ver inventario completo →
          </button>
          <button onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Upload size={16} /> Importar Excel
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

      {/* ══ Modal de Importación ══════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="text-roka-600" />
                Importar EPPs desde Excel
              </h2>
              <button onClick={() => {
                setShowImportModal(false)
                setResultado(null)
              }}
                className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              {/* Paso 1: Descargar plantilla */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Paso 1: Descarga la plantilla</p>
                <button onClick={descargarPlantilla}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Download size={16} /> Descargar plantilla Excel
                </button>
              </div>

              {/* Paso 2: Llenar y subir */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Paso 2: Llena la plantilla y sube el archivo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => e.target.files[0] && procesarExcel(e.target.files[0])}
                  disabled={procesando}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-roka-50 file:text-roka-700 hover:file:bg-roka-100 disabled:opacity-50"
                />
                {procesando && (
                  <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-roka-600 border-t-transparent rounded-full animate-spin" />
                    Procesando archivo...
                  </div>
                )}
              </div>

              {/* Instrucciones */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-medium mb-2">📋 Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Descarga la plantilla y llénala con tus datos</li>
                  <li>Campos obligatorios: CATEGORIA, NOMBRE, STOCK_TOTAL</li>
                  <li>La categoría debe existir previamente en el sistema</li>
                  <li>Si no llenas STOCK_DISPONIBLE, se usará el valor de STOCK_TOTAL</li>
                </ul>
              </div>

              {/* Resultados */}
              {resultado && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="font-medium text-gray-900 mb-3">Resultado de la importación:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-green-600 font-medium">{resultado.ok} exitosos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-red-600 font-medium">{resultado.errores.length} errores</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-gray-600 font-medium">{resultado.total} total</span>
                      </div>
                    </div>

                    {resultado.errores.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Errores detectados:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {resultado.errores.map((err, idx) => (
                            <div key={idx} className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-100">
                              <span className="font-medium">Fila {err.fila}:</span> {err.error}
                              {err.nombre && <span className="ml-1 text-gray-600">({err.nombre})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botones de acción */}
                    <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2">
                      <button
                        onClick={resetearImportacion}
                        className="flex items-center gap-2 bg-roka-500 hover:bg-roka-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center"
                      >
                        <Upload size={16} /> Importar otro archivo
                      </button>
                      {idsImportados.length > 0 && (
                        <button
                          onClick={eliminarTodoImportado}
                          disabled={procesando}
                          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={16} /> Eliminar todo ({idsImportados.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => {
                setShowImportModal(false)
                setResultado(null)
              }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
