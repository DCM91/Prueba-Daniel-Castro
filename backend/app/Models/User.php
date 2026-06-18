<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'phone',
        'city',
        'password',
        'email_verified_at',
        'avatar_url',
        'avatar_public_id',
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

    public function oauthIdentities(): HasMany
    {
        return $this->hasMany(UserOAuthIdentity::class);
    }

    public function clientConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'client_id');
    }

    public function freelancerConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'freelancer_id');
    }

    public function sentMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function reviewsAuthored(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    public function reviewsReceived(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewee_id');
    }

    public function isFreelancer(): bool
    {
        return $this->role === UserRole::Freelancer;
    }

    public function isClient(): bool
    {
        return $this->role === UserRole::Client;
    }

    public function hasPassword(): bool
    {
        return $this->password !== null && $this->password !== '';
    }

    public function isOAuthOnly(): bool
    {
        return ! $this->hasPassword() && $this->oauthIdentities()->exists();
    }

    public function hasOAuthProvider(OAuthProvider $provider): bool
    {
        return $this->oauthIdentities()
            ->where('provider', $provider->value)
            ->exists();
    }
}
