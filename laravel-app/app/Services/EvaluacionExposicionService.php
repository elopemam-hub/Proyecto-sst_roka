<?php

namespace App\Services;

use App\Models\SustanciaPeligrosa;

/**
 * Evalúa una medición de exposición ocupacional contra los límites de la
 * sustancia (TLV-TWA, STEL, IDLH).
 *
 * Criterios:
 * - Solo se compara si las unidades COINCIDEN exactamente. No se convierte
 *   entre ppm y mg/m³: eso exige peso molecular, temperatura y presión, y un
 *   error ahí da un "aceptable" falso sobre una decisión de salud. Cuando no
 *   se puede comparar se dice, no se estima.
 * - El IDLH manda sobre todo lo demás: si se alcanza, es peligro inmediato.
 * - Exposiciones de 15 minutos o menos se contrastan contra el STEL; el resto
 *   contra el TLV-TWA, que es una media ponderada de jornada.
 * - Nivel de acción en el 50 % del límite (criterio ACGIH): a partir de ahí
 *   corresponde vigilancia aunque todavía no se supere el límite.
 */
class EvaluacionExposicionService
{
    /** Unidades admitidas. Añadir una es tocar solo esta lista. */
    public const UNIDADES = ['ppm', 'mg/m3', 'fibras/cm3', '%'];

    /** Fracción del límite a partir de la cual corresponde vigilancia */
    private const NIVEL_ACCION = 0.5;

    /** Duración máxima, en horas, que se considera exposición corta (STEL) */
    private const HORAS_STEL = 0.25;

    /**
     * @return array{evaluacion:?string, pct_limite:?float, limite_aplicado:?string, motivo:string}
     */
    public function evaluar(
        SustanciaPeligrosa $sustancia,
        ?float $valor,
        ?string $unidad,
        ?float $duracionHoras = null
    ): array {
        if ($valor === null || $unidad === null || $unidad === '') {
            return $this->resultado(null, null, null, 'Sin medición numérica registrada.');
        }

        // 1) IDLH — peligro inmediato para la vida o la salud
        $idlh = $this->limite($sustancia, 'idlh');
        if ($idlh && $idlh['unidad'] === $unidad && $idlh['valor'] > 0 && $valor >= $idlh['valor']) {
            return $this->resultado(
                'peligro_inmediato',
                round(($valor / $idlh['valor']) * 100, 2),
                'idlh',
                "El nivel medido alcanza o supera el IDLH ({$idlh['valor']} {$unidad}). Evacuación y protección respiratoria obligatoria."
            );
        }

        // 2) STEL para exposiciones cortas, TWA para el resto
        $usarStel = $duracionHoras !== null
            && $duracionHoras > 0
            && $duracionHoras <= self::HORAS_STEL
            && $this->limite($sustancia, 'stel') !== null;

        $cual   = $usarStel ? 'stel' : 'tlv_twa';
        $limite = $this->limite($sustancia, $cual);

        if (!$limite) {
            $nombre = $usarStel ? 'STEL' : 'TLV-TWA';
            return $this->resultado(
                'no_comparable', null, null,
                "La sustancia no tiene {$nombre} definido con valor y unidad."
            );
        }

        if ($limite['unidad'] !== $unidad) {
            return $this->resultado(
                'no_comparable', null, null,
                "No comparable: la medición está en {$unidad} y el límite en {$limite['unidad']}. La conversión requiere peso molecular; regístrala en la misma unidad."
            );
        }

        if ($limite['valor'] <= 0) {
            return $this->resultado('no_comparable', null, null, 'El límite registrado no es un valor positivo.');
        }

        $pct      = round(($valor / $limite['valor']) * 100, 2);
        $etiqueta = $usarStel ? 'STEL' : 'TLV-TWA';

        if ($pct > 100) {
            return $this->resultado('sobre_limite', $pct, $cual === 'tlv_twa' ? 'twa' : 'stel',
                "Supera el {$etiqueta} ({$limite['valor']} {$unidad}): {$pct}% del límite. Requiere control inmediato.");
        }

        if ($pct >= self::NIVEL_ACCION * 100) {
            return $this->resultado('vigilancia', $pct, $cual === 'tlv_twa' ? 'twa' : 'stel',
                "Supera el nivel de acción (50% del {$etiqueta}): {$pct}% del límite. Corresponde vigilancia médica y monitoreo periódico.");
        }

        return $this->resultado('aceptable', $pct, $cual === 'tlv_twa' ? 'twa' : 'stel',
            "Dentro del {$etiqueta}: {$pct}% del límite.");
    }

    /**
     * ¿Contradice la clasificación manual a la automática?
     * No es un error a corregir sin más: puede haber criterio técnico detrás.
     * Se marca para que alguien lo mire.
     */
    public function hayDiscrepancia(?string $automatica, ?string $manual): bool
    {
        if ($automatica === null || $manual === null) return false;
        if (in_array($automatica, ['no_comparable'], true)) return false;
        if ($manual === 'sin_medicion') return false;

        $automaticaEsAlta = in_array($automatica, ['sobre_limite', 'peligro_inmediato'], true);
        $manualEsAlta     = $manual === 'sobre_limite';

        return $automaticaEsAlta !== $manualEsAlta;
    }

    /** Valor + unidad de un límite, solo si ambos están presentes */
    private function limite(SustanciaPeligrosa $s, string $cual): ?array
    {
        $valor  = $s->{"limite_{$cual}_valor"};
        $unidad = $s->{"limite_{$cual}_unidad"};

        if ($valor === null || $unidad === null || $unidad === '') return null;

        return ['valor' => (float) $valor, 'unidad' => $unidad];
    }

    private function resultado(?string $evaluacion, ?float $pct, ?string $limite, string $motivo): array
    {
        return [
            'evaluacion'      => $evaluacion,
            'pct_limite'      => $pct,
            'limite_aplicado' => $limite,
            'motivo'          => $motivo,
        ];
    }
}
