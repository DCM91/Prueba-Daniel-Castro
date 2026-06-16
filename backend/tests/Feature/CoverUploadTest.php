<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\Cloudinary\CloudinaryServiceFake;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class CoverUploadTest extends TestCase
{
    use RefreshDatabase;

    private function bindFakeCloudinary(array $resources = []): CloudinaryServiceFake
    {
        $fake = new CloudinaryServiceFake($resources ?: [
            'framematch/covers/42-abc' => [
                'folder' => 'framematch/covers',
                'width'  => 1600, 'height' => 320, 'format' => 'jpg', 'bytes' => 90000,
            ],
        ]);

        $this->app->instance(CloudinaryServiceInterface::class, $fake);

        return $fake;
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'public_id' => 'framematch/covers/42-abc',
            'url'       => 'https://res.cloudinary.com/demo/image/upload/v1/cover.jpg',
            'width'     => 1600,
            'height'    => 320,
            'format'    => 'jpg',
            'bytes'     => 90000,
        ], $overrides);
    }

    public function test_freelancer_can_save_cover(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/cover', $this->validPayload());

        $response->assertOk()
            ->assertJsonPath('data.cover_url', 'https://res.cloudinary.com/demo/image/upload/v1/cover.jpg')
            ->assertJsonStructure([
                'data' => [
                    'cover_url',
                    'cover_urls' => ['sm', 'md', 'lg', 'xxl'],
                ],
            ]);

        $this->assertDatabaseHas('freelancer_profiles', [
            'user_id'          => $user->id,
            'cover_public_id'  => 'framematch/covers/42-abc',
        ]);
    }

    public function test_saving_new_cover_deletes_previous_one(): void
    {
        $fake = $this->bindFakeCloudinary([
            'framematch/covers/99-new' => [
                'folder' => 'framematch/covers', 'width' => 1600, 'height' => 320, 'format' => 'jpg',
            ],
        ]);

        $user = User::factory()->freelancer()->create();
        \App\Models\FreelancerProfile::create([
            'user_id'          => $user->id,
            'cover_public_id'  => 'framematch/covers/old',
            'cover_url'        => 'https://old',
        ]);
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/cover', $this->validPayload(['public_id' => 'framematch/covers/99-new']))
            ->assertOk();

        $this->assertContains('framematch/covers/old', $fake->deleted);
    }

    public function test_client_cannot_save_cover(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->create(['role' => \App\Enums\UserRole::Client]);
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/cover', $this->validPayload())
            ->assertStatus(403);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->bindFakeCloudinary();

        $this->putJson('/api/freelancer/me/cover', $this->validPayload())
            ->assertStatus(401);
    }

    public function test_public_id_in_wrong_folder_returns_403(): void
    {
        $this->bindFakeCloudinary([
            'framematch/avatars/42' => [
                'folder' => 'framematch/avatars',
            ],
        ]);

        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/cover', $this->validPayload(['public_id' => 'framematch/avatars/42']))
            ->assertStatus(403);
    }

    public function test_freelancer_can_delete_cover(): void
    {
        $fake = $this->bindFakeCloudinary();

        $user = User::factory()->freelancer()->create();
        \App\Models\FreelancerProfile::create([
            'user_id'          => $user->id,
            'cover_public_id'  => 'framematch/covers/42-abc',
            'cover_url'        => 'https://demo/cover.jpg',
        ]);
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/freelancer/me/cover')
            ->assertOk()
            ->assertJsonPath('data.cover_url', null)
            ->assertJsonPath('data.cover_urls', null);

        $this->assertContains('framematch/covers/42-abc', $fake->deleted);
    }

    public function test_deleting_cover_when_none_set_still_returns_200(): void
    {
        $this->bindFakeCloudinary();

        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/freelancer/me/cover')
            ->assertOk();
    }
}
