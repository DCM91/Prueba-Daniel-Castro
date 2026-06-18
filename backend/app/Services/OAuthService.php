<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OAuthProvider;
use App\Models\User;
use Laravel\Socialite\Contracts\User as SocialiteUserContract;

final class OAuthService
{
    public function __construct(private readonly OAuthIdentityService $identityService)
    {
    }

    /**
     * @return array{0: User, 1: bool}
     */
    public function findOrCreateUser(
        OAuthProvider $provider,
        string $oauthId,
        string $email,
        bool $emailVerified,
        string $name,
        ?string $avatarUrl,
    ): array {
        $identity = $this->identityService->findByProvider($provider, $oauthId);
        if ($identity !== null) {
            $identityRecord = $this->identityService->findIdentityByProvider($provider, $oauthId);
            if ($identityRecord !== null) {
                $this->identityService->markUsed($identityRecord);
            }
            return [$identity, false];
        }

        $user = $email !== '' ? User::query()->where('email', $email)->first() : null;
        if ($user !== null) {
            if (! $emailVerified) {
                abort(422, 'El email del proveedor no está verificado.');
            }
        }

        $stub = new class($oauthId, $email, $name, $avatarUrl) implements SocialiteUserContract {
            public function __construct(
                public string $id,
                public string $emailValue,
                public string $nameValue,
                public ?string $avatarValue,
            ) {
            }

            public function getId(): mixed
            {
                return $this->id;
            }

            public function getNickname(): ?string
            {
                return null;
            }

            public function getName(): ?string
            {
                return $this->nameValue;
            }

            public function getEmail(): ?string
            {
                return $this->emailValue;
            }

            public function getAvatar(): ?string
            {
                return $this->avatarValue;
            }
        };
        $stub->token = null;

        $result = $this->identityService->findOrCreateUserFromSocialite($stub, $provider);
        return [$result['user'], $result['isNewUser']];
    }
}
