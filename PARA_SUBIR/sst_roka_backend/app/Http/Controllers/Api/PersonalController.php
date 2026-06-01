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
        $query = Personal::with(['sede', 'area', 'cargo'])
            ->where('empresa_id', $request->user()->empresa_id);

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
            'sede_id'                     => 'nullable|exists:sedes,id',
            'area_id'                     => 'nullable|exists:areas,id',
            'cargo_id'                    => 'nullable|exists:cargos,id',
            'cargo'                       => 'nullable|string|max:150',
            'nombres'                     => 'required|string|max:100',
            'apellidos'                   => 'required|string|max:100',
            'dni'                         => 'required|string|size:8|unique:personal,dni',
            'fecha_nacimiento'            => 'nullable|date|before:today',
            'genero'                      => 'nullable|in:M,F,otro',
            'sexo'                        => 'nullable|in:M,F',
            'telefono'                    => 'nullable|string|max:20',
            'celular'                     => 'nullable|string|max:20',
            'email'                       => 'nullable|email|max:255',
            'direccion'                   => 'nullable|string|max:500',
            'codigo_empleado'             => 'nullable|string|max:30',
            'fecha_ingreso'               => 'nullable|date',
            'fecha_cese'                  => 'nullable|date',
            'tipo_contrato'               => 'nullable|string|max:50',
            'estado'                      => 'nullable|string|max:30',
            'es_supervisor_sst'           => 'boolean',
            'contacto_emergencia_nombre'  => 'nullable|string|max:150',
            'contacto_emergencia_telefono'=> 'nullable|string|max:20',
            'grupo_sanguineo'             => 'nullable|string|max:5',
        ]);

        $empresaId = $request->user()->empresa_id;

        // Mapear aliases de campo
        if (empty($data['genero']) && !empty($data['sexo'])) {
            $data['genero'] = $data['sexo'];
        }
        if (empty($data['telefono']) && !empty($data['celular'])) {
            $data['telefono'] = $data['celular'];
        }

        // Cargo texto → find-or-create cargo_id
        if (empty($data['cargo_id']) && !empty($data['cargo'])) {
            $cargo = \App\Models\Cargo::firstOrCreate(
                ['empresa_id' => $empresaId, 'nombre' => trim($data['cargo'])],
                ['empresa_id' => $empresaId, 'nombre' => trim($data['cargo'])]
            );
            $data['cargo_id'] = $cargo->id;
        }

        unset($data['sexo'], $data['celular'], $data['cargo']);

        $personal = Personal::create(array_merge($data, ['empresa_id' => $empresaId]));
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
            'sede_id'                     => 'nullable|exists:sedes,id',
            'area_id'                     => 'nullable|exists:areas,id',
            'cargo_id'                    => 'nullable|exists:cargos,id',
            'cargo'                       => 'nullable|string|max:150',
            'nombres'                     => 'sometimes|string|max:100',
            'apellidos'                   => 'sometimes|string|max:100',
            'dni'                         => "sometimes|string|size:8|unique:personal,dni,{$id}",
            'fecha_nacimiento'            => 'nullable|date|before:today',
            'genero'                      => 'nullable|in:M,F,otro',
            'sexo'                        => 'nullable|in:M,F',
            'telefono'                    => 'nullable|string|max:20',
            'celular'                     => 'nullable|string|max:20',
            'email'                       => 'nullable|email|max:255',
            'direccion'                   => 'nullable|string|max:500',
            'codigo_empleado'             => 'nullable|string|max:30',
            'fecha_ingreso'               => 'nullable|date',
            'fecha_cese'                  => 'nullable|date',
            'tipo_contrato'               => 'nullable|string|max:50',
            'estado'                      => 'nullable|string|max:30',
            'es_supervisor_sst'           => 'boolean',
            'contacto_emergencia_nombre'  => 'nullable|string|max:150',
            'contacto_emergencia_telefono'=> 'nullable|string|max:20',
            'grupo_sanguineo'             => 'nullable|string|max:5',
        ]);

        $empresaId = $personal->empresa_id;

        if (empty($data['genero']) && !empty($data['sexo'])) {
            $data['genero'] = $data['sexo'];
        }
        if (empty($data['telefono']) && !empty($data['celular'])) {
            $data['telefono'] = $data['celular'];
        }
        if (empty($data['cargo_id']) && !empty($data['cargo'])) {
            $cargo = \App\Models\Cargo::firstOrCreate(
                ['empresa_id' => $empresaId, 'nombre' => trim($data['cargo'])],
                ['empresa_id' => $empresaId, 'nombre' => trim($data['cargo'])]
            );
            $data['cargo_id'] = $cargo->id;
        }
        unset($data['sexo'], $data['celular'], $data['cargo']);

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
