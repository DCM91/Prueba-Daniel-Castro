<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class OAuthService
{
    public function findOrCreateUser(
        OAuthProvider $provider,
        string $oauthId,
        string $email,
        bool $emailVerified,
        string $name,
        ?string $avatarUrl,
    ): array {
        return DB::transaction(function () use ($provider, $oauthId, $email, $emailVerified, $name, $avatarUrl) {
            $user = User::query()
                ->where('oauth_provider', $provider->value)
                ->where('oauth_id', $oauthId)
                ->first();

            if ($user !== null) {
                $this->refreshFromProvider($user, $name, $avatarUrl, $emailVerified);
                return [$user, false];
            }

            $user = User::query()->where('email', $email)->first();

            if ($user !== null) {
                if (! $emailVerified) {
                    abort(422, 'El email del proveedor no está verificado.');
                }
                $user->oauth_provider = $provider;
                $user->oauth_id       = $oauthId;
                $this->refreshFromProvider($user, $name, $avatarUrl, $emailVerified);
                return [$user, false];
            }

            $user = User::create([
                'name'              => $name,
                'email'             => $email,
                'role'              => UserRole::Client,
                'password'          => null,
                'avatar_url'        => $avatarUrl,
                'oauth_provider'    => $provider,
                'oauth_id'          => $oauthId,
                'email_verified_at' => $emailVerified ? Carbon::now() : null,
            ]);

            return [$user, true];
        });
    }

    private function refreshFromProvider(User $user, string $name, ?string $avatarUrl, bool $emailVerified): void
    {
        $user->name = $name;
        if ($avatarUrl !== null) {
            $user->avatar_url = $avatarUrl;
        }
        if ($emailVerified && $user->email_verified_at === null) {
            $user->email_verified_at = Carbon::now();
        }
        $user->save();
    }
}
