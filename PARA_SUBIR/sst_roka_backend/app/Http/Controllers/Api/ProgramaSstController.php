<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProgramaSst;
use App\Models\ProgramaSstActividad;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class ProgramaSstController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ProgramaSst::where('empresa_id', $request->user()->empresa_id)
            ->withCount('actividades');

        if ($request->filled('anio'))   $query->where('anio', $request->anio);
        if ($request->filled('estado')) $query->where('estado', $request->estado);

        $programas = $query->orderByDesc('anio')->paginate(min($request->integer('per_page', 15), 50));

        // Agregar porcentaje de cumplimiento a cada programa
        $programas->getCollection()->transform(function ($p) {
            $p->porcentaje_cumplimiento;
            return $p;
        });

        return response()->json($programas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'anio'             => 'required|integer|min:2020|max:2040',
            'nombre'           => 'required|string|max:200',
            'objetivo_general' => 'nullable|string',
            'monto_total'      => 'nullable|numeric|min:0',
            'estado'           => 'in:borrador,aprobado,en_ejecucion,cerrado',
        ]);

        $programa = ProgramaSst::create([...$data, 'empresa_id' => $request->user()->empresa_id]);
        return response()->json($programa, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $programa = ProgramaSst::where('empresa_id', $request->user()->empresa_id)
            ->with(['actividades.responsable:id,nombres,apellidos'])
            ->findOrFail($id);

        $programa->porcentaje_cumplimiento;
        return response()->json($programa);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $programa = ProgramaSst::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $data = $request->validate([
            'anio'             => 'sometimes|integer',
            'nombre'           => 'sometimes|string|max:200',
            'objetivo_general' => 'nullable|string',
            'monto_total'      => 'nullable|numeric|min:0',
            'estado'           => 'in:borrador,aprobado,en_ejecucion,cerrado',
            'fecha_aprobacion' => 'nullable|date',
        ]);

        $programa->update($data);
        return response()->json($programa);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $programa = ProgramaSst::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $programa->actividades()->delete();
        $programa->delete();
        return response()->json(['message' => 'Programa eliminado']);
    }

    public function actividades(Request $request, int $id): JsonResponse
    {
        $programa = ProgramaSst::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $actividades = $programa->actividades()
            ->with('responsable:id,nombres,apellidos')
            ->orderBy('fecha_inicio')
            ->get();
        return response()->json($actividades);
    }

    public function registrarActividad(Request $request, int $id): JsonResponse
    {
        $programa = ProgramaSst::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $data = $request->validate([
            'objetivo'        => 'required|string|max:200',
            'descripcion'     => 'required|string',
            'responsable_id'  => 'nullable|integer',
            'fecha_inicio'    => 'required|date',
            'fecha_fin'       => 'required|date|after_or_equal:fecha_inicio',
            'presupuesto'     => 'nullable|numeric|min:0',
            'estado'          => 'in:pendiente,en_proceso,completado,vencido',
        ]);

        $actividad = $programa->actividades()->create([...$data, 'avance' => 0]);
        return response()->json($actividad->load('responsable:id,nombres,apellidos'), 201);
    }

    public function actualizarActividad(Request $request, int $actividadId): JsonResponse
    {
        $actividad = ProgramaSstActividad::findOrFail($actividadId);

        // Verificar que pertenece a empresa del usuario
        $programa = ProgramaSst::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($actividad->programa_id);

        $data = $request->validate([
            'avance'       => 'sometimes|integer|min:0|max:100',
            'estado'       => 'sometimes|in:pendiente,en_proceso,completado,vencido',
            'observaciones' => 'nullable|string',
        ]);

        if (isset($data['avance']) && $data['avance'] === 100) {
            $data['estado'] = 'completado';
        }

        $actividad->update($data);
        return response()->json($actividad->load('responsable:id,nombres,apellidos'));
    }

    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio = $request->integer('anio', date('Y'));

        $programa = ProgramaSst::where('empresa_id', $empresaId)
            ->where('anio', $anio)
            ->with('actividades')
            ->first();

        if (!$programa) {
            return response()->json(['anio' => $anio, 'total' => 0, 'completadas' => 0,
                'vencidas' => 0, 'pendientes' => 0, 'porcentaje' => 0]);
        }

        $total       = $programa->actividades->count();
        $completadas = $programa->actividades->where('estado', 'completado')->count();
        $vencidas    = $programa->actividades->where('estado', 'vencido')->count();
        $pendientes  = $programa->actividades->whereIn('estado', ['pendiente', 'en_proceso'])->count();
        $porcentaje  = $total > 0 ? round(($completadas / $total) * 100, 1) : 0;

        return response()->json(compact('anio', 'total', 'completadas', 'vencidas', 'pendientes', 'porcentaje'));
    }
}
