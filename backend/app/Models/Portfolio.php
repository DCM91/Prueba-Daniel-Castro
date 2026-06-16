<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Portfolio extends Model
{
    use HasFactory;

    protected $fillable = [
        'freelancer_profile_id',
        'public_id',
        'url',
        'width',
        'height',
        'format',
        'bytes',
        'title',
        'description',
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

    public function freelancerProfile(): BelongsTo
    {
        return $this->belongsTo(FreelancerProfile::class);
    }
}
