<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SkillCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Skill extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'category',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'category'  => SkillCategory::class,
        ];
    }

    public function freelancers(): BelongsToMany
    {
        return $this->belongsToMany(FreelancerProfile::class, 'freelancer_skill')
            ->withPivot(['level', 'years_experience'])
            ->withTimestamps();
    }
}
