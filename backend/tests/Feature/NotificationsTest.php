<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BriefStatus;
use App\Enums\UserRole;
use App\Models\Brief;
use App\Models\User;
use App\Notifications\BriefCompletedNotification;
use App\Notifications\ProposalReceivedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function authHeader(User $user): array
    {
        return ['Authorization' => 'Bearer ' . JWTAuth::fromUser($user)];
    }

    public function test_unread_count_returns_zero_for_new_user(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($user))
            ->getJson('/api/me/notifications/unread-count')
            ->assertStatus(200)
            ->assertJsonPath('data.total', 0);
    }

    public function test_index_returns_paginated_list(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);
        $this->send($user, new ProposalReceivedNotification(
            $this->makeBrief($user),
            $this->makeProposal($user),
        ));

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($user))
            ->getJson('/api/me/notifications')
            ->assertStatus(200)
            ->assertJsonPath('data.0.kind', 'proposal_received')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.current_page', 1);
    }

    public function test_index_can_filter_unread_only(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);

        $first = $this->send($user, new ProposalReceivedNotification(
            $this->makeBrief($user),
            $this->makeProposal($user),
        ));
        $this->send($user, new BriefCompletedNotification($this->makeBrief($user, BriefStatus::Completed)));
        $first->markAsRead();

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($user))
            ->getJson('/api/me/notifications?unread_only=true')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_unread_count_reflects_persisted_notifications(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);
        $this->send($user, new ProposalReceivedNotification(
            $this->makeBrief($user),
            $this->makeProposal($user),
        ));
        $this->send($user, new BriefCompletedNotification($this->makeBrief($user, BriefStatus::Completed)));

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($user))
            ->getJson('/api/me/notifications/unread-count')
            ->assertStatus(200)
            ->assertJsonPath('data.total', 2);
    }

    public function test_mark_read_marks_a_single_notification(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);
        $stored = $this->send($user, new ProposalReceivedNotification(
            $this->makeBrief($user),
            $this->makeProposal($user),
        ));

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($user))
            ->postJson("/api/me/notifications/{$stored->id}/read")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $stored->id)
            ->assertJsonPath('data.read_at', fn ($v) => $v !== null);

        $this->assertDatabaseHas('notifications', [
            'id'      => $stored->id,
            'read_at' => now()->toDateTimeString(),
        ]);
    }

    public function test_mark_read_returns_404_for_unknown_notification(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($user))
            ->postJson('/api/me/notifications/00000000-0000-0000-0000-000000000000/read')
            ->assertStatus(404);
    }

    public function test_mark_read_returns_404_for_notification_belonging_to_other_user(): void
    {
        $alice = User::factory()->create(['role' => UserRole::Client->value]);
        $bob = User::factory()->create(['role' => UserRole::Client->value]);

        $stored = $this->send($alice, new ProposalReceivedNotification(
            $this->makeBrief($alice),
            $this->makeProposal($alice),
        ));

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($bob))
            ->postJson("/api/me/notifications/{$stored->id}/read")
            ->assertStatus(404);
    }

    public function test_mark_read_requires_authentication(): void
    {
        $this->postJson('/api/me/notifications/00000000-0000-0000-0000-000000000000/read')
            ->assertStatus(401);
    }

    public function test_mark_all_read_marks_every_unread_notification(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);
        $this->send($user, new ProposalReceivedNotification(
            $this->makeBrief($user),
            $this->makeProposal($user),
        ));
        $this->send($user, new BriefCompletedNotification($this->makeBrief($user, BriefStatus::Completed)));

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($user))
            ->postJson('/api/me/notifications/read-all')
            ->assertStatus(200)
            ->assertJsonPath('data.updated', 2);

        $this->getJson('/api/me/notifications/unread-count')
            ->assertJsonPath('data.total', 0);
    }

    public function test_mark_all_read_with_no_unread_returns_zero(): void
    {
        $user = User::factory()->create(['role' => UserRole::Client->value]);

        $this->withHeader('Authorization', 'Bearer ' . JWTAuth::fromUser($user))
            ->postJson('/api/me/notifications/read-all')
            ->assertStatus(200)
            ->assertJsonPath('data.updated', 0);
    }

    private function send(User $user, \Illuminate\Notifications\Notification $notification): \Illuminate\Notifications\DatabaseNotification
    {
        return app(\App\Services\NotificationService::class)->send($user, $notification);
    }

    private function makeBrief(User $client, ?BriefStatus $status = null): Brief
    {
        return Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief de prueba',
            'description'  => 'Descripcion suficientemente larga para validar el brief.',
            'category'     => 'photo',
            'status'       => ($status ?? BriefStatus::Published)->value,
            'published_at' => now(),
        ]);
    }

    private function makeProposal(User $client): \App\Models\Proposal
    {
        $freelancer = User::factory()->freelancer()->create();
        $profile = \App\Models\FreelancerProfile::create([
            'user_id'      => $freelancer->id,
            'display_name' => 'Pro',
        ]);
        return \App\Models\Proposal::create([
            'brief_id'      => $this->makeBrief($client)->id,
            'freelancer_id' => $profile->id,
            'message'       => 'Propuesta lo bastante larga para validar el endpoint.',
            'price'         => 500,
            'status'        => \App\Enums\ProposalStatus::Pending->value,
        ]);
    }
}
