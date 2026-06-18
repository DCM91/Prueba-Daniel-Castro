<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use App\Models\User;
use App\Models\UserOAuthIdentity;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Socialite\Contracts\User as SocialiteUserContract;

final class OAuthIdentityService
{
    public function findByProvider(OAuthProvider $provider, string $providerUserId): ?User
    {
        $identity = UserOAuthIdentity::query()
            ->where('provider', $provider->value)
            ->where('provider_user_id', $providerUserId)
            ->first();

        return $identity?->user;
    }

    public function findIdentityByProvider(OAuthProvider $provider, string $providerUserId): ?UserOAuthIdentity
    {
        return UserOAuthIdentity::query()
            ->where('provider', $provider->value)
            ->where('provider_user_id', $providerUserId)
            ->first();
    }

    /**
     * @return array{user: User, identity: UserOAuthIdentity, isNewUser: bool, isNewIdentity: bool}
     */
    public function findOrCreateUserFromSocialite(
        SocialiteUserContract $socialite,
        OAuthProvider $provider,
    ): array {
        $providerUserId = (string) $socialite->getId();
        $email          = $socialite->getEmail();
        $name           = (string) ($socialite->getName() ?: $socialite->getNickname() ?: 'Usuario');
        $avatar         = method_exists($socialite, 'getAvatar') ? $socialite->getAvatar() : null;
        $emailVerified  = true;

        return DB::transaction(function () use (
            $socialite, $provider, $providerUserId, $email, $name, $avatar, $emailVerified
        ) {
            $existingIdentity = $this->findIdentityByProvider($provider, $providerUserId);
            if ($existingIdentity !== null) {
                $this->updateIdentityFromSocialite($existingIdentity, $socialite, $email, $avatar);
                $this->refreshUserFromSocialite($existingIdentity->user, $name, $avatar, $emailVerified);
                return [
                    'user'          => $existingIdentity->user,
                    'identity'      => $existingIdentity,
                    'isNewUser'     => false,
                    'isNewIdentity' => false,
                ];
            }

            if (is_string($email) && $email !== '') {
                $user = User::query()->where('email', $email)->first();
                if ($user !== null) {
                    if (! $emailVerified) {
                        abort(422, 'El email del proveedor no está verificado.');
                    }
                    $identity = $this->linkIdentityToUser($user, $provider, $providerUserId, $socialite, $email, $avatar);
                    $this->refreshUserFromSocialite($user, $name, $avatar, $emailVerified);
                    return [
                        'user'          => $user,
                        'identity'      => $identity,
                        'isNewUser'     => false,
                        'isNewIdentity' => true,
                    ];
                }
            }

            $user = User::create([
                'name'              => $name,
                'email'             => is_string($email) && $email !== '' ? $email : "{$provider->value}-{$providerUserId}@framematch.local",
                'role'              => UserRole::Client,
                'password'          => null,
                'avatar_url'        => is_string($avatar) ? $avatar : null,
                'email_verified_at' => $emailVerified ? Carbon::now() : null,
            ]);

            $identity = $this->linkIdentityToUser($user, $provider, $providerUserId, $socialite, $email, $avatar);

            return [
                'user'          => $user,
                'identity'      => $identity,
                'isNewUser'     => true,
                'isNewIdentity' => true,
            ];
        });
    }

    public function linkIdentityToUser(
        User $user,
        OAuthProvider $provider,
        string $providerUserId,
        SocialiteUserContract $socialite,
        ?string $email = null,
        ?string $avatar = null,
    ): UserOAuthIdentity {
        $existing = UserOAuthIdentity::query()
            ->where('user_id', $user->id)
            ->where('provider', $provider->value)
            ->first();

        if ($existing !== null) {
            $this->updateIdentityFromSocialite($existing, $socialite, $email, $avatar);
            return $existing;
        }

        if (UserOAuthIdentity::query()
            ->where('provider', $provider->value)
            ->where('provider_user_id', $providerUserId)
            ->exists()) {
            abort(422, 'Este proveedor ya está vinculado a otra cuenta.');
        }

        $tokenExpiresAt = null;
        if (method_exists($socialite, 'getExpiresIn') && $socialite->getExpiresIn() !== null) {
            $tokenExpiresAt = Carbon::now()->addSeconds((int) $socialite->getExpiresIn());
        }

        return UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => $provider,
            'provider_user_id' => $providerUserId,
            'access_token'     => $socialite->token ?? null,
            'refresh_token'    => property_exists($socialite, 'refreshToken') ? $socialite->refreshToken : null,
            'token_expires_at' => $tokenExpiresAt,
            'scopes'           => property_exists($socialite, 'approvedScopes') ? $socialite->approvedScopes : null,
            'provider_email'   => is_string($email) ? $email : null,
            'linked_at'        => Carbon::now(),
        ]);
    }

    public function unlinkProvider(User $user, OAuthProvider $provider): bool
    {
        $identity = $user->oauthIdentities()
            ->where('provider', $provider->value)
            ->first();

        if ($identity === null) {
            return false;
        }

        if (! $user->hasPassword() && $user->oauthIdentities()->count() <= 1) {
            abort(422, 'No puedes desvincular tu único método de inicio de sesión. Añade una contraseña primero.');
        }

        $identity->delete();
        return true;
    }

    public function markUsed(UserOAuthIdentity $identity): void
    {
        $identity->forceFill(['last_used_at' => Carbon::now()])->save();
    }

    private function updateIdentityFromSocialite(
        UserOAuthIdentity $identity,
        SocialiteUserContract $socialite,
        ?string $email,
        ?string $avatar,
    ): void {
        $updates = [];

        if ($socialite->token !== null) {
            $updates['access_token'] = $socialite->token;
        }
        if (property_exists($socialite, 'refreshToken') && $socialite->refreshToken !== null) {
            $updates['refresh_token'] = $socialite->refreshToken;
        }
        if (method_exists($socialite, 'getExpiresIn') && $socialite->getExpiresIn() !== null) {
            $updates['token_expires_at'] = Carbon::now()->addSeconds((int) $socialite->getExpiresIn());
        }
        if (is_string($email) && $email !== '') {
            $updates['provider_email'] = $email;
        }
        if (is_string($avatar) && $avatar !== '') {
            $updates['provider_email'] = $updates['provider_email'] ?? $identity->provider_email;
        }
        $updates['last_used_at'] = Carbon::now();

        $identity->fill($updates)->save();
    }

    private function refreshUserFromSocialite(User $user, string $name, ?string $avatarUrl, bool $emailVerified): void
    {
        $user->name = $name;
        if ($avatarUrl !== null && $user->avatar_public_id === null) {
            $user->avatar_url = $avatarUrl;
        }
        if ($emailVerified && $user->email_verified_at === null) {
            $user->email_verified_at = Carbon::now();
        }
        $user->save();
    }
}
