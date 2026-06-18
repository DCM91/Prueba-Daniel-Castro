<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use App\Models\User;
use App\Models\UserOAuthIdentity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class OAuthIdentityTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(array $overrides = []): array
    {
        $user = User::create(array_merge([
            'name'     => 'OAuth User',
            'email'    => 'oauth.user@example.com',
            'role'     => UserRole::Client,
            'password' => null,
        ], $overrides));
        $token = JWTAuth::fromUser($user);
        return [$user, $token];
    }

    public function test_list_identities_returns_empty_for_user_without_providers(): void
    {
        [$user, $token] = $this->makeUser();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me/oauth-identities')
            ->assertStatus(200)
            ->assertJson(['data' => []]);
    }

    public function test_list_identities_returns_linked_providers(): void
    {
        [$user, $token] = $this->makeUser();
        UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => OAuthProvider::Google,
            'provider_user_id' => 'google-1',
            'provider_email'   => 'g@example.com',
            'linked_at'        => now(),
        ]);
        UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => OAuthProvider::Facebook,
            'provider_user_id' => 'fb-1',
            'provider_email'   => 'fb@example.com',
            'linked_at'        => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me/oauth-identities')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'provider', 'provider_label', 'provider_email', 'linked_at', 'last_used_at'],
                ],
            ]);

        $data = $response->json('data');
        $this->assertCount(2, $data);
        $providers = array_column($data, 'provider');
        sort($providers);
        $this->assertSame(['facebook', 'google'], $providers);
    }

    public function test_list_identities_requires_auth(): void
    {
        $this->getJson('/api/me/oauth-identities')->assertStatus(401);
    }

    public function test_unlink_existing_provider(): void
    {
        [$user, $token] = $this->makeUser(['password' => Hash::make('validpass1')]);
        UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => OAuthProvider::Google,
            'provider_user_id' => 'google-unlink',
            'linked_at'        => now(),
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/me/oauth-identities/google')
            ->assertStatus(200)
            ->assertJsonPath('message', 'Cuenta desvinculada.');

        $this->assertDatabaseMissing('user_oauth_identities', [
            'user_id'  => $user->id,
            'provider' => OAuthProvider::Google->value,
        ]);
    }

    public function test_unlink_unknown_provider_returns_404(): void
    {
        [$user, $token] = $this->makeUser();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/me/oauth-identities/google')
            ->assertStatus(404);
    }

    public function test_unlink_invalid_provider_returns_404(): void
    {
        [$user, $token] = $this->makeUser();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/me/oauth-identities/twitter')
            ->assertStatus(404);
    }

    public function test_unlink_only_oauth_provider_with_no_password_returns_422(): void
    {
        [$user, $token] = $this->makeUser(['password' => null]);
        UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => OAuthProvider::Google,
            'provider_user_id' => 'google-only',
            'linked_at'        => now(),
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/me/oauth-identities/google')
            ->assertStatus(422)
            ->assertJsonPath('message', 'No puedes desvincular tu único método de inicio de sesión. Añade una contraseña primero.');

        $this->assertDatabaseHas('user_oauth_identities', [
            'user_id'  => $user->id,
            'provider' => OAuthProvider::Google->value,
        ]);
    }

    public function test_unlink_one_of_multiple_oauth_providers_succeeds(): void
    {
        [$user, $token] = $this->makeUser(['password' => null]);
        UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => OAuthProvider::Google,
            'provider_user_id' => 'google-1',
            'linked_at'        => now(),
        ]);
        UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => OAuthProvider::Facebook,
            'provider_user_id' => 'fb-1',
            'linked_at'        => now(),
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/me/oauth-identities/google')
            ->assertStatus(200);

        $this->assertDatabaseMissing('user_oauth_identities', [
            'user_id'  => $user->id,
            'provider' => OAuthProvider::Google->value,
        ]);
        $this->assertDatabaseHas('user_oauth_identities', [
            'user_id'  => $user->id,
            'provider' => OAuthProvider::Facebook->value,
        ]);
    }

    public function test_unlink_requires_auth(): void
    {
        $this->deleteJson('/api/me/oauth-identities/google')->assertStatus(401);
    }

    public function test_user_with_password_is_not_oauth_only(): void
    {
        [$user] = $this->makeUser(['password' => Hash::make('validpass1')]);
        UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => OAuthProvider::Google,
            'provider_user_id' => 'g-1',
            'linked_at'        => now(),
        ]);
        $user->refresh();

        $this->assertTrue($user->hasPassword());
        $this->assertFalse($user->isOAuthOnly());
        $this->assertTrue($user->hasOAuthProvider(OAuthProvider::Google));
    }

    public function test_oauth_only_user_is_detected(): void
    {
        [$user] = $this->makeUser(['password' => null]);
        UserOAuthIdentity::create([
            'user_id'          => $user->id,
            'provider'         => OAuthProvider::Google,
            'provider_user_id' => 'g-1',
            'linked_at'        => now(),
        ]);
        $user->refresh();

        $this->assertFalse($user->hasPassword());
        $this->assertTrue($user->isOAuthOnly());
    }
}
