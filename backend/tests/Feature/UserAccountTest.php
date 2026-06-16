<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class UserAccountTest extends TestCase
{
    use RefreshDatabase;

    private function authHeaders(User $user): array
    {
        $token = JWTAuth::fromUser($user);

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_authenticated_user_can_update_name_email_phone_city(): void
    {
        $user = User::factory()->create([
            'name'  => 'Ana Cliente',
            'email' => 'ana@example.com',
            'phone' => null,
            'city'  => null,
        ]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->putJson('/api/me', [
                'name'  => 'Ana Cliente Editada',
                'email' => 'ana.nueva@example.com',
                'phone' => '+34 600 000 000',
                'city'  => 'Madrid',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Ana Cliente Editada')
            ->assertJsonPath('data.email', 'ana.nueva@example.com')
            ->assertJsonPath('data.phone', '+34 600 000 000')
            ->assertJsonPath('data.city', 'Madrid');

        $this->assertDatabaseHas('users', [
            'id'    => $user->id,
            'name'  => 'Ana Cliente Editada',
            'email' => 'ana.nueva@example.com',
            'phone' => '+34 600 000 000',
            'city'  => 'Madrid',
        ]);
    }

    public function test_can_clear_phone_and_city_by_sending_empty_string(): void
    {
        $user = User::factory()->create([
            'phone' => '+34 600 111 111',
            'city'  => 'Madrid',
        ]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->putJson('/api/me', [
                'phone' => '',
                'city'  => '',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.phone', null)
            ->assertJsonPath('data.city', null);

        $this->assertDatabaseHas('users', [
            'id'    => $user->id,
            'phone' => null,
            'city'  => null,
        ]);
    }

    public function test_email_must_be_unique_excluding_self(): void
    {
        $mike  = User::factory()->create(['email' => 'mike@example.com']);
        $other = User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->withHeaders($this->authHeaders($mike))
            ->putJson('/api/me', ['email' => 'taken@example.com']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_can_keep_own_email(): void
    {
        $user = User::factory()->create(['email' => 'self@example.com']);

        $response = $this->withHeaders($this->authHeaders($user))
            ->putJson('/api/me', ['email' => 'self@example.com']);

        $response->assertStatus(200)
            ->assertJsonPath('data.email', 'self@example.com');
    }

    public function test_short_name_is_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->withHeaders($this->authHeaders($user))
            ->putJson('/api/me', ['name' => 'A']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_phone_max_length_is_enforced(): void
    {
        $user = User::factory()->create();

        $response = $this->withHeaders($this->authHeaders($user))
            ->putJson('/api/me', ['phone' => str_repeat('1', 31)]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->putJson('/api/me', ['name' => 'Hacker']);

        $response->assertStatus(401);
    }
}
