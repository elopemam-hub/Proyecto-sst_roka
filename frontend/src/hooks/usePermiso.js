/**
 * usePermiso — hook para verificar permisos de módulo en el frontend
 *
 * Uso:
 *   const puedoVer    = usePermiso('sustancias')           // por defecto verifica 'ver'
 *   const puedoCrear  = usePermiso('sustancias', 'crear')
 *   const puedoEditar = usePermiso('inspecciones', 'editar')
 *
 * Acciones disponibles: ver | crear | editar | eliminar | aprobar | exportar
 */
import { useSelector } from 'react-redux'

export function usePermiso(modulo, accion = 'ver') {
  const user = useSelector(s => s.auth.user)

  if (!user) return false

  // Administrador tiene acceso total
  if (user.rol === 'administrador') return true

  const permisos = user.permisos_modulos || {}
  return permisos[modulo]?.[`puede_${accion}`] ?? false
}

/**
 * usePermisoModulo — devuelve el objeto completo de permisos de un módulo
 *
 * Uso:
 *   const p = usePermisoModulo('sustancias')
 *   if (p.crear) ...
 *   if (p.eliminar) ...
 */
export function usePermisoModulo(modulo) {
  const user = useSelector(s => s.auth.user)

  if (!user) return { ver:false, crear:false, editar:false, eliminar:false, aprobar:false, exportar:false }

  // Admin = todo true
  if (user.rol === 'administrador') {
    return { ver:true, crear:true, editar:true, eliminar:true, aprobar:true, exportar:true }
  }

  const p = user.permisos_modulos?.[modulo] || {}
  return {
    ver:      !!p.puede_ver,
    crear:    !!p.puede_crear,
    editar:   !!p.puede_editar,
    eliminar: !!p.puede_eliminar,
    aprobar:  !!p.puede_aprobar,
    exportar: !!p.puede_exportar,
  }
}

export default usePermiso
