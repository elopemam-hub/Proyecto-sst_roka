<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehiculo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class VehiculoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Vehiculo::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'conductor:id,nombres,apellidos']);

        if ($request->filled('tipo'))   $query->where('tipo', $request->tipo);
        if ($request->filled('estado')) $query->where('estado', $request->estado);
        if ($request->boolean('vencidos')) {
            $hoy = Carbon::today();
            $query->where(fn($q) =>
                $q->where('soat_vencimiento', '<', $hoy)
                  ->orWhere('revision_tecnica_vencimiento', '<', $hoy)
            );
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) =>
                $q->where('placa', 'like', "%{$s}%")
                  ->orWhere('marca', 'like', "%{$s}%")
                  ->orWhere('modelo', 'like', "%{$s}%")
            );
        }

        return response()->json(
            $query->orderBy('placa')->paginate(min($request->integer('per_page', 15), 100))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'placa'                        => 'required|string|max:10',
            'marca'                        => 'required|string|max:100',
            'modelo'                       => 'required|string|max:100',
            'anio'                         => 'nullable|integer|min:1990|max:' . (date('Y') + 1),
            'color'                        => 'nullable|string|max:50',
            'tipo'                         => 'required|in:camion,van,auto,moto,bus,otro',
            'nro_chasis'                   => 'nullable|string|max:100',
            'nro_motor'                    => 'nullable|string|max:100',
            'soat_vencimiento'             => 'nullable|date',
            'revision_tecnica_vencimiento' => 'nullable|date',
            'fecha_ultima_revision'        => 'nullable|date',
            'area_id'                      => 'nullable|integer',
            'conductor_habitual_id'        => 'nullable|integer',
            'estado'                       => 'in:activo,mantenimiento,baja',
            'observaciones'                => 'nullable|string',
        ]);

        $vehiculo = Vehiculo::create([...$data, 'empresa_id' => $request->user()->empresa_id]);
        return response()->json($vehiculo->load(['area:id,nombre', 'conductor:id,nombres,apellidos']), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $vehiculo = Vehiculo::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'conductor:id,nombres,apellidos'])
            ->findOrFail($id);
        return response()->json($vehiculo);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $vehiculo = Vehiculo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $data = $request->validate([
            'placa'                        => 'sometimes|string|max:10',
            'marca'                        => 'sometimes|string|max:100',
            'modelo'                       => 'sometimes|string|max:100',
            'anio'                         => 'nullable|integer',
            'color'                        => 'nullable|string|max:50',
            'tipo'                         => 'sometimes|in:camion,van,auto,moto,bus,otro',
            'nro_chasis'                   => 'nullable|string',
            'nro_motor'                    => 'nullable|string',
            'soat_vencimiento'             => 'nullable|date',
            'revision_tecnica_vencimiento' => 'nullable|date',
            'fecha_ultima_revision'        => 'nullable|date',
            'area_id'                      => 'nullable|integer',
            'conductor_habitual_id'        => 'nullable|integer',
            'estado'                       => 'in:activo,mantenimiento,baja',
            'observaciones'                => 'nullable|string',
        ]);

        $vehiculo->update($data);
        return response()->json($vehiculo->load(['area:id,nombre', 'conductor:id,nombres,apellidos']));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $vehiculo = Vehiculo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $vehiculo->delete();
        return response()->json(['message' => 'Vehículo eliminado']);
    }

    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $hoy = Carbon::today();

        $total    = Vehiculo::where('empresa_id', $empresaId)->count();
        $activos  = Vehiculo::where('empresa_id', $empresaId)->where('estado', 'activo')->count();
        $soatVenc = Vehiculo::where('empresa_id', $empresaId)
            ->whereNotNull('soat_vencimiento')->where('soat_vencimiento', '<', $hoy)->count();
        $revVenc  = Vehiculo::where('empresa_id', $empresaId)
            ->whereNotNull('revision_tecnica_vencimiento')
            ->where('revision_tecnica_vencimiento', '<', $hoy)->count();

        $porTipo = Vehiculo::where('empresa_id', $empresaId)
            ->selectRaw('tipo, count(*) as total')
            ->groupBy('tipo')->get();

        return response()->json(compact('total', 'activos', 'soatVenc', 'revVenc', 'porTipo'));
    }
}
