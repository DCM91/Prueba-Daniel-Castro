<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FreelancerProfile;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class FreelancerCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SkillSeeder::class);
    }

    private function makeFreelancer(array $profileOverrides = []): FreelancerProfile
    {
        $userAttrs = [];
        if (array_key_exists('city', $profileOverrides)) {
            $userAttrs['city'] = $profileOverrides['city'];
            unset($profileOverrides['city']);
        }
        $user = User::factory()->freelancer()->create($userAttrs);
        $defaults = [
            'user_id'           => $user->id,
            'display_name'      => 'Freelancer ' . $user->id,
            'bio'               => 'Bio de prueba',
            'hourly_rate'       => 50,
            'price_per_project' => 300,
            'is_available'      => true,
        ];

        return FreelancerProfile::create(array_merge($defaults, $profileOverrides));
    }

    private function attachSkills(FreelancerProfile $profile, array $skillSlugs): void
    {
        $skills = Skill::whereIn('slug', $skillSlugs)->get();
        $sync = [];
        foreach ($skills as $i => $skill) {
            $sync[$skill->id] = [
                'level'            => 'senior',
                'years_experience' => 3 + $i,
            ];
        }
        $profile->skills()->sync($sync);
    }

    public function test_index_returns_paginated_cards_with_default_filters(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->makeFreelancer(['display_name' => "F{$i}", 'hourly_rate' => 40 + $i]);
        }

        $response = $this->getJson('/api/freelancers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'display_name', 'city', 'hourly_rate', 'is_available', 'top_skills', 'profile_completion'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 12)
            ->assertJsonPath('data.0.hourly_rate', 40);
    }

    public function test_index_filters_by_category(): void
    {
        $photo = $this->makeFreelancer(['display_name' => 'FotoMan']);
        $this->attachSkills($photo, ['fotografia-de-producto']);

        $video = $this->makeFreelancer(['display_name' => 'VideoMan']);
        $this->attachSkills($video, ['video-corporativo']);

        $response = $this->getJson('/api/freelancers?category=video');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.display_name', 'VideoMan');
    }

    public function test_index_filters_by_city(): void
    {
        $this->makeFreelancer(['display_name' => 'Mad', 'city' => 'Madrid']);
        $this->makeFreelancer(['display_name' => 'Bar', 'city' => 'Barcelona']);

        $response = $this->getJson('/api/freelancers?city=Madrid');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.city', 'Madrid');
    }

    public function test_index_filters_by_max_rate(): void
    {
        $this->makeFreelancer(['display_name' => 'Caro', 'hourly_rate' => 120]);
        $this->makeFreelancer(['display_name' => 'Barato', 'hourly_rate' => 40]);

        $response = $this->getJson('/api/freelancers?max_rate=80');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.display_name', 'Barato');
    }

    public function test_index_combines_multiple_filters_with_q(): void
    {
        $target = $this->makeFreelancer(['display_name' => 'Lucia Pro', 'city' => 'Madrid', 'hourly_rate' => 60]);
        $this->attachSkills($target, ['fotografia-de-producto']);

        $this->makeFreelancer(['display_name' => 'Otro Madrid', 'city' => 'Madrid', 'hourly_rate' => 90]);
        $this->makeFreelancer(['display_name' => 'Lucia Bar', 'city' => 'Barcelona', 'hourly_rate' => 30]);

        $response = $this->getJson('/api/freelancers?q=Lucia&category=photo&city=Madrid&max_rate=80');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.display_name', 'Lucia Pro');
    }

    public function test_index_returns_empty_page_when_no_match(): void
    {
        $this->makeFreelancer(['display_name' => 'Solo Uno', 'city' => 'Madrid']);

        $response = $this->getJson('/api/freelancers?city=Lisboa');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_index_excludes_unavailable_freelancers(): void
    {
        $this->makeFreelancer(['display_name' => 'Visible']);
        $this->makeFreelancer(['display_name' => 'Oculto', 'is_available' => false]);

        $response = $this->getJson('/api/freelancers');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.display_name', 'Visible');
    }

    public function test_show_returns_detail_for_available_freelancer(): void
    {
        $profile = $this->makeFreelancer([
            'display_name'      => 'Lucia Pro',
            'bio'               => 'Bio detallada',
            'city'              => 'Madrid',
            'hourly_rate'       => 65.5,
            'price_per_project' => 480,
        ]);
        $this->attachSkills($profile, ['fotografia-de-producto', 'color-grading']);

        $response = $this->getJson("/api/freelancers/{$profile->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $profile->id)
            ->assertJsonPath('data.display_name', 'Lucia Pro')
            ->assertJsonPath('data.bio', 'Bio detallada')
            ->assertJsonPath('data.hourly_rate', 65.5)
            ->assertJsonPath('data.price_per_project', 480)
            ->assertJsonPath('data.is_available', true)
            ->assertJsonStructure(['data' => ['skills' => ['*' => ['id', 'name', 'slug', 'category', 'level', 'years_experience']]]]);
    }

    public function test_show_does_not_expose_email(): void
    {
        $profile = $this->makeFreelancer(['display_name' => 'Sin Email']);

        $response = $this->getJson("/api/freelancers/{$profile->id}");

        $response->assertStatus(200)
            ->assertJsonMissingPath('data.user.email')
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.email');
    }

    public function test_show_returns_404_for_nonexistent_freelancer(): void
    {
        $response = $this->getJson('/api/freelancers/99999');

        $response->assertStatus(404)
            ->assertJson(['message' => 'Profesional no encontrado.']);
    }

    public function test_show_returns_404_for_unavailable_freelancer(): void
    {
        $profile = $this->makeFreelancer(['is_available' => false]);

        $response = $this->getJson("/api/freelancers/{$profile->id}");

        $response->assertStatus(404)
            ->assertJson(['message' => 'Profesional no encontrado.']);
    }

    public function test_index_rejects_invalid_category(): void
    {
        $response = $this->getJson('/api/freelancers?category=foo');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }

    public function test_index_paginates_results(): void
    {
        for ($i = 0; $i < 15; $i++) {
            $this->makeFreelancer(['display_name' => "P{$i}", 'hourly_rate' => 10 + $i]);
        }

        $page1 = $this->getJson('/api/freelancers?page=1');
        $page2 = $this->getJson('/api/freelancers?page=2');

        $page1->assertStatus(200)
            ->assertJsonPath('meta.total', 15)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonCount(12, 'data');

        $page2->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.display_name', 'P12');
    }

    public function test_index_sort_featured_orders_by_completion_desc_then_antiquity_asc(): void
    {
        $oldestMostComplete = $this->makeFreelancer([
            'display_name'      => 'OldestFull',
            'bio'               => 'Bio',
            'city'              => 'Madrid',
            'hourly_rate'       => 50,
            'price_per_project' => 300,
        ]);
        $oldestMostComplete->forceFill(['created_at' => now()->subMonths(12)])->save();
        $this->attachSkills($oldestMostComplete, ['fotografia-de-producto']);

        $newestAlsoFull = $this->makeFreelancer([
            'display_name'      => 'NewestFull',
            'bio'               => 'Bio',
            'city'              => 'Madrid',
            'hourly_rate'       => 50,
            'price_per_project' => 300,
        ]);
        $newestAlsoFull->forceFill(['created_at' => now()->subDays(5)])->save();
        $this->attachSkills($newestAlsoFull, ['video-corporativo']);

        $incomplete = $this->makeFreelancer([
            'display_name'      => 'Incomplete',
            'bio'               => null,
            'city'              => null,
            'hourly_rate'       => null,
            'price_per_project' => null,
        ]);
        $incomplete->forceFill(['created_at' => now()->subYears(2)])->save();

        $response = $this->getJson('/api/freelancers?sort=featured');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 3);

        $names = collect($response->json('data'))->pluck('display_name')->all();

        $this->assertSame('OldestFull', $names[0], 'El más antiguo con perfil completo va primero.');
        $this->assertSame('NewestFull', $names[1], 'El más reciente con perfil completo va segundo.');
        $this->assertSame('Incomplete', $names[2], 'El perfil incompleto va el último.');
    }

    public function test_index_sort_featured_uses_avatar_and_cover_in_completion(): void
    {
        $noAvatar = $this->makeFreelancer([
            'display_name'      => 'NoAvatar',
            'bio'               => 'Bio',
            'hourly_rate'       => 50,
            'price_per_project' => 300,
        ]);
        $noAvatar->user->update(['avatar_public_id' => null]);
        $this->attachSkills($noAvatar, ['fotografia-de-producto']);

        $withAvatar = $this->makeFreelancer([
            'display_name'      => 'WithAvatar',
            'bio'               => 'Bio',
            'hourly_rate'       => 50,
            'price_per_project' => 300,
        ]);
        $withAvatar->user->update(['avatar_public_id' => 'framematch/avatars/x']);
        $this->attachSkills($withAvatar, ['video-corporativo']);

        $response = $this->getJson('/api/freelancers?sort=featured');

        $response->assertStatus(200);
        $names = collect($response->json('data'))->pluck('display_name')->all();

        $this->assertSame('WithAvatar', $names[0], 'El perfil con avatar (10 pts extra) va primero.');
        $this->assertSame('NoAvatar',   $names[1]);
    }

    public function test_index_sort_recent_orders_by_created_at_desc(): void
    {
        $old = $this->makeFreelancer(['display_name' => 'Old']);
        $old->forceFill(['created_at' => now()->subMonths(6)])->save();
        $new = $this->makeFreelancer(['display_name' => 'New']);
        $new->forceFill(['created_at' => now()->subDays(2)])->save();

        $response = $this->getJson('/api/freelancers?sort=recent');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.display_name', 'New');
    }

    public function test_index_rejects_unknown_sort(): void
    {
        $response = $this->getJson('/api/freelancers?sort=banana');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sort']);
    }

    public function test_index_excludes_orphan_profiles_without_user(): void
    {
        $this->makeFreelancer(['display_name' => 'Con Usuario']);

        $orphan = $this->makeFreelancer(['display_name' => 'Huerfano']);
        $orphanUserId = $orphan->user_id;
        \App\Models\User::where('id', $orphanUserId)->delete();

        $response = $this->getJson('/api/freelancers');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.display_name', 'Con Usuario');
    }
}
