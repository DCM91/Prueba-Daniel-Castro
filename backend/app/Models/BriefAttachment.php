<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class BriefAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'brief_id',
        'public_id',
        'url',
        'width',
        'height',
        'format',
        'bytes',
        'title',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'width'    => 'integer',
            'height'   => 'integer',
            'bytes'    => 'integer',
            'position' => 'integer',
        ];
    }

    public function brief(): BelongsTo
    {
        return $this->belongsTo(Brief::class);
    }
}
