<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\FreelancerProfile;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class ProfileCompletionEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function authHeaders(User $user): array
    {
        $token = JWTAuth::fromUser($user);

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/me/completion');

        $response->assertStatus(401);
    }

    public function test_client_role_returns_zero_with_profile_missing_key(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/me/completion');

        $response->assertStatus(200)
            ->assertJson(['pct' => 0, 'missing' => ['profile']]);
    }

    public function test_agency_role_returns_zero_with_profile_missing_key(): void
    {
        $user = User::factory()->create(['role' => UserRole::Agency]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/me/completion');

        $response->assertStatus(200)
            ->assertJson(['pct' => 0, 'missing' => ['profile']]);
    }

    public function test_freelancer_with_no_profile_row_returns_zero_with_profile_missing_key(): void
    {
        $user = User::factory()->create(['role' => UserRole::Freelancer]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/me/completion');

        $response->assertStatus(200)
            ->assertJson(['pct' => 0, 'missing' => ['profile']]);
    }

    public function test_empty_freelancer_profile_returns_zero_with_all_keys(): void
    {
        $user = User::factory()->create([
            'role'              => UserRole::Freelancer,
            'city'              => null,
            'avatar_public_id'  => null,
        ]);
        FreelancerProfile::factory()->create([
            'user_id'           => $user->id,
            'display_name'      => null,
            'bio'               => null,
            'hourly_rate'       => null,
            'price_per_project' => null,
            'is_available'      => false,
            'cover_public_id'   => null,
        ]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/me/completion');

        $response->assertStatus(200)
            ->assertJsonPath('pct', 0)
            ->assertJsonPath('missing', [
                'display_name', 'bio', 'city', 'hourly_rate', 'price_per_project',
                'is_available', 'skills', 'avatar', 'cover', 'portfolio',
            ]);
    }

    public function test_full_freelancer_profile_returns_100(): void
    {
        $user = User::factory()->create([
            'role'              => UserRole::Freelancer,
            'city'              => 'Madrid',
            'avatar_public_id'  => 'framematch/avatars/abc',
        ]);
        $profile = FreelancerProfile::factory()->create([
            'user_id'           => $user->id,
            'display_name'      => 'Lucia Marin',
            'bio'               => 'Bio...',
            'hourly_rate'       => 50.0,
            'price_per_project' => 300.0,
            'is_available'      => true,
            'cover_public_id'   => 'framematch/covers/xyz',
        ]);
        $profile->skills()->attach(Skill::query()->firstOrCreate(
            ['slug' => 'foto-de-retrato'],
            ['name' => 'Foto de retrato', 'category' => 'photo', 'is_active' => true]
        ), ['level' => 'senior', 'years_experience' => 5]);
        for ($i = 0; $i < 3; $i++) {
            $profile->portfolios()->create([
                'public_id' => "framematch/portfolios/p{$i}",
                'url'       => "https://x/{$i}.jpg",
                'width'     => 1920,
                'height'    => 1080,
                'format'    => 'jpg',
                'bytes'     => 1000,
                'position'  => $i,
            ]);
        }
        $profile->load(['skills', 'portfolios']);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/me/completion');

        $response->assertStatus(200)
            ->assertJson(['pct' => 100, 'missing' => []]);
    }
}
