/**
 * CanDo — componente de guarda de permisos
 *
 * Renderiza children SOLO si el usuario tiene el permiso indicado.
 * Si no tiene permiso, renderiza `fallback` (por defecto null).
 *
 * Uso:
 *   <CanDo modulo="sustancias" accion="crear">
 *     <button>Nueva sustancia</button>
 *   </CanDo>
 *
 *   <CanDo modulo="usuarios" accion="eliminar" fallback={<span>Sin permiso</span>}>
 *     <button>Eliminar usuario</button>
 *   </CanDo>
 */
import { usePermiso } from '../hooks/usePermiso'

export default function CanDo({ modulo, accion = 'ver', fallback = null, children }) {
  const puede = usePermiso(modulo, accion)
  return puede ? children : fallback
}
