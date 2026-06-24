<?php

namespace App\Services;

use App\Models\EppEntrega;
use App\Models\EppInventario;
use App\Services\AuditoriaService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class EppEntregaService
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * Registrar entrega de EPP
     */
    public function registrarEntrega(
        int $empresaId,
        array $data,
        $usuario
    ): EppEntrega {
        return DB::transaction(function () use ($empresaId, $data, $usuario) {
            // Bloqueo pesimista del inventario
            $inventario = EppInventario::where('empresa_id', $empresaId)
                ->with('categoria')
                ->lockForUpdate()
                ->findOrFail($data['inventario_id']);

            // Validar stock
            if ($inventario->stock_disponible < $data['cantidad']) {
                throw new \Exception("Stock insuficiente. Disponible: {$inventario->stock_disponible}");
            }

            // Procesar firma si existe
            $firmaPath = null;
            if (!empty($data['firma'])) {
                $firmaPath = $this->guardarFirma($data['firma']);
            }

            // FASE 6: Calcular fecha_vencimiento automáticamente
            $fechaVencimiento = $data['fecha_vencimiento'] ?? null;
            if (!$fechaVencimiento && $inventario->categoria && $inventario->categoria->vida_util_meses) {
                $fechaVencimiento = Carbon::parse($data['fecha_entrega'])
                    ->addMonths($inventario->categoria->vida_util_meses)
                    ->toDateString();
            }

            // Crear entrega
            $entrega = EppEntrega::create([
                'empresa_id'        => $empresaId,
                'personal_id'       => $data['personal_id'],
                'inventario_id'     => $data['inventario_id'],
                'cantidad'          => $data['cantidad'],
                'fecha_entrega'     => $data['fecha_entrega'],
                'fecha_vencimiento' => $fechaVencimiento,
                'motivo_entrega'    => $data['motivo_entrega'],
                'observaciones'     => $data['observaciones'] ?? null,
                'entregado_por'     => $usuario->id,
                'estado'            => 'entregado',
                'firma_path'        => $firmaPath,
                'firmado_en'        => $firmaPath ? now() : null,
            ]);

            // Decrementar stock
            $inventario->decrementarStock($data['cantidad']);

            // Auditoría
            $this->auditoria->registrar(
                modulo: 'epps',
                accion: 'entrega',
                usuario: $usuario,
                modelo: 'EppEntrega',
                modeloId: $entrega->id,
                valorNuevo: [
                    'personal_id'    => $entrega->personal_id,
                    'inventario_id'  => $entrega->inventario_id,
                    'cantidad'       => $entrega->cantidad,
                    'motivo'         => $entrega->motivo_entrega,
                    'tiene_firma'    => !empty($entrega->firma_path),
                ]
            );

            return $entrega->load(['personal', 'inventario']);
        });
    }

    /**
     * Registrar devolución
     */
    public function registrarDevolucion(
        int $id,
        int $empresaId,
        array $data,
        $usuario
    ): EppEntrega {
        $entrega = EppEntrega::where('empresa_id', $empresaId)
            ->where('estado', 'entregado')
            ->findOrFail($id);

        $estadoAnterior = $entrega->estado;

        DB::transaction(function () use ($entrega, $data) {
            $nuevoEstado = $data['estado'] ?? 'devuelto';

            // Bloquear inventario
            $inventario = EppInventario::lockForUpdate()->findOrFail($entrega->inventario_id);

            $entrega->update([
                'estado'           => $nuevoEstado,
                'fecha_devolucion' => $data['fecha_devolucion'] ?? now()->toDateString(),
                'observaciones'    => $data['observaciones'] ?? $entrega->observaciones,
            ]);

            // Retornar stock solo si está en buen estado
            if ($nuevoEstado === 'devuelto') {
                $inventario->incrementarStock($entrega->cantidad);
            }
        });

        // Auditoría
        $this->auditoria->registrar(
            modulo: 'epps',
            accion: 'devolucion',
            usuario: $usuario,
            modelo: 'EppEntrega',
            modeloId: $entrega->id,
            valorAnterior: ['estado' => $estadoAnterior],
            valorNuevo: [
                'estado'           => $data['estado'] ?? 'devuelto',
                'fecha_devolucion' => $data['fecha_devolucion'] ?? now()->toDateString(),
                'stock_retornado'  => ($data['estado'] ?? 'devuelto') === 'devuelto',
            ]
        );

        return $entrega->fresh(['personal', 'inventario']);
    }

    /**
     * Obtener todas las entregas
     */
    public function getEntregas(int $empresaId, array $filters = []): Collection
    {
        $query = EppEntrega::where('empresa_id', $empresaId)
            ->with(['personal', 'inventario', 'entregadoPor']);

        if (!empty($filters['estado'])) {
            $query->where('estado', $filters['estado']);
        }

        if (!empty($filters['personal_id'])) {
            $query->where('personal_id', $filters['personal_id']);
        }

        if (!empty($filters['inventario_id'])) {
            $query->where('inventario_id', $filters['inventario_id']);
        }

        return $query->orderByDesc('fecha_entrega')->get();
    }

    /**
     * Obtener alertas de EPPs
     */
    public function getAlertas(int $empresaId): array
    {
        $hoy = Carbon::today();

        // EPPs vencidos
        $vencidos = EppEntrega::where('empresa_id', $empresaId)
            ->where('estado', 'entregado')
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', $hoy)
            ->with(['personal:id,nombres,apellidos,dni', 'inventario:id,nombre,codigo_interno'])
            ->get()
            ->map(function($entrega) use ($hoy) {
                $fechaVenc = Carbon::parse($entrega->fecha_vencimiento);
                return [
                    'id'                => $entrega->id,
                    'epp_nombre'        => $entrega->inventario->nombre ?? 'N/A',
                    'epp_codigo'        => $entrega->inventario->codigo_interno ?? '',
                    'personal_nombre'   => ($entrega->personal->nombres ?? '') . ' ' . ($entrega->personal->apellidos ?? ''),
                    'personal_dni'      => $entrega->personal->dni ?? '',
                    'fecha_vencimiento' => $entrega->fecha_vencimiento,
                    'dias_vencido'      => abs($hoy->diffInDays($fechaVenc)),
                    'cantidad'          => $entrega->cantidad,
                ];
            });

        // EPPs próximos a vencer
        $proximosVencer = EppEntrega::where('empresa_id', $empresaId)
            ->where('estado', 'entregado')
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [$hoy, $hoy->copy()->addDays(30)])
            ->with(['personal:id,nombres,apellidos,dni', 'inventario:id,nombre,codigo_interno'])
            ->orderBy('fecha_vencimiento')
            ->get()
            ->map(function($entrega) use ($hoy) {
                $fechaVenc = Carbon::parse($entrega->fecha_vencimiento);
                return [
                    'id'                => $entrega->id,
                    'epp_nombre'        => $entrega->inventario->nombre ?? 'N/A',
                    'epp_codigo'        => $entrega->inventario->codigo_interno ?? '',
                    'personal_nombre'   => ($entrega->personal->nombres ?? '') . ' ' . ($entrega->personal->apellidos ?? ''),
                    'personal_dni'      => $entrega->personal->dni ?? '',
                    'fecha_vencimiento' => $entrega->fecha_vencimiento,
                    'dias_restantes'    => $hoy->diffInDays($fechaVenc),
                    'cantidad'          => $entrega->cantidad,
                ];
            });

        // Stock bajo
        $stockBajo = EppInventario::where('empresa_id', $empresaId)
            ->where('activo', true)
            ->stockBajo()
            ->with('categoria:id,nombre')
            ->get()
            ->map(function($epp) {
                return [
                    'id'                => $epp->id,
                    'nombre'            => $epp->nombre,
                    'codigo_interno'    => $epp->codigo_interno,
                    'categoria'         => $epp->categoria->nombre ?? 'N/A',
                    'talla'             => $epp->talla,
                    'stock_disponible'  => $epp->stock_disponible,
                    'stock_minimo'      => $epp->stock_minimo,
                    'diferencia'        => $epp->stock_disponible - $epp->stock_minimo,
                ];
            });

        // Stock crítico
        $stockCritico = EppInventario::where('empresa_id', $empresaId)
            ->where('activo', true)
            ->stockCritico()
            ->with('categoria:id,nombre')
            ->get()
            ->map(function($epp) {
                return [
                    'id'                => $epp->id,
                    'nombre'            => $epp->nombre,
                    'codigo_interno'    => $epp->codigo_interno,
                    'categoria'         => $epp->categoria->nombre ?? 'N/A',
                    'talla'             => $epp->talla,
                    'stock_disponible'  => $epp->stock_disponible,
                    'stock_minimo'      => $epp->stock_minimo,
                    'stock_critico'     => (int)($epp->stock_minimo * 0.5),
                ];
            });

        return [
            'vencidos'          => $vencidos,
            'proximos_vencer'   => $proximosVencer,
            'stock_bajo'        => $stockBajo,
            'stock_critico'     => $stockCritico,
            'resumen' => [
                'total_vencidos'        => $vencidos->count(),
                'total_por_vencer'      => $proximosVencer->count(),
                'total_stock_bajo'      => $stockBajo->count(),
                'total_stock_critico'   => $stockCritico->count(),
            ],
        ];
    }

    /**
     * Guardar firma digital
     */
    private function guardarFirma(string $firmaBase64): string
    {
        $firmaBase64 = preg_replace('/^data:image\/\w+;base64,/', '', $firmaBase64);
        $firmaPath = 'firmas/epps/' . uniqid() . '_' . time() . '.png';
        Storage::disk('public')->put($firmaPath, base64_decode($firmaBase64));
        return $firmaPath;
    }
}
