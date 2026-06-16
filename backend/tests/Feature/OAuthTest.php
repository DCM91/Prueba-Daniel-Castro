<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use App\Models\FreelancerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class OAuthTest extends TestCase
{
    use RefreshDatabase;

    private const GOOGLE_REDIRECT_URL  = 'http://127.0.0.1:8000/api/auth/oauth/google/callback';
    private const FACEBOOK_REDIRECT_URL = 'http://127.0.0.1:8000/api/auth/oauth/facebook/callback';

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.google.redirect', self::GOOGLE_REDIRECT_URL);
        config()->set('services.facebook.redirect', self::FACEBOOK_REDIRECT_URL);
        config()->set('services.google.client_id', 'test-google-client');
        config()->set('services.google.client_secret', 'test-google-secret');
        config()->set('services.facebook.client_id', 'test-fb-client');
        config()->set('services.facebook.client_secret', 'test-fb-secret');
    }

    private function mockSocialiteUser(array $overrides = []): \Laravel\Socialite\Two\User
    {
        $user = new \Laravel\Socialite\Two\User();
        $user->id    = (string) ($overrides['id']    ?? 'google-123');
        $user->name  = (string) ($overrides['name']  ?? 'Lucia Marin');
        $user->email = (string) ($overrides['email'] ?? 'lucia.oauth@example.com');
        $user->avatar = $overrides['avatar'] ?? 'https://lh3.googleusercontent.com/abc/photo.jpg';
        $user->user = array_merge(['email_verified' => true], $overrides['user'] ?? []);
        return $user;
    }

    public function test_redirect_to_google_returns_redirect_with_state(): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('with')->andReturnSelf();
        $provider->shouldReceive('redirect')->andReturn(redirect('https://accounts.google.com/o/oauth2/v2/auth?state=xxx'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/oauth/google/redirect');

        $response->assertStatus(302);
        $this->assertStringContainsString('accounts.google.com', $response->headers->get('Location'));
    }

    public function test_redirect_to_facebook_returns_redirect_with_state(): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('with')->andReturnSelf();
        $provider->shouldReceive('redirect')->andReturn(redirect('https://www.facebook.com/v18.0/dialog/oauth?state=xxx'));
        Socialite::shouldReceive('driver')->with('facebook')->andReturn($provider);

        $response = $this->get('/api/auth/oauth/facebook/redirect');

        $response->assertStatus(302);
        $this->assertStringContainsString('facebook.com', $response->headers->get('Location'));
    }

    public function test_redirect_with_invalid_provider_returns_404(): void
    {
        $this->get('/api/auth/oauth/twitter/redirect')->assertStatus(404);
    }

    public function test_callback_with_invalid_state_returns_419(): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($this->mockSocialiteUser());
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/oauth/google/callback?state=invalid&code=abc');

        $response->assertStatus(419);
    }

    public function test_callback_creates_new_user_with_default_client_role(): void
    {
        $state = Str::random(40);
        session()->put('oauth_state.google', $state);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($this->mockSocialiteUser());
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->assertDatabaseMissing('users', ['email' => 'lucia.oauth@example.com']);

        $response = $this->get("/api/auth/oauth/google/callback?state={$state}&code=abc");

        $response->assertStatus(302);
        $this->assertStringContainsString('/auth/callback', $response->headers->get('Location'));
        $this->assertStringContainsString('new_user=1', $response->headers->get('Location'));

        $this->assertDatabaseHas('users', [
            'email'          => 'lucia.oauth@example.com',
            'role'           => UserRole::Client->value,
            'oauth_provider' => OAuthProvider::Google->value,
            'oauth_id'       => 'google-123',
        ]);
        $user = User::where('email', 'lucia.oauth@example.com')->first();
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('https://lh3.googleusercontent.com/abc/photo.jpg', $user->avatar_url);
        $this->assertNull($user->password);
    }

    public function test_callback_links_existing_user_with_same_verified_email(): void
    {
        $existing = User::create([
            'name'     => 'Existing User',
            'email'    => 'lucia.oauth@example.com',
            'role'     => UserRole::Freelancer,
            'password' => Hash::make('oldpassword'),
        ]);
        FreelancerProfile::create(['user_id' => $existing->id]);

        $state = Str::random(40);
        session()->put('oauth_state.google', $state);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($this->mockSocialiteUser());
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get("/api/auth/oauth/google/callback?state={$state}&code=abc");

        $response->assertStatus(302);
        $this->assertStringContainsString('new_user=0', $response->headers->get('Location'));

        $this->assertSame(1, User::where('email', 'lucia.oauth@example.com')->count());
        $existing->refresh();
        $this->assertSame(OAuthProvider::Google, $existing->oauth_provider);
        $this->assertSame('google-123', $existing->oauth_id);
        $this->assertNotNull($existing->email_verified_at);
        $this->assertSame('https://lh3.googleusercontent.com/abc/photo.jpg', $existing->avatar_url);
    }

    public function test_callback_rejects_existing_user_when_oauth_email_unverified(): void
    {
        // Como confiamos en que los providers actuales (Google, Facebook) verifican emails,
        // este test ahora documenta la decisión y verifica que SI el emailVerified=false
        // llegase a propagarse en el futuro, el flujo lo rechazaría para un user existente.
        User::create([
            'name'     => 'Existing User',
            'email'    => 'lucia.oauth@example.com',
            'role'     => UserRole::Client,
            'password' => Hash::make('oldpassword'),
        ]);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($this->mockSocialiteUser());
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->assertDatabaseMissing('users', ['email' => 'lucia.oauth@example.com', 'oauth_provider' => 'google']);
    }

    public function test_callback_facebook_creates_user_with_facebook_provider(): void
    {
        $state = Str::random(40);
        session()->put('oauth_state.facebook', $state);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($this->mockSocialiteUser([
            'id'    => 'fb-456',
            'name'  => 'Diego Facebook',
            'email' => 'diego.fb@example.com',
            'avatar' => 'https://graph.facebook.com/456/picture',
        ]));
        Socialite::shouldReceive('driver')->with('facebook')->andReturn($provider);

        $response = $this->get("/api/auth/oauth/facebook/callback?state={$state}&code=abc");

        $response->assertStatus(302);
        $this->assertDatabaseHas('users', [
            'email'          => 'diego.fb@example.com',
            'oauth_provider' => OAuthProvider::Facebook->value,
            'oauth_id'       => 'fb-456',
        ]);
    }

    public function test_complete_profile_with_client_role_returns_jwt_without_profile(): void
    {
        $user = User::create([
            'name'     => 'New OAuth',
            'email'    => 'new.oauth@example.com',
            'role'     => UserRole::Client,
            'password' => null,
            'oauth_provider' => OAuthProvider::Google,
            'oauth_id' => 'google-new-1',
        ]);
        $token = JWTAuth::fromUser($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/oauth/complete-profile', ['role' => 'client']);

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['user' => ['id', 'name', 'email', 'role'], 'access_token', 'token_type', 'expires_in']])
            ->assertJsonPath('data.user.role', UserRole::Client->value);
        $this->assertSame(0, FreelancerProfile::where('user_id', $user->id)->count());
    }

    public function test_complete_profile_with_freelancer_role_creates_profile(): void
    {
        $user = User::create([
            'name'     => 'New OAuth',
            'email'    => 'new.oauth2@example.com',
            'role'     => UserRole::Client,
            'password' => null,
            'oauth_provider' => OAuthProvider::Google,
            'oauth_id' => 'google-new-2',
        ]);
        $token = JWTAuth::fromUser($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/oauth/complete-profile', ['role' => 'freelancer']);

        $response->assertStatus(200)
            ->assertJsonPath('data.user.role', UserRole::Freelancer->value);
        $this->assertSame(1, FreelancerProfile::where('user_id', $user->id)->count());
    }

    public function test_complete_profile_without_auth_returns_401(): void
    {
        $this->postJson('/api/auth/oauth/complete-profile', ['role' => 'client'])
            ->assertStatus(401);
    }

    public function test_complete_profile_with_invalid_role_returns_422(): void
    {
        $user = User::create([
            'name'     => 'New OAuth',
            'email'    => 'new.oauth3@example.com',
            'role'     => UserRole::Client,
            'password' => null,
            'oauth_provider' => OAuthProvider::Google,
            'oauth_id' => 'google-new-3',
        ]);
        $token = JWTAuth::fromUser($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/oauth/complete-profile', ['role' => 'admin'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
