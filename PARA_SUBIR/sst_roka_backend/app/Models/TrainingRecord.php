<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingRecord extends Model
{
    protected $fillable = [
        'opl_id',
        'name',
        'date',
        'signature_path',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function opl(): BelongsTo
    {
        return $this->belongsTo(Opl::class);
    }

    public function getSignatureUrlAttribute(): ?string
    {
        return $this->signature_path ? asset('storage/' . $this->signature_path) : null;
    }
}
