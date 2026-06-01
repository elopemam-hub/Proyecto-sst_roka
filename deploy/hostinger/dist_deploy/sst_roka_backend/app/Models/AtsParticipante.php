<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AtsParticipante extends Model
{
    protected $table = 'ats_participantes';

    protected $fillable = [
        'ats_id',
        'personal_id',
        'rol',
        'firmado_en',
    ];

    protected $casts = [
        'firmado_en' => 'datetime',
    ];

    public function ats(): BelongsTo
    {
        return $this->belongsTo(Ats::class);
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }

    public function getYaFirmoAttribute(): bool
    {
        return $this->firmado_en !== null;
    }
}
