<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\FreelancerProfile;
use App\Models\Skill;
use App\Models\User;
use App\Services\ProfileCompletionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class ProfileCompletionServiceTest extends TestCase
{
    use RefreshDatabase;

    private ProfileCompletionService $svc;

    protected function setUp(): void
    {
        parent::setUp();
        $this->svc = new ProfileCompletionService();
    }

    public function test_empty_profile_scores_zero(): void
    {
        $user = User::factory()->create(['city' => null, 'avatar_public_id' => null]);
        $profile = FreelancerProfile::factory()->create([
            'user_id'           => $user->id,
            'display_name'      => null,
            'bio'               => null,
            'hourly_rate'       => null,
            'price_per_project' => null,
            'is_available'      => false,
            'cover_public_id'   => null,
        ]);

        $result = $this->svc->calculate($profile);

        $this->assertSame(0, $result['pct']);
        $this->assertContains('display_name', $result['missing']);
        $this->assertContains('bio',          $result['missing']);
        $this->assertContains('city',         $result['missing']);
        $this->assertContains('hourly_rate',  $result['missing']);
        $this->assertContains('price_per_project', $result['missing']);
        $this->assertContains('is_available', $result['missing']);
        $this->assertContains('skills',       $result['missing']);
        $this->assertContains('avatar',       $result['missing']);
        $this->assertContains('cover',        $result['missing']);
        $this->assertContains('portfolio',    $result['missing']);
    }

    public function test_full_profile_scores_100(): void
    {
        $user = User::factory()->create([
            'city'             => 'Madrid',
            'avatar_public_id' => 'framematch/avatars/abc',
        ]);
        $profile = FreelancerProfile::factory()->create([
            'user_id'           => $user->id,
            'display_name'      => 'Lucia Marin',
            'bio'               => 'Fotógrafa con 8 años de experiencia.',
            'hourly_rate'       => 50.0,
            'price_per_project' => 300.0,
            'is_available'      => true,
            'cover_public_id'   => 'framematch/covers/xyz',
        ]);
        $profile->setRelation('skills', new Collection([
            new Skill(['id' => 1, 'name' => 'Foto', 'slug' => 'foto', 'category' => 'photo', 'is_active' => true]),
        ]));
        $profile->setRelation('portfolios', new Collection(array_fill(0, 3, new \stdClass())));

        $result = $this->svc->calculate($profile);

        $this->assertSame(100, $result['pct']);
        $this->assertSame([], $result['missing']);
    }

    public function test_partial_profile_scores_specific_weight(): void
    {
        $user = User::factory()->create(['city' => null, 'avatar_public_id' => null]);
        $profile = FreelancerProfile::factory()->create([
            'user_id'           => $user->id,
            'display_name'      => 'Lucia',
            'bio'               => 'Bio...',
            'hourly_rate'       => 50.0,
            'price_per_project' => null,
            'is_available'      => true,
            'cover_public_id'   => null,
        ]);
        $profile->setRelation('skills', new Collection());
        $profile->setRelation('portfolios', new Collection());

        $result = $this->svc->calculate($profile);

        $this->assertSame(
            ProfileCompletionService::WEIGHTS['display_name']    // 15
                + ProfileCompletionService::WEIGHTS['bio']         // 20
                + ProfileCompletionService::WEIGHTS['hourly_rate'] // 10
                + ProfileCompletionService::WEIGHTS['is_available'], // 5
            $result['pct']
        );
        $this->assertSame(50, $result['pct']);
        $this->assertNotContains('display_name', $result['missing']);
        $this->assertNotContains('bio',          $result['missing']);
        $this->assertContains('city',         $result['missing']);
        $this->assertContains('price_per_project', $result['missing']);
        $this->assertContains('skills',       $result['missing']);
        $this->assertContains('avatar',       $result['missing']);
        $this->assertContains('cover',        $result['missing']);
        $this->assertContains('portfolio',    $result['missing']);
    }

    public function test_city_empty_string_counts_as_missing(): void
    {
        $user = User::factory()->create(['city' => '   ', 'avatar_public_id' => null]);
        $profile = FreelancerProfile::factory()->create([
            'user_id'           => $user->id,
            'display_name'      => 'Lucia',
            'bio'               => null,
            'hourly_rate'       => null,
            'price_per_project' => null,
            'is_available'      => false,
            'cover_public_id'   => null,
        ]);

        $result = $this->svc->calculate($profile);

        $this->assertContains('city', $result['missing']);
    }

    public function test_portfolio_needs_at_least_three_items(): void
    {
        $user = User::factory()->create(['city' => null, 'avatar_public_id' => null]);
        $profile = FreelancerProfile::factory()->create([
            'user_id'           => $user->id,
            'display_name'      => null,
            'bio'               => null,
            'hourly_rate'       => null,
            'price_per_project' => null,
            'is_available'      => false,
            'cover_public_id'   => null,
        ]);
        $profile->setRelation('skills', new Collection());
        $profile->setRelation('portfolios', new Collection([
            new \stdClass(), new \stdClass(),
        ]));

        $result = $this->svc->calculate($profile);

        $this->assertContains('portfolio', $result['missing']);
    }

    public function test_avatar_counts_only_when_public_id_set(): void
    {
        $userNoAvatar = User::factory()->create(['avatar_public_id' => null]);
        $profile1 = FreelancerProfile::factory()->create(['user_id' => $userNoAvatar->id]);
        $this->assertContains('avatar', $this->svc->calculate($profile1)['missing']);

        $userWithAvatar = User::factory()->create(['avatar_public_id' => 'framematch/avatars/abc']);
        $profile2 = FreelancerProfile::factory()->create([
            'user_id'      => $userWithAvatar->id,
            'display_name' => 'X',
        ]);
        $this->assertNotContains('avatar', $this->svc->calculate($profile2)['missing']);
    }
}
