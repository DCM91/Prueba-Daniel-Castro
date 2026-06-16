<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\Cloudinary\CloudinaryServiceFake;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class AvatarUploadTest extends TestCase
{
    use RefreshDatabase;

    private function bindFakeCloudinary(array $resources = []): CloudinaryServiceFake
    {
        $fake = new CloudinaryServiceFake($resources ?: [
            'framematch/avatars/42-abc123' => [
                'folder' => 'framematch/avatars',
                'width'  => 800,
                'height' => 800,
                'format' => 'jpg',
                'bytes'  => 12345,
            ],
        ]);

        $this->app->instance(CloudinaryServiceInterface::class, $fake);

        return $fake;
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'public_id' => 'framematch/avatars/42-abc123',
            'url'       => 'https://res.cloudinary.com/demo/image/upload/v1/abc.jpg',
            'width'     => 800,
            'height'    => 800,
            'format'    => 'jpg',
            'bytes'     => 12345,
        ], $overrides);
    }

    public function test_authenticated_user_can_save_avatar(): void
    {
        $fake = $this->bindFakeCloudinary();
        $user = User::factory()->create();
        $token = JWTAuth::fromUser($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/me/avatar', $this->validPayload());

        $response->assertOk()
            ->assertJsonPath('data.avatar_url', 'https://res.cloudinary.com/demo/image/upload/v1/abc.jpg')
            ->assertJsonPath('data.avatar_urls.md', 'https://res.cloudinary.com/fake-cloud/image/upload/w_200,h_200,c_fill,g_auto,r_max,q_auto,f_auto/framematch/avatars/42-abc123')
            ->assertJsonStructure([
                'data' => [
                    'id', 'name', 'email', 'role',
                    'avatar_url',
                    'avatar_urls' => ['xs', 'sm', 'md', 'lg', 'xxl'],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id'                => $user->id,
            'avatar_public_id'  => 'framematch/avatars/42-abc123',
            'avatar_url'        => 'https://res.cloudinary.com/demo/image/upload/v1/abc.jpg',
        ]);
    }

    public function test_saving_new_avatar_deletes_previous_one(): void
    {
        $fake = $this->bindFakeCloudinary([
            'framematch/avatars/new-xyz' => [
                'folder' => 'framematch/avatars',
                'width'  => 800, 'height' => 800, 'format' => 'jpg', 'bytes' => 9999,
            ],
        ]);

        $user = User::factory()->create([
            'avatar_public_id' => 'framematch/avatars/old-pqr',
            'avatar_url'       => 'https://res.cloudinary.com/demo/old.jpg',
        ]);
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/me/avatar', $this->validPayload(['public_id' => 'framematch/avatars/new-xyz']))
            ->assertOk();

        $this->assertContains('framematch/avatars/old-pqr', $fake->deleted);
        $this->assertDatabaseHas('users', [
            'id'               => $user->id,
            'avatar_public_id' => 'framematch/avatars/new-xyz',
        ]);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->bindFakeCloudinary();

        $this->postJson('/api/me/avatar', $this->validPayload())
            ->assertStatus(401);
    }

    public function test_invalid_payload_returns_422(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/me/avatar', [
                'public_id' => '',
                'url'       => 'not-a-url',
                'bytes'     => 99999999,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['public_id', 'url', 'bytes']);
    }

    public function test_public_id_in_wrong_folder_returns_403(): void
    {
        $this->bindFakeCloudinary([
            'framematch/portfolios/99' => [
                'folder' => 'framematch/portfolios',
            ],
        ]);

        $user = User::factory()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/me/avatar', $this->validPayload(['public_id' => 'framematch/portfolios/99']))
            ->assertStatus(403)
            ->assertJsonPath('message', 'El recurso no pertenece a la carpeta esperada.');

        $this->assertDatabaseHas('users', [
            'id'               => $user->id,
            'avatar_public_id' => null,
        ]);
    }

    public function test_admin_api_returns_leaf_only_folder_still_accepted(): void
    {
        $this->bindFakeCloudinary([
            'framematch/avatars/leaf-abc' => [
                'folder'    => 'avatars',
                'public_id' => 'framematch/avatars/leaf-abc',
                'width'     => 800, 'height' => 800, 'format' => 'jpg', 'bytes' => 12345,
            ],
        ]);

        $user = User::factory()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/me/avatar', $this->validPayload(['public_id' => 'framematch/avatars/leaf-abc']))
            ->assertOk()
            ->assertJsonPath('data.avatar_urls.md', 'https://res.cloudinary.com/fake-cloud/image/upload/w_200,h_200,c_fill,g_auto,r_max,q_auto,f_auto/framematch/avatars/leaf-abc');

        $this->assertDatabaseHas('users', [
            'id'               => $user->id,
            'avatar_public_id' => 'framematch/avatars/leaf-abc',
        ]);
    }

    public function test_admin_api_returns_wrong_leaf_folder_returns_403(): void
    {
        $this->bindFakeCloudinary([
            'framematch/portfolios/leak' => [
                'folder'    => 'portfolios',
                'public_id' => 'framematch/portfolios/leak',
            ],
        ]);

        $user = User::factory()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/me/avatar', $this->validPayload(['public_id' => 'framematch/portfolios/leak']))
            ->assertStatus(403)
            ->assertJsonPath('message', 'El recurso no pertenece a la carpeta esperada.');
    }

    public function test_nonexistent_public_id_returns_403(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/me/avatar', $this->validPayload(['public_id' => 'framematch/avatars/does-not-exist']))
            ->assertStatus(403)
            ->assertJsonPath('message', 'El recurso no existe en Cloudinary.');

        $this->assertDatabaseHas('users', [
            'id'               => $user->id,
            'avatar_public_id' => null,
        ]);
    }

    public function test_authenticated_user_can_delete_avatar(): void
    {
        $fake = $this->bindFakeCloudinary();

        $user = User::factory()->create([
            'avatar_public_id' => 'framematch/avatars/42-abc123',
            'avatar_url'       => 'https://res.cloudinary.com/demo/x.jpg',
        ]);
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/me/avatar')
            ->assertOk()
            ->assertJsonPath('data.avatar_url', null)
            ->assertJsonPath('data.avatar_urls', null);

        $this->assertContains('framematch/avatars/42-abc123', $fake->deleted);
        $this->assertDatabaseHas('users', [
            'id'               => $user->id,
            'avatar_public_id' => null,
            'avatar_url'       => null,
        ]);
    }

    public function test_deleting_avatar_when_none_set_still_returns_200(): void
    {
        $this->bindFakeCloudinary();

        $user = User::factory()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/me/avatar')
            ->assertOk()
            ->assertJsonPath('data.avatar_url', null);
    }

    public function test_delete_avatar_without_auth_returns_401(): void
    {
        $this->bindFakeCloudinary();

        $this->deleteJson('/api/me/avatar')
            ->assertStatus(401);
    }
}
