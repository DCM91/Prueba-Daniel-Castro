<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

final class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'role',
        'email',
        'password',
        'email_verified_at',
        'avatar_url',
        'avatar_public_id',
        'oauth_provider',
        'oauth_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'role'              => UserRole::class,
            'oauth_provider'    => OAuthProvider::class,
        ];
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'role' => $this->role->value,
        ];
    }

    public function freelancerProfile(): HasOne
    {
        return $this->hasOne(FreelancerProfile::class);
    }

    public function isFreelancer(): bool
    {
        return $this->role === UserRole::Freelancer;
    }

    public function isClient(): bool
    {
        return $this->role === UserRole::Client;
    }

    public function isOAuthUser(): bool
    {
        return $this->oauth_provider instanceof OAuthProvider
            && !empty($this->oauth_id);
    }
}
