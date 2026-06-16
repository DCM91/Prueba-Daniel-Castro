<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FreelancerProfile;
use App\Models\User;
use App\Services\Cloudinary\CloudinaryServiceFake;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class PortfolioTest extends TestCase
{
    use RefreshDatabase;

    private function bindFakeCloudinary(array $extraResources = []): CloudinaryServiceFake
    {
        $fake = new CloudinaryServiceFake(array_merge([
            'framematch/portfolios/1' => [
                'folder' => 'framematch/portfolios', 'width' => 800, 'height' => 600,
                'format' => 'jpg', 'bytes' => 50000,
            ],
        ], $extraResources));

        $this->app->instance(CloudinaryServiceInterface::class, $fake);

        return $fake;
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'public_id'   => 'framematch/portfolios/1',
            'url'         => 'https://res.cloudinary.com/demo/portfolio/1.jpg',
            'width'       => 800,
            'height'      => 600,
            'format'      => 'jpg',
            'bytes'       => 50000,
            'title'       => 'Trabajo destacado',
            'description' => 'Un proyecto bonito',
        ], $overrides);
    }

    public function test_freelancer_can_add_portfolio_item(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload())
            ->assertStatus(201)
            ->assertJsonPath('data.public_id', 'framematch/portfolios/1')
            ->assertJsonStructure([
                'data' => [
                    'id', 'public_id', 'url',
                    'urls' => ['thumb', 'card', 'full'],
                    'width', 'height', 'format', 'bytes',
                    'title', 'description', 'position', 'created_at',
                ],
            ]);

        $this->assertDatabaseHas('portfolios', [
            'public_id' => 'framematch/portfolios/1',
            'title'     => 'Trabajo destacado',
            'position'  => 0,
        ]);
    }

    public function test_portfolio_position_increments(): void
    {
        $this->bindFakeCloudinary([
            'framematch/portfolios/1' => ['folder' => 'framematch/portfolios', 'format' => 'jpg'],
            'framematch/portfolios/2' => ['folder' => 'framematch/portfolios', 'format' => 'jpg'],
        ]);

        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload())
            ->assertJsonPath('data.position', 0);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload(['public_id' => 'framematch/portfolios/2']))
            ->assertJsonPath('data.position', 1);
    }

    public function test_client_cannot_add_portfolio_item(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->create(['role' => \App\Enums\UserRole::Client]);
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload())
            ->assertStatus(403);
    }

    public function test_invalid_public_id_returns_403(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload(['public_id' => 'framematch/avatars/42']))
            ->assertStatus(403);
    }

    public function test_invalid_payload_returns_422(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', [
                'public_id' => '',
                'title'     => str_repeat('a', 121),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['public_id', 'title', 'url']);
    }

    public function test_freelancer_can_update_title_and_description(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload())
            ->assertStatus(201);

        $portfolio = \App\Models\Portfolio::firstOrFail();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/freelancer/me/portfolios/{$portfolio->id}", [
                'title'       => 'Nuevo título',
                'description' => 'Nueva descripción',
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Nuevo título')
            ->assertJsonPath('data.description', 'Nueva descripción');
    }

    public function test_freelancer_can_reorder_portfolio_items(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload())
            ->assertStatus(201);

        $portfolio = \App\Models\Portfolio::firstOrFail();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/freelancer/me/portfolios/{$portfolio->id}", [
                'position' => 5,
            ])
            ->assertOk()
            ->assertJsonPath('data.position', 5);
    }

    public function test_freelancer_can_delete_portfolio_item(): void
    {
        $fake = $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload())
            ->assertStatus(201);

        $portfolio = \App\Models\Portfolio::firstOrFail();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/freelancer/me/portfolios/{$portfolio->id}")
            ->assertOk();

        $this->assertContains('framematch/portfolios/1', $fake->deleted);
        $this->assertDatabaseMissing('portfolios', ['id' => $portfolio->id]);
    }

    public function test_reorder_endpoint_reassigns_positions(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload())
            ->assertStatus(201);

        $portfolio = \App\Models\Portfolio::firstOrFail();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios/reorder', [
                'ids' => [$portfolio->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.0.position', 0);
    }

    public function test_public_endpoint_returns_portfolios_for_freelancer(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $profile = FreelancerProfile::create(['user_id' => $user->id]);
        \App\Models\Portfolio::create([
            'freelancer_profile_id' => $profile->id,
            'public_id'             => 'framematch/portfolios/99',
            'url'                   => 'https://demo/p.jpg',
            'position'              => 0,
        ]);

        $this->getJson("/api/freelancers/{$profile->id}/portfolios")
            ->assertOk()
            ->assertJsonPath('data.0.public_id', 'framematch/portfolios/99')
            ->assertJsonPath('data.0.urls.card', 'https://res.cloudinary.com/fake-cloud/image/upload/w_400,h_300,c_fill,q_auto,f_auto/framematch/portfolios/99');
    }

    public function test_list_my_portfolios(): void
    {
        $this->bindFakeCloudinary();
        $user = User::factory()->freelancer()->create();
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/freelancer/me/portfolios', $this->validPayload())
            ->assertStatus(201);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/freelancer/me/portfolios')
            ->assertOk()
            ->assertJsonPath('data.0.public_id', 'framematch/portfolios/1');
    }
}
