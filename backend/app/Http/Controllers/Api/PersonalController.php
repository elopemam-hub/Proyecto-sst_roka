<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Personal;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PersonalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Personal::with(['empresa', 'sede', 'area', 'cargo']);

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        if ($request->filled('sede_id')) {
            $query->where('sede_id', $request->sede_id);
        }

        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->boolean('supervisor_sst')) {
            $query->where('es_supervisor_sst', true);
        }

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($sub) use ($q) {
                $sub->where('nombres', 'like', "%{$q}%")
                    ->orWhere('apellidos', 'like', "%{$q}%")
                    ->orWhere('dni', 'like', "%{$q}%")
                    ->orWhere('codigo_empleado', 'like', "%{$q}%");
            });
        }

        $personal = $query->orderBy('apellidos')->orderBy('nombres')
            ->paginate($request->integer('per_page', 15));

        return response()->json($personal);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'empresa_id'                  => 'required|exists:empresas,id',
            'sede_id'                     => 'nullable|exists:sedes,id',
            'area_id'                     => 'nullable|exists:areas,id',
            'cargo_id'                    => 'nullable|exists:cargos,id',
            'nombres'                     => 'required|string|max:100',
            'apellidos'                   => 'required|string|max:100',
            'dni'                         => 'required|string|size:8|unique:personal,dni',
            'fecha_nacimiento'            => 'nullable|date|before:today',
            'genero'                      => 'nullable|in:M,F,otro',
            'telefono'                    => 'nullable|string|max:20',
            'email'                       => 'nullable|email|max:255',
            'direccion'                   => 'nullable|string|max:500',
            'codigo_empleado'             => 'nullable|string|max:30',
            'fecha_ingreso'               => 'required|date',
            'fecha_cese'                  => 'nullable|date|after:fecha_ingreso',
            'tipo_contrato'               => 'nullable|string|max:50',
            'estado'                      => 'nullable|in:activo,inactivo,cesado,suspendido',
            'es_supervisor_sst'           => 'boolean',
            'contacto_emergencia_nombre'  => 'nullable|string|max:150',
            'contacto_emergencia_telefono'=> 'nullable|string|max:20',
            'grupo_sanguineo'             => 'nullable|string|max:5',
        ]);

        $personal = Personal::create($data);
        $personal->load(['empresa', 'sede', 'area', 'cargo']);

        return response()->json($personal, 201);
    }

    public function show(int $id): JsonResponse
    {
        $personal = Personal::with(['empresa', 'sede', 'area', 'cargo', 'usuario'])
            ->findOrFail($id);

        return response()->json($personal);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $personal = Personal::findOrFail($id);

        $data = $request->validate([
            'empresa_id'                  => 'sometimes|exists:empresas,id',
            'sede_id'                     => 'nullable|exists:sedes,id',
            'area_id'                     => 'nullable|exists:areas,id',
            'cargo_id'                    => 'nullable|exists:cargos,id',
            'nombres'                     => 'sometimes|string|max:100',
            'apellidos'                   => 'sometimes|string|max:100',
            'dni'                         => "sometimes|string|size:8|unique:personal,dni,{$id}",
            'fecha_nacimiento'            => 'nullable|date|before:today',
            'genero'                      => 'nullable|in:M,F,otro',
            'telefono'                    => 'nullable|string|max:20',
            'email'                       => 'nullable|email|max:255',
            'direccion'                   => 'nullable|string|max:500',
            'codigo_empleado'             => 'nullable|string|max:30',
            'fecha_ingreso'               => 'sometimes|date',
            'fecha_cese'                  => 'nullable|date',
            'tipo_contrato'               => 'nullable|string|max:50',
            'estado'                      => 'nullable|in:activo,inactivo,cesado,suspendido',
            'es_supervisor_sst'           => 'boolean',
            'contacto_emergencia_nombre'  => 'nullable|string|max:150',
            'contacto_emergencia_telefono'=> 'nullable|string|max:20',
            'grupo_sanguineo'             => 'nullable|string|max:5',
        ]);

        $personal->update($data);
        $personal->load(['empresa', 'sede', 'area', 'cargo']);

        return response()->json($personal);
    }

    public function destroy(int $id): JsonResponse
    {
        $personal = Personal::findOrFail($id);
        $personal->delete();

        return response()->json(['message' => 'Personal eliminado correctamente.']);
    }

    public function historialSst(int $id): JsonResponse
    {
        $personal = Personal::findOrFail($id);

        return response()->json([
            'personal'      => $personal->load(['area', 'cargo']),
            'participaciones_ats' => $personal->hasMany(\App\Models\AtsParticipante::class)->with('ats')->get(),
            'controles_iperc'    => \App\Models\IpercControl::where('responsable_id', $id)
                ->with('peligro.proceso.iperc')
                ->get(),
        ]);
    }
}
