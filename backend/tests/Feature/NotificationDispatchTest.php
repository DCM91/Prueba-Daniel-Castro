<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BriefStatus;
use App\Enums\ProposalStatus;
use App\Enums\UserRole;
use App\Events\NotificationReceived;
use App\Models\Brief;
use App\Models\Conversation;
use App\Models\FreelancerProfile;
use App\Models\Proposal;
use App\Models\User;
use App\Notifications\BriefAssignedNotification;
use App\Notifications\BriefCompletedNotification;
use App\Notifications\ProposalAcceptedNotification;
use App\Notifications\ProposalReceivedNotification;
use App\Notifications\ProposalRejectedNotification;
use App\Notifications\ReviewReceivedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class NotificationDispatchTest extends TestCase
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

    private function makePublishedBrief(User $client): Brief
    {
        return Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief de prueba',
            'description'  => 'Descripcion suficientemente larga para validar el brief.',
            'category'     => 'photo',
            'status'       => BriefStatus::Published->value,
            'published_at' => now(),
        ]);
    }

    public function test_proposal_store_persists_and_broadcasts_proposal_received_to_client(): void
    {
        Event::fake([NotificationReceived::class]);

        [$client, $clientToken] = $this->makeClient();
        [$freelancer, $freelancerToken] = $this->makeFreelancer();
        $brief = $this->makePublishedBrief($client);

        $body = [
            'message' => 'Propuesta lo bastante larga para ser valida en el endpoint.',
            'price'   => 500,
        ];

        $this->withHeader('Authorization', "Bearer {$freelancerToken}")
            ->postJson("/api/briefs/{$brief->id}/proposals", $body)
            ->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id'   => $client->id,
            'notifiable_type' => User::class,
            'type'            => ProposalReceivedNotification::class,
        ]);

        Event::assertDispatched(NotificationReceived::class, function (NotificationReceived $e) use ($client) {
            return $e->user->id === $client->id
                && ($e->payload['kind'] ?? null) === 'proposal_received';
        });
    }

    public function test_proposal_update_accept_persists_and_broadcasts_proposal_accepted_and_brief_assigned(): void
    {
        Event::fake([NotificationReceived::class]);

        [$client, $clientToken] = $this->makeClient();
        [$freelancer, $freelancerToken] = $this->makeFreelancer();
        $brief = $this->makePublishedBrief($client);
        $profile = FreelancerProfile::where('user_id', $freelancer->id)->first();
        $proposal = Proposal::create([
            'brief_id'      => $brief->id,
            'freelancer_id' => $profile->id,
            'message'       => 'Propuesta lo bastante larga para ser valida en el endpoint.',
            'price'         => 500,
            'status'        => ProposalStatus::Pending->value,
        ]);

        $this->withHeader('Authorization', "Bearer {$clientToken}")
            ->patchJson("/api/briefs/{$brief->id}/proposals/{$proposal->id}", ['status' => 'accepted'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id'   => $freelancer->id,
            'type'            => ProposalAcceptedNotification::class,
        ]);
        $this->assertDatabaseHas('notifications', [
            'notifiable_id'   => $freelancer->id,
            'type'            => BriefAssignedNotification::class,
        ]);

        Event::assertDispatched(NotificationReceived::class, function (NotificationReceived $e) use ($freelancer) {
            return $e->user->id === $freelancer->id
                && ($e->payload['kind'] ?? null) === 'proposal_accepted';
        });
        Event::assertDispatched(NotificationReceived::class, function (NotificationReceived $e) use ($freelancer) {
            return $e->user->id === $freelancer->id
                && ($e->payload['kind'] ?? null) === 'brief_assigned';
        });
    }

    public function test_proposal_update_reject_persists_and_broadcasts_proposal_rejected(): void
    {
        Event::fake([NotificationReceived::class]);

        [$client, $clientToken] = $this->makeClient();
        [$freelancer, $freelancerToken] = $this->makeFreelancer();
        $brief = $this->makePublishedBrief($client);
        $profile = FreelancerProfile::where('user_id', $freelancer->id)->first();
        $proposal = Proposal::create([
            'brief_id'      => $brief->id,
            'freelancer_id' => $profile->id,
            'message'       => 'Propuesta lo bastante larga para ser valida en el endpoint.',
            'price'         => 500,
            'status'        => ProposalStatus::Pending->value,
        ]);

        $this->withHeader('Authorization', "Bearer {$clientToken}")
            ->patchJson("/api/briefs/{$brief->id}/proposals/{$proposal->id}", ['status' => 'rejected'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id'   => $freelancer->id,
            'type'            => ProposalRejectedNotification::class,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'notifiable_id'   => $freelancer->id,
            'type'            => ProposalAcceptedNotification::class,
        ]);
    }

    public function test_review_create_persists_and_broadcasts_review_received_to_reviewee(): void
    {
        Event::fake([NotificationReceived::class]);

        [$client, $clientToken] = $this->makeClient();
        [$freelancer, $freelancerToken] = $this->makeFreelancer();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief completado',
            'description'  => 'Descripcion suficientemente larga para validar el brief.',
            'category'     => 'photo',
            'status'       => BriefStatus::Completed->value,
            'published_at' => now(),
        ]);
        $profile = FreelancerProfile::where('user_id', $freelancer->id)->first();
        Proposal::create([
            'brief_id'      => $brief->id,
            'freelancer_id' => $profile->id,
            'message'       => 'Propuesta lo bastante larga para ser valida en el endpoint.',
            'price'         => 500,
            'status'        => ProposalStatus::Accepted->value,
        ]);
        Conversation::create([
            'brief_id'      => $brief->id,
            'client_id'     => $client->id,
            'freelancer_id' => $freelancer->id,
        ]);

        $this->withHeader('Authorization', "Bearer {$clientToken}")
            ->postJson("/api/briefs/{$brief->id}/reviews", ['rating' => 5, 'comment' => 'Excelente trabajo.'])
            ->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id'   => $freelancer->id,
            'type'            => ReviewReceivedNotification::class,
        ]);

        Event::assertDispatched(NotificationReceived::class, function (NotificationReceived $e) use ($freelancer) {
            return $e->user->id === $freelancer->id
                && ($e->payload['kind'] ?? null) === 'review_received';
        });
    }

    public function test_complete_brief_persists_and_broadcasts_brief_completed_to_freelancer(): void
    {
        Event::fake([NotificationReceived::class]);

        [$client, $clientToken] = $this->makeClient();
        [$freelancer, $freelancerToken] = $this->makeFreelancer();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief asignado',
            'description'  => 'Descripcion suficientemente larga para validar el brief.',
            'category'     => 'photo',
            'status'       => BriefStatus::Assigned->value,
            'published_at' => now(),
        ]);
        Conversation::create([
            'brief_id'      => $brief->id,
            'client_id'     => $client->id,
            'freelancer_id' => $freelancer->id,
        ]);

        $this->withHeader('Authorization', "Bearer {$clientToken}")
            ->patchJson("/api/briefs/{$brief->id}/complete")
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id'   => $freelancer->id,
            'type'            => BriefCompletedNotification::class,
        ]);

        Event::assertDispatched(NotificationReceived::class, function (NotificationReceived $e) use ($freelancer) {
            return $e->user->id === $freelancer->id
                && ($e->payload['kind'] ?? null) === 'brief_completed';
        });
    }
}
