<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FreelancerProfile;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_client_creates_user_without_freelancer_profile(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Ana Cliente',
            'email'                 => 'ana@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'role'                  => 'client',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'user'        => ['id', 'name', 'email', 'role', 'created_at'],
                    'access_token',
                    'token_type',
                    'expires_in',
                ],
            ])
            ->assertJsonPath('data.user.email', 'ana@example.com')
            ->assertJsonPath('data.user.role', 'client')
            ->assertJsonPath('data.token_type', 'bearer');

        $this->assertDatabaseHas('users', [
            'email' => 'ana@example.com',
            'role'  => 'client',
        ]);

        $this->assertDatabaseMissing('freelancer_profiles', [
            'user_id' => User::where('email', 'ana@example.com')->value('id'),
        ]);
    }

    public function test_register_freelancer_creates_user_and_empty_profile(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Luis Foto',
            'email'                 => 'luis@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'role'                  => 'freelancer',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.user.role', 'freelancer');

        $user = User::where('email', 'luis@example.com')->firstOrFail();
        $this->assertNotNull($user->freelancerProfile);
        $this->assertNull($user->freelancerProfile->display_name);
        $this->assertTrue($user->freelancerProfile->is_available);
    }

    public function test_register_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'duplicado@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Duplicado',
            'email'                 => 'duplicado@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'role'                  => 'client',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_register_fails_with_invalid_role(): void
    {
        foreach (['admin', 'agency', 'company', 'artist'] as $role) {
            $response = $this->postJson('/api/auth/register', [
                'name'                  => 'Test ' . $role,
                'email'                 => $role . '@example.com',
                'password'              => 'password123',
                'password_confirmation' => 'password123',
                'role'                  => $role,
            ]);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['role']);
        }
    }

    public function test_register_fails_with_short_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Corto',
            'email'                 => 'corto@example.com',
            'password'              => 'short',
            'password_confirmation' => 'short',
            'role'                  => 'client',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_register_fails_without_password_confirmation(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'     => 'Sin confirm',
            'email'    => 'sinconfirm@example.com',
            'password' => 'password123',
            'role'     => 'client',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_login_succeeds_with_valid_credentials(): void
    {
        User::factory()->create([
            'email'    => 'login@example.com',
            'password' => Hash::make('password123'),
            'role'     => 'client',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'login@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['user', 'access_token', 'token_type', 'expires_in']])
            ->assertJsonPath('data.user.email', 'login@example.com');
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email'    => 'login@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'login@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Credenciales inválidas.']);
    }

    public function test_me_requires_token(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    public function test_me_returns_authenticated_user_with_freelancer_profile(): void
    {
        $user = User::factory()->create([
            'name'  => 'Con Perfil',
            'email' => 'conperfil@example.com',
            'role'  => 'freelancer',
        ]);
        FreelancerProfile::create([
            'user_id'       => $user->id,
            'display_name'  => 'Luis Foto Pro',
            'city'          => 'Madrid',
            'hourly_rate'   => 50.00,
            'is_available'  => true,
        ]);

        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.email', 'conperfil@example.com')
            ->assertJsonPath('data.role', 'freelancer')
            ->assertJsonPath('data.freelancer_profile.display_name', 'Luis Foto Pro')
            ->assertJsonPath('data.freelancer_profile.city', 'Madrid')
            ->assertJsonPath('data.freelancer_profile.hourly_rate', 50);
    }

    public function test_me_returns_user_without_freelancer_profile_for_client(): void
    {
        $user = User::factory()->create(['role' => 'client']);
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.role', 'client')
            ->assertJsonMissingPath('data.freelancer_profile');
    }

    public function test_logout_invalidates_token(): void
    {
        $user = User::factory()->create(['role' => 'client']);
        $token = auth('api')->login($user);

        $logout = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');
        $logout->assertStatus(200)
            ->assertJson(['message' => 'Sesión cerrada correctamente.']);

        $me = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');
        $me->assertStatus(401);
    }

    public function test_refresh_returns_new_token(): void
    {
        $user = User::factory()->create(['role' => 'freelancer']);
        FreelancerProfile::create(['user_id' => $user->id]);
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/refresh');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['user', 'access_token', 'token_type', 'expires_in']])
            ->assertJsonPath('data.user.email', $user->email);
    }

    public function test_refresh_fails_without_token(): void
    {
        $response = $this->postJson('/api/auth/refresh');

        $response->assertStatus(401);
    }

    public function test_skill_seeder_creates_skills(): void
    {
        $this->seed(\Database\Seeders\SkillSeeder::class);

        $this->assertGreaterThan(0, Skill::count());
        $this->assertDatabaseHas('skills', ['slug' => 'fotografia-de-retrato']);
        $this->assertDatabaseHas('skills', ['slug' => 'video-corporativo']);
        $this->assertDatabaseHas('skills', ['slug' => 'edicion-de-video']);
        $this->assertDatabaseHas('skills', ['slug' => 'copywriting', 'category' => 'content']);
        $this->assertDatabaseHas('skills', ['slug' => 'locucion', 'category' => 'content']);
    }

    public function test_health_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJson(['status' => 'ok', 'service' => 'FrameMatch']);
    }
}
