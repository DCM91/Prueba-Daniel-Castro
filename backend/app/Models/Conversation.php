<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'brief_id',
        'client_id',
        'freelancer_id',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function brief(): BelongsTo
    {
        return $this->belongsTo(Brief::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function freelancer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'freelancer_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at')->orderBy('id');
    }

    public function latestMessage(): ?Message
    {
        return $this->messages()->latest('id')->first();
    }

    public function hasParticipant(int $userId): bool
    {
        return $this->client_id === $userId || $this->freelancer_id === $userId;
    }

    public function counterpart(int $userId): int
    {
        return $this->client_id === $userId ? $this->freelancer_id : $this->client_id;
    }
}
