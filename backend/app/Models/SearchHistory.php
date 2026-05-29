<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class SearchHistory extends Model
{
    use HasFactory;

    protected $fillable = ['term', 'results_count'];

    public const UPDATED_AT = null;

    protected $casts = [
        'results_count' => 'integer',
        'created_at' => 'datetime',
    ];

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->orderByDesc('created_at');
    }

    public function scopeRecent(Builder $query, int $limit = 50): Builder
    {
        return $query->latestFirst()->limit($limit);
    }
}