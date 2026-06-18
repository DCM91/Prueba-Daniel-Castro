<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OAuthProvider;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class UserOAuthIdentity extends Model
{
    use HasFactory;

    protected $table = 'user_oauth_identities';

    protected $fillable = [
        'user_id',
        'provider',
        'provider_user_id',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'scopes',
        'provider_email',
        'linked_at',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'provider'         => OAuthProvider::class,
            'scopes'           => 'array',
            'linked_at'        => 'datetime',
            'last_used_at'     => 'datetime',
            'token_expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
