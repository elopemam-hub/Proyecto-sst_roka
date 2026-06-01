<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IpercBanco;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class IpercBancoController extends Controller
{
    /**
     * GET /api/iperc-banco — Listar ítems del banco
     */
    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = IpercBanco::where('empresa_id', $empresaId);

        if ($request->filled('tipo'))      $query->where('tipo', $request->tipo);
        if ($request->filled('categoria')) $query->where('categoria', $request->categoria);
        if ($request->filled('activo'))    $query->where('activo', $request->boolean('activo'));
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sq) =>
                $sq->where('nombre', 'like', "%{$q}%")
                   ->orWhere('descripcion', 'like', "%{$q}%")
                   ->orWhere('codigo', 'like', "%{$q}%")
            );
        }

        $per = min($request->get('per_page', 50), 200);

        if ($request->boolean('all')) {
            return response()->json($query->orderBy('nombre')->get());
        }

        return response()->json($query->orderBy('tipo')->orderBy('nombre')->paginate($per));
    }

    /**
     * POST /api/iperc-banco
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo'              => ['required', Rule::in(array_keys(IpercBanco::TIPOS))],
            'codigo'            => 'nullable|string|max:50',
            'nombre'            => 'required|string|max:255',
            'descripcion'       => 'nullable|string',
            'categoria'         => 'nullable|string|max:100',
            'subcategoria'      => 'nullable|string|max:100',
            'area_aplicacion'   => 'nullable|string|max:255',
            'norma_referencia'  => 'nullable|string|max:255',
            'tipo_control'      => ['nullable', Rule::in(IpercBanco::TIPOS_CONTROL)],
            'costo_referencial' => 'nullable|numeric|min:0',
            'duracion_horas'    => 'nullable|integer|min:1',
            'modalidad'         => 'nullable|string|max:50',
            'nivel_cargo'       => 'nullable|string|max:50',
            'activo'            => 'boolean',
        ]);

        $item = IpercBanco::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
        ]);

        return response()->json($item, 201);
    }

    /**
     * GET /api/iperc-banco/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $item = IpercBanco::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        return response()->json($item);
    }

    /**
     * PUT /api/iperc-banco/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $item = IpercBanco::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'tipo'              => ['sometimes', Rule::in(array_keys(IpercBanco::TIPOS))],
            'codigo'            => 'nullable|string|max:50',
            'nombre'            => 'sometimes|string|max:255',
            'descripcion'       => 'nullable|string',
            'categoria'         => 'nullable|string|max:100',
            'subcategoria'      => 'nullable|string|max:100',
            'area_aplicacion'   => 'nullable|string|max:255',
            'norma_referencia'  => 'nullable|string|max:255',
            'tipo_control'      => ['nullable', Rule::in(IpercBanco::TIPOS_CONTROL)],
            'costo_referencial' => 'nullable|numeric|min:0',
            'duracion_horas'    => 'nullable|integer|min:1',
            'modalidad'         => 'nullable|string|max:50',
            'nivel_cargo'       => 'nullable|string|max:50',
            'activo'            => 'boolean',
        ]);

        $item->update($validated);
        return response()->json($item);
    }

    /**
     * DELETE /api/iperc-banco/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $item = IpercBanco::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $item->delete();
        return response()->json(['message' => 'Eliminado del banco.']);
    }

    /**
     * PATCH /api/iperc-banco/{id}/toggle — Activar/desactivar
     */
    public function toggle(Request $request, int $id): JsonResponse
    {
        $item = IpercBanco::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $item->update(['activo' => !$item->activo]);
        return response()->json(['activo' => $item->activo]);
    }

    /**
     * POST /api/iperc-banco/importar-predefinidos — Cargar catálogo base
     */
    public function importarPredefinidos(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $tipo      = $request->input('tipo');

        $predefinidos = $this->getPredefinidos($tipo);
        $creados = 0;

        foreach ($predefinidos as $item) {
            $existe = IpercBanco::where('empresa_id', $empresaId)
                ->where('tipo', $item['tipo'])
                ->where('nombre', $item['nombre'])
                ->exists();

            if (!$existe) {
                IpercBanco::create([...$item, 'empresa_id' => $empresaId]);
                $creados++;
            }
        }

        return response()->json(['message' => "{$creados} ítem(s) importados al banco.", 'creados' => $creados]);
    }

    private function getPredefinidos(?string $tipo = null): array
    {
        $todos = [
            // ─── ACTIVIDADES ──────────────────────────────────────────────
            ['tipo' => 'actividad', 'nombre' => 'Carga y descarga manual',         'categoria' => 'logistica',   'norma_referencia' => 'DS 005-2012-TR Art. 56'],
            ['tipo' => 'actividad', 'nombre' => 'Operación de maquinaria pesada',   'categoria' => 'produccion',  'norma_referencia' => 'DS 005-2012-TR'],
            ['tipo' => 'actividad', 'nombre' => 'Trabajos en altura',               'categoria' => 'construccion','norma_referencia' => 'G.050'],
            ['tipo' => 'actividad', 'nombre' => 'Trabajos en espacios confinados',  'categoria' => 'mantenimiento'],
            ['tipo' => 'actividad', 'nombre' => 'Manejo de sustancias químicas',    'categoria' => 'laboratorio'],
            ['tipo' => 'actividad', 'nombre' => 'Conducción de vehículos',          'categoria' => 'transporte'],
            ['tipo' => 'actividad', 'nombre' => 'Trabajos eléctricos',              'categoria' => 'mantenimiento'],
            ['tipo' => 'actividad', 'nombre' => 'Limpieza y orden de área',         'categoria' => 'general'],
            ['tipo' => 'actividad', 'nombre' => 'Trabajo en oficina con pantallas', 'categoria' => 'administrativo'],
            ['tipo' => 'actividad', 'nombre' => 'Soldadura y corte',                'categoria' => 'produccion'],
            ['tipo' => 'actividad', 'nombre' => 'Pintura con pistola',              'categoria' => 'produccion'],
            ['tipo' => 'actividad', 'nombre' => 'Uso de herramientas manuales',     'categoria' => 'mantenimiento'],

            // ─── TAREAS ───────────────────────────────────────────────────
            ['tipo' => 'tarea', 'nombre' => 'Levantar y transportar cargas > 25 kg',  'categoria' => 'ergonomica'],
            ['tipo' => 'tarea', 'nombre' => 'Operar montacargas o carretilla',         'categoria' => 'mecanica'],
            ['tipo' => 'tarea', 'nombre' => 'Subir y bajar escaleras con materiales',  'categoria' => 'locativa'],
            ['tipo' => 'tarea', 'nombre' => 'Conectar y desconectar equipos eléctricos','categoria' => 'electrica'],
            ['tipo' => 'tarea', 'nombre' => 'Mezclar o trasvasar productos químicos',  'categoria' => 'quimica'],
            ['tipo' => 'tarea', 'nombre' => 'Soldar en posición vertical',             'categoria' => 'mecanica'],
            ['tipo' => 'tarea', 'nombre' => 'Trabajar en plataformas elevadas',        'categoria' => 'locativa'],
            ['tipo' => 'tarea', 'nombre' => 'Inspeccionar equipo antes de uso',        'categoria' => 'seguridad'],
            ['tipo' => 'tarea', 'nombre' => 'Aplicar productos fitosanitarios',        'categoria' => 'quimica'],
            ['tipo' => 'tarea', 'nombre' => 'Digitar por períodos prolongados',        'categoria' => 'ergonomica'],
            ['tipo' => 'tarea', 'nombre' => 'Conducir en condiciones nocturnas',       'categoria' => 'transporte'],
            ['tipo' => 'tarea', 'nombre' => 'Manipular residuos sólidos peligrosos',   'categoria' => 'ambiental'],

            // ─── PUESTOS DE TRABAJO ───────────────────────────────────────
            ['tipo' => 'puesto', 'nombre' => 'Operario de almacén',         'nivel_cargo' => 'operativo'],
            ['tipo' => 'puesto', 'nombre' => 'Conductor de vehículo pesado','nivel_cargo' => 'operativo'],
            ['tipo' => 'puesto', 'nombre' => 'Técnico de mantenimiento',    'nivel_cargo' => 'tecnico'],
            ['tipo' => 'puesto', 'nombre' => 'Electricista industrial',     'nivel_cargo' => 'tecnico'],
            ['tipo' => 'puesto', 'nombre' => 'Soldador',                    'nivel_cargo' => 'tecnico'],
            ['tipo' => 'puesto', 'nombre' => 'Operario de producción',      'nivel_cargo' => 'operativo'],
            ['tipo' => 'puesto', 'nombre' => 'Supervisor de seguridad',     'nivel_cargo' => 'supervisor'],
            ['tipo' => 'puesto', 'nombre' => 'Jefe de planta',              'nivel_cargo' => 'jefatura'],
            ['tipo' => 'puesto', 'nombre' => 'Analista administrativo',     'nivel_cargo' => 'tecnico'],
            ['tipo' => 'puesto', 'nombre' => 'Guardia de seguridad',        'nivel_cargo' => 'operativo'],
            ['tipo' => 'puesto', 'nombre' => 'Operario de limpieza',        'nivel_cargo' => 'operativo'],
            ['tipo' => 'puesto', 'nombre' => 'Responsable SST',             'nivel_cargo' => 'supervisor'],

            // ─── SITUACIONES ──────────────────────────────────────────────
            ['tipo' => 'situacion', 'nombre' => 'Trabajo en condiciones de lluvia',    'categoria' => 'ambiental'],
            ['tipo' => 'situacion', 'nombre' => 'Área con alto tránsito de vehículos', 'categoria' => 'transito'],
            ['tipo' => 'situacion', 'nombre' => 'Trabajo nocturno o en turno rotativo','categoria' => 'organizacional'],
            ['tipo' => 'situacion', 'nombre' => 'Trabajo bajo presión de tiempo',      'categoria' => 'psicosocial'],
            ['tipo' => 'situacion', 'nombre' => 'Exposición a temperaturas extremas',  'categoria' => 'ambiental'],
            ['tipo' => 'situacion', 'nombre' => 'Zona con poca iluminación',           'categoria' => 'locativa'],
            ['tipo' => 'situacion', 'nombre' => 'Trabajo en solitario (solo worker)',  'categoria' => 'organizacional'],
            ['tipo' => 'situacion', 'nombre' => 'Operación con maquinaria nueva o desconocida','categoria' => 'mecanica'],
            ['tipo' => 'situacion', 'nombre' => 'Período de alta demanda productiva',  'categoria' => 'organizacional'],
            ['tipo' => 'situacion', 'nombre' => 'Post-mantenimiento o reparación',     'categoria' => 'mecanica'],

            // ─── PELIGROS ─────────────────────────────────────────────────
            ['tipo' => 'peligro', 'nombre' => 'Ruido excesivo (>85 dB)',              'categoria' => 'fisico'],
            ['tipo' => 'peligro', 'nombre' => 'Vibración de maquinaria y herramientas','categoria' => 'fisico'],
            ['tipo' => 'peligro', 'nombre' => 'Temperatura elevada (ambiente caluroso)','categoria' => 'fisico'],
            ['tipo' => 'peligro', 'nombre' => 'Iluminación deficiente o excesiva',    'categoria' => 'fisico'],
            ['tipo' => 'peligro', 'nombre' => 'Radiación UV solar',                   'categoria' => 'fisico'],
            ['tipo' => 'peligro', 'nombre' => 'Gases tóxicos o asfixiantes',          'categoria' => 'quimico'],
            ['tipo' => 'peligro', 'nombre' => 'Vapores de solventes orgánicos',       'categoria' => 'quimico'],
            ['tipo' => 'peligro', 'nombre' => 'Polvo de sílice libre cristalina',     'categoria' => 'quimico'],
            ['tipo' => 'peligro', 'nombre' => 'Ácidos y bases corrosivas',            'categoria' => 'quimico'],
            ['tipo' => 'peligro', 'nombre' => 'Virus y bacterias patógenas',          'categoria' => 'biologico'],
            ['tipo' => 'peligro', 'nombre' => 'Posturas forzadas prolongadas',        'categoria' => 'ergonomico'],
            ['tipo' => 'peligro', 'nombre' => 'Levantamiento manual de cargas >25 kg','categoria' => 'ergonomico'],
            ['tipo' => 'peligro', 'nombre' => 'Movimientos repetitivos de extremidades','categoria' => 'ergonomico'],
            ['tipo' => 'peligro', 'nombre' => 'Carga de trabajo excesiva o estrés',   'categoria' => 'psicosocial'],
            ['tipo' => 'peligro', 'nombre' => 'Atrapamiento en partes móviles',       'categoria' => 'mecanico'],
            ['tipo' => 'peligro', 'nombre' => 'Proyección de partículas o fragmentos','categoria' => 'mecanico'],
            ['tipo' => 'peligro', 'nombre' => 'Vehículos y montacargas en movimiento','categoria' => 'mecanico'],
            ['tipo' => 'peligro', 'nombre' => 'Contacto eléctrico directo o indirecto','categoria' => 'electrico'],
            ['tipo' => 'peligro', 'nombre' => 'Pisos resbaladizos o irregulares',     'categoria' => 'locativo'],
            ['tipo' => 'peligro', 'nombre' => 'Trabajo en altura > 1.80 m',           'categoria' => 'locativo'],
            ['tipo' => 'peligro', 'nombre' => 'Caída de objetos desde altura',        'categoria' => 'locativo'],
            ['tipo' => 'peligro', 'nombre' => 'Incendio por materiales inflamables',  'categoria' => 'locativo'],
            ['tipo' => 'peligro', 'nombre' => 'Sismo o movimiento sísmico',           'categoria' => 'fenomeno_natural'],

            // ─── RIESGOS ──────────────────────────────────────────────────
            ['tipo' => 'riesgo', 'nombre' => 'Pérdida auditiva inducida por ruido (PAIR)', 'categoria' => 'salud'],
            ['tipo' => 'riesgo', 'nombre' => 'Trastorno musculoesquelético (TME)',          'categoria' => 'salud'],
            ['tipo' => 'riesgo', 'nombre' => 'Golpe de calor o deshidratación',             'categoria' => 'salud'],
            ['tipo' => 'riesgo', 'nombre' => 'Intoxicación aguda o crónica',                'categoria' => 'salud'],
            ['tipo' => 'riesgo', 'nombre' => 'Silicosis u neumoconiosis',                   'categoria' => 'salud'],
            ['tipo' => 'riesgo', 'nombre' => 'Quemadura química o térmica',                 'categoria' => 'lesion'],
            ['tipo' => 'riesgo', 'nombre' => 'Electrocución o descarga eléctrica',          'categoria' => 'lesion'],
            ['tipo' => 'riesgo', 'nombre' => 'Caída al mismo nivel',                        'categoria' => 'lesion'],
            ['tipo' => 'riesgo', 'nombre' => 'Caída de distinto nivel',                     'categoria' => 'lesion'],
            ['tipo' => 'riesgo', 'nombre' => 'Aplastamiento o atrapamiento',                'categoria' => 'lesion'],
            ['tipo' => 'riesgo', 'nombre' => 'Corte o laceración',                          'categoria' => 'lesion'],
            ['tipo' => 'riesgo', 'nombre' => 'Golpe o contusión',                           'categoria' => 'lesion'],
            ['tipo' => 'riesgo', 'nombre' => 'Atropello por vehículo',                      'categoria' => 'lesion'],
            ['tipo' => 'riesgo', 'nombre' => 'Estrés laboral o burnout',                    'categoria' => 'psicosocial'],
            ['tipo' => 'riesgo', 'nombre' => 'Incendio o explosión',                        'categoria' => 'catastrofico'],
            ['tipo' => 'riesgo', 'nombre' => 'Muerte o invalidez permanente',               'categoria' => 'catastrofico'],

            // ─── CONSECUENCIAS ────────────────────────────────────────────
            ['tipo' => 'consecuencia', 'nombre' => 'Lesión leve (primeros auxilios)',       'categoria' => 'is_1', 'descripcion' => 'Lesión que no requiere descanso médico'],
            ['tipo' => 'consecuencia', 'nombre' => 'Incapacidad temporal',                  'categoria' => 'is_2', 'descripcion' => 'Lesión que requiere descanso médico <30 días'],
            ['tipo' => 'consecuencia', 'nombre' => 'Incapacidad parcial permanente',        'categoria' => 'is_3', 'descripcion' => 'Lesión con secuelas permanentes parciales'],
            ['tipo' => 'consecuencia', 'nombre' => 'Invalidez total o fatalidad',           'categoria' => 'is_4', 'descripcion' => 'Muerte o invalidez total permanente'],
            ['tipo' => 'consecuencia', 'nombre' => 'Daños materiales menores (<S/ 1,000)',  'categoria' => 'material'],
            ['tipo' => 'consecuencia', 'nombre' => 'Daños materiales mayores (>S/ 10,000)', 'categoria' => 'material'],
            ['tipo' => 'consecuencia', 'nombre' => 'Enfermedad profesional leve',           'categoria' => 'salud'],
            ['tipo' => 'consecuencia', 'nombre' => 'Enfermedad profesional grave (crónica)','categoria' => 'salud'],
            ['tipo' => 'consecuencia', 'nombre' => 'Interrupción de operaciones',           'categoria' => 'operacional'],
            ['tipo' => 'consecuencia', 'nombre' => 'Multa o sanción SUNAFIL',              'categoria' => 'legal'],
            ['tipo' => 'consecuencia', 'nombre' => 'Daño reputacional y denuncia mediática','categoria' => 'reputacional'],

            // ─── CAPACITACIONES ───────────────────────────────────────────
            ['tipo' => 'capacitacion', 'nombre' => 'Inducción de seguridad y salud en el trabajo', 'duracion_horas' => 8, 'modalidad' => 'presencial', 'norma_referencia' => 'Ley 29783 Art. 49'],
            ['tipo' => 'capacitacion', 'nombre' => 'Trabajos en altura y uso de arnés',            'duracion_horas' => 4, 'modalidad' => 'presencial', 'norma_referencia' => 'G.050'],
            ['tipo' => 'capacitacion', 'nombre' => 'Manipulación manual de cargas',                'duracion_horas' => 2, 'modalidad' => 'presencial'],
            ['tipo' => 'capacitacion', 'nombre' => 'Uso correcto de EPP',                          'duracion_horas' => 2, 'modalidad' => 'presencial'],
            ['tipo' => 'capacitacion', 'nombre' => 'Primeros auxilios básicos',                    'duracion_horas' => 8, 'modalidad' => 'presencial'],
            ['tipo' => 'capacitacion', 'nombre' => 'Manejo y almacenamiento de sustancias peligrosas','duracion_horas' => 4, 'modalidad' => 'presencial'],
            ['tipo' => 'capacitacion', 'nombre' => 'Prevención y lucha contra incendios',          'duracion_horas' => 4, 'modalidad' => 'presencial'],
            ['tipo' => 'capacitacion', 'nombre' => 'Seguridad eléctrica y LOTO',                   'duracion_horas' => 4, 'modalidad' => 'presencial'],
            ['tipo' => 'capacitacion', 'nombre' => 'Ergonomía y pausas activas',                   'duracion_horas' => 2, 'modalidad' => 'virtual'],
            ['tipo' => 'capacitacion', 'nombre' => 'Identificación de peligros (IPERC básico)',    'duracion_horas' => 4, 'modalidad' => 'presencial', 'norma_referencia' => 'Ley 29783 Art. 57'],
            ['tipo' => 'capacitacion', 'nombre' => 'Respuesta ante emergencias y simulacros',      'duracion_horas' => 4, 'modalidad' => 'presencial'],
            ['tipo' => 'capacitacion', 'nombre' => 'Señalización de seguridad (NTP 399.010)',       'duracion_horas' => 2, 'modalidad' => 'virtual', 'norma_referencia' => 'NTP 399.010'],

            // ─── CONTROLES ────────────────────────────────────────────────
            ['tipo' => 'control', 'nombre' => 'Eliminación del peligro en la fuente',      'tipo_control' => 'eliminacion', 'norma_referencia' => 'ISO 45001 §8.1.2'],
            ['tipo' => 'control', 'nombre' => 'Sustitución de sustancia peligrosa',        'tipo_control' => 'sustitucion'],
            ['tipo' => 'control', 'nombre' => 'Instalación de guardas de seguridad',       'tipo_control' => 'ingenieria'],
            ['tipo' => 'control', 'nombre' => 'Sistema de ventilación local exhaustora',   'tipo_control' => 'ingenieria'],
            ['tipo' => 'control', 'nombre' => 'Barandas y líneas de vida en altura',       'tipo_control' => 'ingenieria', 'norma_referencia' => 'G.050'],
            ['tipo' => 'control', 'nombre' => 'Señalización de zonas de peligro',          'tipo_control' => 'administrativo', 'norma_referencia' => 'NTP 399.010'],
            ['tipo' => 'control', 'nombre' => 'Procedimiento escrito de trabajo seguro (PETS)','tipo_control' => 'administrativo'],
            ['tipo' => 'control', 'nombre' => 'Permiso de trabajo de alto riesgo (PTAR)',  'tipo_control' => 'administrativo'],
            ['tipo' => 'control', 'nombre' => 'Capacitación específica en la tarea',       'tipo_control' => 'administrativo'],
            ['tipo' => 'control', 'nombre' => 'Rotación de puestos para reducir exposición','tipo_control' => 'administrativo'],
            ['tipo' => 'control', 'nombre' => 'Bloqueado/etiquetado de energía (LOTO)',    'tipo_control' => 'administrativo'],
            ['tipo' => 'control', 'nombre' => 'Casco de seguridad (clase B)',              'tipo_control' => 'epp', 'norma_referencia' => 'NTP 399.018'],
            ['tipo' => 'control', 'nombre' => 'Guantes de nitrilo para químicos',          'tipo_control' => 'epp'],
            ['tipo' => 'control', 'nombre' => 'Calzado de seguridad con punta de acero',   'tipo_control' => 'epp'],
            ['tipo' => 'control', 'nombre' => 'Lentes de seguridad',                       'tipo_control' => 'epp'],
            ['tipo' => 'control', 'nombre' => 'Protector auditivo (tapones/orejeras)',     'tipo_control' => 'epp'],
            ['tipo' => 'control', 'nombre' => 'Respirador media cara con filtros',         'tipo_control' => 'epp'],
            ['tipo' => 'control', 'nombre' => 'Arnés de cuerpo completo con línea de vida','tipo_control' => 'epp', 'norma_referencia' => 'ANSI Z359'],
            ['tipo' => 'control', 'nombre' => 'Ropa de protección química (Tyvek)',        'tipo_control' => 'epp'],
        ];

        if ($tipo) {
            return array_filter($todos, fn($i) => $i['tipo'] === $tipo);
        }

        return $todos;
    }
}
