export const ROLES_CONFIG = {
  administrador: {
    label: 'Administrador',
    descripcion: 'Acceso completo al sistema. Gestiona usuarios, configuración y todos los módulos.',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    modulos: ['*'],
  },
  supervisor_sst: {
    label: 'Supervisor SST',
    descripcion: 'Supervisa todas las actividades de seguridad. Accede a reportes y gestión operativa.',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    modulos: ['dashboard', 'inspecciones', 'iperc', 'ats', 'accidentes', 'capacitaciones', 'opl', 'epps', 'salud', 'seguimiento', 'reportes', 'formatos', 'documentos', 'personal', 'simulacros', 'auditorias', 'vehiculos', 'equipos', 'programa', 'firmas'],
  },
  tecnico_sst: {
    label: 'Técnico SST',
    descripcion: 'Ejecuta actividades operativas de seguridad. Sin acceso a reportes ni configuración.',
    color: 'bg-roka-50 text-roka-700 border-roka-200',
    dot: 'bg-roka-500',
    modulos: ['dashboard', 'inspecciones', 'iperc', 'ats', 'accidentes', 'capacitaciones', 'opl', 'epps', 'salud', 'seguimiento', 'formatos', 'documentos', 'personal', 'simulacros', 'auditorias', 'vehiculos', 'equipos', 'programa', 'firmas'],
  },
  operativo: {
    label: 'Operativo',
    descripcion: 'Trabajador de campo. Puede ver y registrar inspecciones, ATS y EPPs asignados.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    modulos: ['dashboard', 'inspecciones', 'ats', 'epps', 'firmas'],
  },
  trabajador_tercero: {
    label: 'Trabajador Tercero',
    descripcion: 'Personal de empresas contratistas. Puede realizar inspecciones diarias y mensuales.',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
    modulos: ['dashboard', 'inspecciones', 'firmas'],
  },
  vigilante: {
    label: 'Vigilante',
    descripcion: 'Solo puede visualizar inspecciones. Sin capacidad de crear ni modificar registros.',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    modulos: ['dashboard', 'inspecciones'],
  },
  solo_lectura: {
    label: 'Solo lectura',
    descripcion: 'Acceso únicamente al dashboard. No puede interactuar con ningún módulo operativo.',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
    modulos: ['dashboard'],
  },
}

// Mapeo de rutas frontend → clave de módulo
const RUTA_MODULO = {
  '/dashboard':             'dashboard',
  '/iperc':                 'iperc',
  '/ats':                   'ats',
  '/inspecciones':          'inspecciones',
  '/accidentes':            'accidentes',
  '/seguimiento':           'seguimiento',
  '/personal':              'personal',
  '/epps':                  'epps',
  '/salud':                 'salud',
  '/capacitaciones':        'capacitaciones',
  '/opl':                   'opl',
  '/simulacros':            'simulacros',
  '/auditorias':            'auditorias',
  '/formatos':              'formatos',
  '/documentos':            'documentos',
  '/reportes':              'reportes',
  '/vehiculos':             'vehiculos',
  '/equipos':               'equipos',
  '/programa':              'programa',
  '/firmas':                'firmas',
  '/notificaciones':        'dashboard',   // todos pueden ver notificaciones
  '/auditoria':             'dashboard',   // log de auditoría — todos
  '/configuracion/empresa': 'configuracion',
  '/configuracion/areas':   'configuracion',
  '/configuracion/usuarios':'configuracion',
  '/sin-acceso':            '*',           // siempre accesible
}

/**
 * Devuelve true si el rol tiene acceso al módulo indicado.
 * @param {string} rol
 * @param {string} modulo  — clave del módulo (no ruta)
 */
export function tieneAcceso(rol, modulo) {
  if (!rol) return false
  const cfg = ROLES_CONFIG[rol]
  if (!cfg) return false
  if (cfg.modulos.includes('*')) return true
  return cfg.modulos.includes(modulo)
}

/**
 * Devuelve true si el rol tiene acceso a la ruta frontend indicada.
 * @param {string} rol
 * @param {string} ruta  — e.g. '/inspecciones'
 */
export function tieneAccesoRuta(rol, ruta) {
  const modulo = RUTA_MODULO[ruta]
  if (!modulo) return true          // rutas no mapeadas → permitidas por defecto
  if (modulo === '*') return true   // rutas explícitamente públicas
  return tieneAcceso(rol, modulo)
}
