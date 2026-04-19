<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class EquipoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Equipo::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'responsable:id,nombres,apellidos']);

        if ($request->filled('tipo'))    $query->where('tipo', $request->tipo);
        if ($request->filled('estado'))  $query->where('estado', $request->estado);
        if ($request->filled('area_id')) $query->where('area_id', $request->area_id);
        if ($request->boolean('proximos_calibracion')) {
            $limite = Carbon::today()->addDays(30);
            $query->whereNotNull('fecha_proxima_calibracion')
                  ->where('fecha_proxima_calibracion', '<=', $limite)
                  ->where('fecha_proxima_calibracion', '>=', Carbon::today());
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) =>
                $q->where('codigo', 'like', "%{$s}%")
                  ->orWhere('nombre', 'like', "%{$s}%")
            );
        }

        return response()->json(
            $query->orderBy('nombre')->paginate(min($request->integer('per_page', 15), 100))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'codigo'                       => 'required|string|max:50',
            'nombre'                       => 'required|string|max:150',
            'tipo'                         => 'required|in:maquinaria,herramienta,instrumento,vehiculo,otro',
            'marca'                        => 'nullable|string|max:100',
            'modelo'                       => 'nullable|string|max:100',
            'serie'                        => 'nullable|string|max:100',
            'anio_fabricacion'             => 'nullable|integer',
            'fecha_adquisicion'            => 'nullable|date',
            'fecha_ultimo_mantenimiento'   => 'nullable|date',
            'fecha_proxima_calibracion'    => 'nullable|date',
            'fecha_proxima_revision'       => 'nullable|date',
            'area_id'                      => 'nullable|integer',
            'responsable_id'               => 'nullable|integer',
            'estado'                       => 'in:operativo,mantenimiento,baja,inactivo',
            'ubicacion'                    => 'nullable|string|max:200',
            'observaciones'                => 'nullable|string',
        ]);

        $equipo = Equipo::create([...$data, 'empresa_id' => $request->user()->empresa_id]);
        return response()->json($equipo->load(['area:id,nombre', 'responsable:id,nombres,apellidos']), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $equipo = Equipo::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'responsable:id,nombres,apellidos'])
            ->findOrFail($id);
        return response()->json($equipo);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $equipo = Equipo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $data = $request->validate([
            'codigo'                     => 'sometimes|string|max:50',
            'nombre'                     => 'sometimes|string|max:150',
            'tipo'                       => 'sometimes|in:maquinaria,herramienta,instrumento,vehiculo,otro',
            'marca'                      => 'nullable|string|max:100',
            'modelo'                     => 'nullable|string|max:100',
            'serie'                      => 'nullable|string|max:100',
            'fecha_ultimo_mantenimiento' => 'nullable|date',
            'fecha_proxima_calibracion'  => 'nullable|date',
            'fecha_proxima_revision'     => 'nullable|date',
            'area_id'                    => 'nullable|integer',
            'responsable_id'             => 'nullable|integer',
            'estado'                     => 'in:operativo,mantenimiento,baja,inactivo',
            'ubicacion'                  => 'nullable|string|max:200',
            'observaciones'              => 'nullable|string',
        ]);

        $equipo->update($data);
        return response()->json($equipo->load(['area:id,nombre', 'responsable:id,nombres,apellidos']));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $equipo = Equipo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $equipo->delete();
        return response()->json(['message' => 'Equipo eliminado']);
    }

    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $limite30  = Carbon::today()->addDays(30);

        $total         = Equipo::where('empresa_id', $empresaId)->count();
        $operativos    = Equipo::where('empresa_id', $empresaId)->where('estado', 'operativo')->count();
        $mantenimiento = Equipo::where('empresa_id', $empresaId)->where('estado', 'mantenimiento')->count();
        $proxCalibracion = Equipo::where('empresa_id', $empresaId)
            ->whereNotNull('fecha_proxima_calibracion')
            ->where('fecha_proxima_calibracion', '<=', $limite30)
            ->where('fecha_proxima_calibracion', '>=', Carbon::today())->count();

        $porTipo = Equipo::where('empresa_id', $empresaId)
            ->selectRaw('tipo, count(*) as total')
            ->groupBy('tipo')->get();

        return response()->json(compact('total', 'operativos', 'mantenimiento', 'proxCalibracion', 'porTipo'));
    }
}
