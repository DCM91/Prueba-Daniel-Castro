<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FreelancerProfile;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class FreelancerProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SkillSeeder::class);
    }

    private function makeFreelancer(array $attrs = []): array
    {
        $user = User::factory()->freelancer()->create($attrs);
        FreelancerProfile::create(['user_id' => $user->id]);
        $token = auth('api')->login($user);

        return [$user, $token];
    }

    public function test_skills_index_returns_seeded_skills(): void
    {
        $response = $this->getJson('/api/skills');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'category'],
                ],
            ]);

        $this->assertCount(Skill::count(), $response->json('data'));
        $this->assertGreaterThanOrEqual(4, Skill::query()->where('category', 'content')->count());
    }

    public function test_freelancer_me_returns_profile_with_skills(): void
    {
        [$user, $token] = $this->makeFreelancer(['name' => 'Luis Foto', 'city' => 'Madrid']);
        $profile = $user->freelancerProfile;
        $profile->update(['display_name' => 'Luis Foto Pro']);
        $profile->load('skills');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/freelancer/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.display_name', 'Luis Foto Pro')
            ->assertJsonPath('data.city', 'Madrid')
            ->assertJsonPath('data.is_available', true)
            ->assertJsonStructure(['data' => ['skills']]);
    }

    public function test_client_cannot_access_freelancer_me(): void
    {
        $user = User::factory()->create(['role' => 'client']);
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/freelancer/me');

        $response->assertStatus(403)
            ->assertJson(['message' => 'Solo los profesionales pueden gestionar su perfil.']);
    }

    public function test_freelancer_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/freelancer/me');

        $response->assertStatus(401);
    }

    public function test_update_profile_succeeds_with_valid_data(): void
    {
        [$user, $token] = $this->makeFreelancer(['city' => 'Madrid']);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me', [
                'display_name'      => 'Luis Foto Pro',
                'bio'               => 'Fotógrafo especializado en producto.',
                'hourly_rate'       => 60,
                'price_per_project' => 450,
                'is_available'      => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.display_name', 'Luis Foto Pro')
            ->assertJsonPath('data.city', 'Madrid')
            ->assertJsonPath('data.hourly_rate', 60)
            ->assertJsonPath('data.price_per_project', 450);

        $this->assertDatabaseHas('freelancer_profiles', [
            'user_id'           => $user->id,
            'display_name'      => 'Luis Foto Pro',
            'is_available'      => 1,
        ]);
        $this->assertDatabaseHas('users', [
            'id'   => $user->id,
            'city' => 'Madrid',
        ]);
    }

    public function test_update_profile_fails_when_bio_too_long(): void
    {
        [, $token] = $this->makeFreelancer();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me', [
                'bio' => str_repeat('a', 1001),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['bio']);
    }

    public function test_sync_skills_creates_pivot_rows(): void
    {
        [$user, $token] = $this->makeFreelancer();
        $skills = Skill::take(3)->get();

        $payload = $skills->map(fn ($s, $i) => [
            'skill_id'         => $s->id,
            'level'            => ['junior', 'mid', 'senior'][$i],
            'years_experience' => 2 + $i,
        ])->all();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/skills', [
                'skills' => $payload,
            ]);

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data.skills');

        foreach ($skills as $i => $skill) {
            $this->assertDatabaseHas('freelancer_skill', [
                'freelancer_profile_id' => $user->freelancerProfile->id,
                'skill_id'              => $skill->id,
                'level'                 => ['junior', 'mid', 'senior'][$i],
                'years_experience'      => 2 + $i,
            ]);
        }
    }

    public function test_sync_skills_fails_with_nonexistent_skill(): void
    {
        [, $token] = $this->makeFreelancer();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/skills', [
                'skills' => [
                    [
                        'skill_id'         => 99999,
                        'level'            => 'mid',
                        'years_experience' => 3,
                    ],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['skills.0.skill_id']);
    }

    public function test_sync_skills_replaces_previous_pivot_rows(): void
    {
        [$user, $token] = $this->makeFreelancer();
        $first = Skill::take(2)->get();
        $second = Skill::skip(2)->take(2)->get();

        $firstPayload = $first->map(fn ($s) => [
            'skill_id'         => $s->id,
            'level'            => 'mid',
            'years_experience' => 4,
        ])->all();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/skills', ['skills' => $firstPayload])
            ->assertStatus(200);

        $secondPayload = $second->map(fn ($s) => [
            'skill_id'         => $s->id,
            'level'            => 'senior',
            'years_experience' => 6,
        ])->all();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/skills', ['skills' => $secondPayload])
            ->assertStatus(200)
            ->assertJsonCount(2, 'data.skills');

        foreach ($first as $s) {
            $this->assertDatabaseMissing('freelancer_skill', [
                'freelancer_profile_id' => $user->freelancerProfile->id,
                'skill_id'              => $s->id,
            ]);
        }

        foreach ($second as $s) {
            $this->assertDatabaseHas('freelancer_skill', [
                'freelancer_profile_id' => $user->freelancerProfile->id,
                'skill_id'              => $s->id,
                'level'                 => 'senior',
                'years_experience'      => 6,
            ]);
        }
    }

    public function test_client_cannot_sync_skills(): void
    {
        $user = User::factory()->create(['role' => 'client']);
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/skills', [
                'skills' => [],
            ]);

        $response->assertStatus(403);
    }

    public function test_freelancer_profile_me_returns_skills_with_pivot_data(): void
    {
        [$user, $token] = $this->makeFreelancer();
        $skills = Skill::take(2)->get();

        $payload = $skills->map(fn ($s, $i) => [
            'skill_id'         => $s->id,
            'level'            => ['junior', 'mid'][$i],
            'years_experience' => [1, 3][$i],
        ])->all();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/freelancer/me/skills', ['skills' => $payload])
            ->assertStatus(200);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/freelancer/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.skills.0.level', 'junior')
            ->assertJsonPath('data.skills.0.years_experience', 1)
            ->assertJsonPath('data.skills.1.level', 'mid')
            ->assertJsonPath('data.skills.1.years_experience', 3);
    }
}
