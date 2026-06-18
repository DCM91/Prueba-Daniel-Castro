<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BriefStatus;
use App\Enums\ProposalStatus;
use App\Enums\UserRole;
use App\Models\Brief;
use App\Models\Conversation;
use App\Models\FreelancerProfile;
use App\Models\Proposal;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private function makeClient(): array
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);
        $token = JWTAuth::fromUser($user);
        return [$user, $token];
    }

    private function makeFreelancer(): array
    {
        $user = User::factory()->freelancer()->create();
        FreelancerProfile::create(['user_id' => $user->id, 'display_name' => 'Pro']);
        $token = JWTAuth::fromUser($user);
        return [$user, $token];
    }

    private function makeCompletedContext(): array
    {
        [$client, $clientToken] = $this->makeClient();
        [$freelancer, $freelancerToken] = $this->makeFreelancer();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief completado',
            'description'  => 'Descripcion suficientemente larga para el brief',
            'category'     => 'photo',
            'status'       => BriefStatus::Completed->value,
            'published_at' => now()->subDays(7),
        ]);
        $profile = FreelancerProfile::where('user_id', $freelancer->id)->first();
        Proposal::create([
            'brief_id'      => $brief->id,
            'freelancer_id' => $profile->id,
            'message'       => 'Propuesta suficientemente larga para el brief',
            'price'         => 600,
            'status'        => ProposalStatus::Accepted->value,
        ]);
        Conversation::create([
            'brief_id'      => $brief->id,
            'client_id'     => $client->id,
            'freelancer_id' => $freelancer->id,
        ]);

        return [
            'client'         => $client,
            'freelancer'     => $freelancer,
            'client_token'   => $clientToken,
            'freelancer_tok' => $freelancerToken,
            'brief'          => $brief,
        ];
    }

    public function test_client_can_review_freelancer_on_completed_brief(): void
    {
        $ctx = $this->makeCompletedContext();

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", [
                'rating'  => 5,
                'comment' => 'Trabajo impecable, entregó antes de tiempo.',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.rating', 5)
            ->assertJsonPath('data.reviewer_id', $ctx['client']->id)
            ->assertJsonPath('data.reviewee_id', $ctx['freelancer']->id);

        $this->assertDatabaseHas('reviews', [
            'brief_id'    => $ctx['brief']->id,
            'reviewer_id' => $ctx['client']->id,
            'reviewee_id' => $ctx['freelancer']->id,
            'rating'      => 5,
        ]);
    }

    public function test_freelancer_can_review_client(): void
    {
        $ctx = $this->makeCompletedContext();

        $this->withHeader('Authorization', "Bearer {$ctx['freelancer_tok']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", [
                'rating'  => 4,
                'comment' => 'Cliente claro, pago a tiempo.',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.rating', 4)
            ->assertJsonPath('data.reviewer_id', $ctx['freelancer']->id)
            ->assertJsonPath('data.reviewee_id', $ctx['client']->id);
    }

    public function test_cannot_review_twice(): void
    {
        $ctx = $this->makeCompletedContext();
        Review::create([
            'brief_id'    => $ctx['brief']->id,
            'reviewer_id' => $ctx['client']->id,
            'reviewee_id' => $ctx['freelancer']->id,
            'rating'      => 5,
        ]);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", ['rating' => 4])
            ->assertStatus(409);
    }

    public function test_cannot_review_brief_that_is_not_completed(): void
    {
        [$client, $token] = $this->makeClient();
        [$freelancer] = $this->makeFreelancer();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief en progreso',
            'description'  => 'Descripcion suficientemente larga para el brief',
            'category'     => 'photo',
            'status'       => BriefStatus::Assigned->value,
            'published_at' => now(),
        ]);
        $profile = FreelancerProfile::where('user_id', $freelancer->id)->first();
        Proposal::create([
            'brief_id'      => $brief->id,
            'freelancer_id' => $profile->id,
            'message'       => 'Propuesta suficientemente larga para el brief',
            'price'         => 300,
            'status'        => ProposalStatus::Accepted->value,
        ]);
        Conversation::create([
            'brief_id'      => $brief->id,
            'client_id'     => $client->id,
            'freelancer_id' => $freelancer->id,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/reviews", ['rating' => 5])
            ->assertStatus(409);
    }

    public function test_cannot_review_brief_you_dont_participate_in(): void
    {
        $ctx = $this->makeCompletedContext();
        $stranger = User::factory()->create(['role' => UserRole::Client->value]);
        $strangerToken = JWTAuth::fromUser($stranger);

        $this->withHeader('Authorization', "Bearer {$strangerToken}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", ['rating' => 5])
            ->assertStatus(403);
    }

    public function test_review_validates_rating_range(): void
    {
        $ctx = $this->makeCompletedContext();

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", ['rating' => 0])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", ['rating' => 6])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);
    }

    public function test_review_requires_rating(): void
    {
        $ctx = $this->makeCompletedContext();

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", ['comment' => 'no rating'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);
    }

    public function test_comment_is_optional(): void
    {
        $ctx = $this->makeCompletedContext();

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", ['rating' => 4])
            ->assertStatus(201)
            ->assertJsonPath('data.comment', null);
    }

    public function test_comment_max_length(): void
    {
        $ctx = $this->makeCompletedContext();

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/reviews", [
                'rating'  => 4,
                'comment' => str_repeat('a', 1001),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['comment']);
    }

    public function test_list_for_user_returns_received_reviews(): void
    {
        $ctx = $this->makeCompletedContext();
        Review::create([
            'brief_id'    => $ctx['brief']->id,
            'reviewer_id' => $ctx['client']->id,
            'reviewee_id' => $ctx['freelancer']->id,
            'rating'      => 5,
            'comment'     => 'Genial',
        ]);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson("/api/users/{$ctx['freelancer']->id}/reviews")
            ->assertStatus(200)
            ->assertJsonPath('data.0.rating', 5)
            ->assertJsonPath('data.0.reviewer.name', $ctx['client']->name);
    }

    public function test_list_for_brief_returns_both_directions(): void
    {
        $ctx = $this->makeCompletedContext();
        Review::create([
            'brief_id'    => $ctx['brief']->id,
            'reviewer_id' => $ctx['client']->id,
            'reviewee_id' => $ctx['freelancer']->id,
            'rating'      => 5,
        ]);
        Review::create([
            'brief_id'    => $ctx['brief']->id,
            'reviewer_id' => $ctx['freelancer']->id,
            'reviewee_id' => $ctx['client']->id,
            'rating'      => 4,
        ]);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson("/api/briefs/{$ctx['brief']->id}/reviews")
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_list_for_brief_rejects_non_participant(): void
    {
        $ctx = $this->makeCompletedContext();
        $stranger = User::factory()->create(['role' => UserRole::Client->value]);
        $strangerToken = JWTAuth::fromUser($stranger);

        $this->withHeader('Authorization', "Bearer {$strangerToken}")
            ->getJson("/api/briefs/{$ctx['brief']->id}/reviews")
            ->assertStatus(403);
    }

    public function test_aggregate_for_user_returns_average_and_count(): void
    {
        $ctx = $this->makeCompletedContext();
        Review::create([
            'brief_id'    => $ctx['brief']->id,
            'reviewer_id' => $ctx['client']->id,
            'reviewee_id' => $ctx['freelancer']->id,
            'rating'      => 5,
        ]);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson("/api/users/{$ctx['freelancer']->id}/rating")
            ->assertStatus(200)
            ->assertJsonPath('data.count', 1)
            ->assertJsonPath('data.average', 5);
    }

    public function test_aggregate_for_user_with_no_reviews(): void
    {
        [$client, $token] = $this->makeClient();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/users/{$client->id}/rating")
            ->assertStatus(200)
            ->assertJsonPath('data.count', 0)
            ->assertJsonPath('data.average', null);
    }

    public function test_complete_brief_endpoint_transitions_to_completed(): void
    {
        [$client, $token] = $this->makeClient();
        [$freelancer] = $this->makeFreelancer();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief a completar',
            'description'  => 'Descripcion suficientemente larga para el brief',
            'category'     => 'photo',
            'status'       => BriefStatus::Assigned->value,
            'published_at' => now(),
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/briefs/{$brief->id}/complete")
            ->assertStatus(200)
            ->assertJsonPath('data.status', BriefStatus::Completed->value);

        $this->assertSame(BriefStatus::Completed->value, $brief->fresh()->status->value);
    }

    public function test_complete_brief_rejects_non_owner(): void
    {
        [$client] = $this->makeClient();
        $otherClient = User::factory()->create(['role' => UserRole::Client->value]);
        $otherToken = JWTAuth::fromUser($otherClient);
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief ajeno',
            'description'  => 'Descripcion suficientemente larga para el brief',
            'category'     => 'photo',
            'status'       => BriefStatus::Assigned->value,
            'published_at' => now(),
        ]);

        $this->withHeader('Authorization', "Bearer {$otherToken}")
            ->patchJson("/api/briefs/{$brief->id}/complete")
            ->assertStatus(403);
    }

    public function test_complete_brief_rejects_wrong_status(): void
    {
        [$client, $token] = $this->makeClient();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief ya completado',
            'description'  => 'Descripcion suficientemente larga para el brief',
            'category'     => 'photo',
            'status'       => BriefStatus::Completed->value,
            'published_at' => now(),
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/briefs/{$brief->id}/complete")
            ->assertStatus(409);
    }

    public function test_freelancer_profile_resource_includes_rating(): void
    {
        $ctx = $this->makeCompletedContext();
        Review::create([
            'brief_id'    => $ctx['brief']->id,
            'reviewer_id' => $ctx['client']->id,
            'reviewee_id' => $ctx['freelancer']->id,
            'rating'      => 4,
        ]);

        $profileId = $ctx['freelancer']->freelancerProfile->id;

        $this->getJson("/api/freelancers/{$profileId}")
            ->assertStatus(200)
            ->assertJsonPath('data.rating.count', 1)
            ->assertJsonPath('data.rating.average', 4);
    }

    public function test_unauthenticated_cannot_review(): void
    {
        $ctx = $this->makeCompletedContext();
        $this->postJson("/api/briefs/{$ctx['brief']->id}/reviews", ['rating' => 5])
            ->assertStatus(401);
    }
}
