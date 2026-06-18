<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class FreelancerProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'display_name',
        'bio',
        'hourly_rate',
        'price_per_project',
        'is_available',
        'cover_url',
        'cover_public_id',
    ];

    protected function casts(): array
    {
        return [
            'hourly_rate'       => 'decimal:2',
            'price_per_project' => 'decimal:2',
            'is_available'      => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'freelancer_skill')
            ->withPivot(['level', 'years_experience'])
            ->withTimestamps();
    }

    public function portfolios(): HasMany
    {
        return $this->hasMany(Portfolio::class)->orderBy('position')->orderByDesc('id');
    }
}
