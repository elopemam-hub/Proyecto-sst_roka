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

        if ($request->filled('tipo_trabajador')) {
            $query->where('tipo_trabajador', $request->tipo_trabajador);
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
            'dni'                         => 'required|string|min:7|max:8|unique:personal,dni,' . ($request->route('id') ?? 'NULL'),
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
            'dni_vencimiento'             => 'nullable|date',
            'licencia_conducir'           => 'nullable|string|max:20',
            'licencia_categoria'          => 'nullable|string|max:10',
            'licencia_vencimiento'        => 'nullable|date',
            // Campos para trabajadores terceros
            'tipo_trabajador'             => 'nullable|in:interno,tercero',
            'empresa_tercera'             => 'nullable|string|max:255',
            'certificaciones'             => 'nullable|array',
            'vigencia_hasta'              => 'nullable|date|after:today',
            // Archivos de documentos
            'dni_foto'                    => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'licencia_foto'               => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
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

        // Manejar subida de archivos
        if ($request->hasFile('dni_foto')) {
            $file = $request->file('dni_foto');
            $filename = 'dni_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('personal/documentos', $filename, 'public');
            $data['dni_foto_path'] = $path;
        }

        if ($request->hasFile('licencia_foto')) {
            $file = $request->file('licencia_foto');
            $filename = 'licencia_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('personal/documentos', $filename, 'public');
            $data['licencia_foto_path'] = $path;
        }

        $personal = Personal::create(array_merge($data, ['empresa_id' => $empresaId]));
        $personal->load(['empresa', 'sede', 'area', 'cargo']);

        return response()->json($personal, 201);
    }

    // ── Importación masiva desde Excel ─────────────────────────────
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'registros'   => 'required|array|min:1',
            'modo'        => 'in:insertar,upsert', // upsert = actualizar si existe
        ]);

        $empresaId = $request->user()->empresa_id;
        $modo      = $request->input('modo', 'insertar');
        $ok = 0; $actualizados = 0; $omitidos = 0; $errores = [];

        foreach ($request->registros as $idx => $reg) {
            try {
                $dni = trim($reg['dni'] ?? '');
                if (!$dni || !preg_match('/^\d{7,8}$/', $dni)) {
                    $errores[] = ['fila' => $idx + 2, 'dni' => $dni, 'error' => 'DNI inválido (debe tener 7-8 dígitos)'];
                    continue;
                }

                // Resolver cargo
                $cargoId = $reg['cargo_id'] ?? null;
                if (!$cargoId && !empty($reg['cargo'])) {
                    $cargo = \App\Models\Cargo::firstOrCreate(
                        ['empresa_id' => $empresaId, 'nombre' => trim($reg['cargo'])],
                        ['empresa_id' => $empresaId, 'nombre' => trim($reg['cargo'])]
                    );
                    $cargoId = $cargo->id;
                }

                // Helper para valor o null
                $v = fn($key) => isset($reg[$key]) && $reg[$key] !== '' ? $reg[$key] : null;

                $campos = [
                    'empresa_id'                  => $empresaId,
                    'nombres'                     => trim($reg['nombres']),
                    'apellidos'                   => trim($reg['apellidos']),
                    'fecha_nacimiento'            => $v('fecha_nacimiento'),
                    'genero'                      => $v('genero'),
                    'telefono'                    => $v('telefono'),
                    'email'                       => $v('email'),
                    'direccion'                   => $v('direccion'),
                    'area_id'                     => $v('area_id'),
                    'cargo_id'                    => $cargoId,
                    'fecha_ingreso'               => $v('fecha_ingreso'),   // nullable ahora
                    'tipo_contrato'               => $v('tipo_contrato') ?? 'indefinido',
                    'estado'                      => $v('estado') ?? 'activo',
                    'grupo_sanguineo'             => $v('grupo_sanguineo'),
                    'dni_vencimiento'             => $v('dni_vencimiento'),
                    'licencia_conducir'           => $v('licencia_conducir'),
                    'licencia_categoria'          => $v('licencia_categoria'),
                    'licencia_vencimiento'        => $v('licencia_vencimiento'),
                    'contacto_emergencia_nombre'  => $v('contacto_emergencia_nombre'),
                    'contacto_emergencia_telefono'=> $v('contacto_emergencia_telefono'),
                ];

                $existente = Personal::where('empresa_id', $empresaId)->where('dni', $dni)->first();

                if ($existente) {
                    if ($modo === 'upsert') {
                        $existente->update($campos);
                        $actualizados++;
                    } else {
                        // En modo insertar, los duplicados se omiten sin error
                        $omitidos++;
                    }
                } else {
                    Personal::create(array_merge($campos, ['dni' => $dni]));
                    $ok++;
                }
            } catch (\Exception $e) {
                $msg = $e->getMessage();
                // Detectar error de duplicado y contar como omitido
                if (str_contains($msg, 'Duplicate entry') || str_contains($msg, 'unique')) {
                    $omitidos++;
                } else {
                    $errores[] = ['fila' => $idx + 2, 'dni' => $reg['dni'] ?? '?', 'error' => $msg];
                }
            }
        }

        return response()->json([
            'insertados'   => $ok,
            'actualizados' => $actualizados,
            'omitidos'     => $omitidos,
            'errores'      => $errores,
            'total'        => count($request->registros),
        ]);
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
            'dni_vencimiento'             => 'nullable|date',
            'licencia_conducir'           => 'nullable|string|max:20',
            'licencia_categoria'          => 'nullable|string|max:10',
            'licencia_vencimiento'        => 'nullable|date',
            // Campos para trabajadores terceros
            'tipo_trabajador'             => 'nullable|in:interno,tercero',
            'empresa_tercera'             => 'nullable|string|max:255',
            'certificaciones'             => 'nullable|array',
            'vigencia_hasta'              => 'nullable|date',
            // Archivos de documentos
            'dni_foto'                    => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'licencia_foto'               => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $empresaId = $personal->empresa_id;

        // Manejar actualización de archivos
        if ($request->hasFile('dni_foto')) {
            // Eliminar archivo anterior si existe
            if ($personal->dni_foto_path && \Storage::disk('public')->exists($personal->dni_foto_path)) {
                \Storage::disk('public')->delete($personal->dni_foto_path);
            }
            // Guardar nuevo archivo
            $file = $request->file('dni_foto');
            $filename = 'dni_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('personal/documentos', $filename, 'public');
            $data['dni_foto_path'] = $path;
        }

        if ($request->hasFile('licencia_foto')) {
            // Eliminar archivo anterior si existe
            if ($personal->licencia_foto_path && \Storage::disk('public')->exists($personal->licencia_foto_path)) {
                \Storage::disk('public')->delete($personal->licencia_foto_path);
            }
            // Guardar nuevo archivo
            $file = $request->file('licencia_foto');
            $filename = 'licencia_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('personal/documentos', $filename, 'public');
            $data['licencia_foto_path'] = $path;
        }

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

    /** GET /api/personal/estadisticas */
    public function alertas(Request $request): JsonResponse
    {
        $eId  = $request->user()->empresa_id;
        $hoy  = now()->toDateString();
        $d30  = now()->addDays(30)->toDateString();
        $d60  = now()->addDays(60)->toDateString();

        $base = fn() => Personal::where('empresa_id', $eId)
            ->where('estado', 'activo')
            ->select('id','nombres','apellidos','dni','area_id','cargo_id',
                     'dni_vencimiento','licencia_conducir','licencia_categoria','licencia_vencimiento')
            ->with(['area:id,nombre','cargo:id,nombre']);

        // DNI vencido
        $dniVencidos = (clone $base())
            ->whereNotNull('dni_vencimiento')
            ->where('dni_vencimiento', '<', $hoy)
            ->orderBy('dni_vencimiento')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id, 'nombres' => $p->nombres, 'apellidos' => $p->apellidos,
                'area' => $p->area?->nombre, 'cargo' => $p->cargo?->nombre,
                'tipo' => 'dni_vencido', 'nivel' => 'critico',
                'descripcion' => 'DNI vencido',
                'fecha' => $p->dni_vencimiento,
                'dias' => now()->diffInDays($p->dni_vencimiento, false),
            ]);

        // DNI por vencer ≤30d
        $dniPorVencer = (clone $base())
            ->whereNotNull('dni_vencimiento')
            ->whereBetween('dni_vencimiento', [$hoy, $d30])
            ->orderBy('dni_vencimiento')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id, 'nombres' => $p->nombres, 'apellidos' => $p->apellidos,
                'area' => $p->area?->nombre, 'cargo' => $p->cargo?->nombre,
                'tipo' => 'dni_por_vencer', 'nivel' => 'advertencia',
                'descripcion' => 'DNI próximo a vencer',
                'fecha' => $p->dni_vencimiento,
                'dias' => (int) now()->diffInDays($p->dni_vencimiento),
            ]);

        // Licencia vencida
        $licVencidas = (clone $base())
            ->whereNotNull('licencia_vencimiento')
            ->where('licencia_vencimiento', '<', $hoy)
            ->orderBy('licencia_vencimiento')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id, 'nombres' => $p->nombres, 'apellidos' => $p->apellidos,
                'area' => $p->area?->nombre, 'cargo' => $p->cargo?->nombre,
                'tipo' => 'licencia_vencida', 'nivel' => 'critico',
                'descripcion' => "Lic. conducir {$p->licencia_categoria} vencida",
                'fecha' => $p->licencia_vencimiento,
                'dias' => now()->diffInDays($p->licencia_vencimiento, false),
            ]);

        // Licencia por vencer ≤60d
        $licPorVencer = (clone $base())
            ->whereNotNull('licencia_vencimiento')
            ->whereBetween('licencia_vencimiento', [$hoy, $d60])
            ->orderBy('licencia_vencimiento')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id, 'nombres' => $p->nombres, 'apellidos' => $p->apellidos,
                'area' => $p->area?->nombre, 'cargo' => $p->cargo?->nombre,
                'tipo' => 'licencia_por_vencer', 'nivel' => 'advertencia',
                'descripcion' => "Lic. conducir {$p->licencia_categoria} próxima a vencer",
                'fecha' => $p->licencia_vencimiento,
                'dias' => (int) now()->diffInDays($p->licencia_vencimiento),
            ]);

        $todas = collect()
            ->concat($dniVencidos)
            ->concat($licVencidas)
            ->concat($dniPorVencer)
            ->concat($licPorVencer)
            ->sortBy('dias')
            ->values();

        return response()->json([
            'total'           => $todas->count(),
            'criticos'        => $todas->where('nivel','critico')->count(),
            'advertencias'    => $todas->where('nivel','advertencia')->count(),
            'alertas'         => $todas,
        ]);
    }

    public function estadisticas(Request $request): JsonResponse
    {
        $eId = $request->user()->empresa_id;
        $hoy = now()->toDateString();

        $base = fn() => Personal::where('empresa_id', $eId);

        return response()->json([
            'total'              => $base()->count(),
            'activos'            => $base()->where('estado', 'activo')->count(),
            'inactivos'          => $base()->where('estado', 'inactivo')->count(),
            'dni_vencidos'       => $base()->whereNotNull('dni_vencimiento')
                                        ->where('dni_vencimiento', '<', $hoy)->count(),
            'dni_por_vencer'     => $base()->whereNotNull('dni_vencimiento')
                                        ->whereBetween('dni_vencimiento', [$hoy, now()->addDays(30)->toDateString()])->count(),
            'licencias_vencidas' => $base()->whereNotNull('licencia_vencimiento')
                                        ->where('licencia_vencimiento', '<', $hoy)->count(),
            'licencias_por_vencer'=> $base()->whereNotNull('licencia_vencimiento')
                                        ->whereBetween('licencia_vencimiento', [$hoy, now()->addDays(30)->toDateString()])->count(),
            'con_licencia'       => $base()->whereNotNull('licencia_conducir')
                                        ->where('licencia_conducir', '!=', '')->count(),
        ]);
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
