<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class UserTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_returns_true_when_user_is_freelancer(): void
    {
        $user = User::factory()->freelancer()->create();

        $this->assertTrue($user->isFreelancer());
        $this->assertFalse($user->isClient());
    }

    #[Test]
    public function it_returns_true_when_user_is_client(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client]);

        $this->assertTrue($user->isClient());
        $this->assertFalse($user->isFreelancer());
    }

    #[Test]
    public function it_includes_role_in_jwt_custom_claims(): void
    {
        $user = User::factory()->freelancer()->create();

        $claims = $user->getJWTCustomClaims();

        $this->assertArrayHasKey('role', $claims);
        $this->assertSame('freelancer', $claims['role']);
    }

    #[Test]
    public function it_returns_jwt_identifier_as_user_key(): void
    {
        $user = User::factory()->create();
        $user->id = 42;

        $this->assertSame(42, $user->getJWTIdentifier());
    }

    #[Test]
    public function it_has_freelancer_profile_relationship(): void
    {
        $user = User::factory()->freelancer()->create();

        $this->assertNull($user->freelancerProfile);

        \App\Models\FreelancerProfile::create(['user_id' => $user->id]);
        $user->refresh();

        $this->assertNotNull($user->freelancerProfile);
    }
}
