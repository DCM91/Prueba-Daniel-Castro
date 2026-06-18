<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BriefStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Brief extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'title',
        'description',
        'category',
        'city',
        'budget_min',
        'budget_max',
        'deadline',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'budget_min'   => 'decimal:2',
            'budget_max'   => 'decimal:2',
            'deadline'     => 'date',
            'status'       => BriefStatus::class,
            'published_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function proposals(): HasMany
    {
        return $this->hasMany(Proposal::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(BriefAttachment::class)->orderBy('position')->orderByDesc('id');
    }

    public function conversation(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Conversation::class);
    }

    public function reviews(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Review::class);
    }
}
