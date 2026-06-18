<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\FreelancerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class OnboardingEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function authHeaders(User $user): array
    {
        $token = JWTAuth::fromUser($user);

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->postJson('/api/me/onboarding-complete');

        $response->assertStatus(401);
    }

    public function test_client_role_returns_403(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/me/onboarding-complete');

        $response->assertStatus(403);
    }

    public function test_agency_role_returns_403(): void
    {
        $user = User::factory()->create(['role' => UserRole::Agency]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/me/onboarding-complete');

        $response->assertStatus(403);
    }

    public function test_freelancer_with_no_profile_creates_one_and_marks_complete(): void
    {
        $user = User::factory()->create(['role' => UserRole::Freelancer]);

        $this->assertDatabaseMissing('freelancer_profiles', ['user_id' => $user->id]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/me/onboarding-complete');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['onboarding_completed_at']]);

        $this->assertDatabaseHas('freelancer_profiles', [
            'user_id' => $user->id,
        ]);
        $profile = FreelancerProfile::where('user_id', $user->id)->first();
        $this->assertNotNull($profile->onboarding_completed_at);
    }

    public function test_freelancer_with_existing_profile_keeps_first_timestamp(): void
    {
        $user = User::factory()->create(['role' => UserRole::Freelancer]);
        $profile = FreelancerProfile::factory()->create([
            'user_id'               => $user->id,
            'onboarding_completed_at' => now()->subDays(7),
        ]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/me/onboarding-complete');

        $response->assertStatus(200);
        $profile->refresh();
        $this->assertEquals(
            now()->subDays(7)->toIso8601String(),
            $profile->onboarding_completed_at->toIso8601String(),
        );
    }
}
