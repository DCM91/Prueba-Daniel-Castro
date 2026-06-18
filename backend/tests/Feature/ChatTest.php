<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BriefStatus;
use App\Enums\ProposalStatus;
use App\Enums\UserRole;
use App\Models\Brief;
use App\Models\Conversation;
use App\Models\FreelancerProfile;
use App\Models\Message;
use App\Models\Proposal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class ChatTest extends TestCase
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

    private function makeAcceptedConversation(): array
    {
        [$client, $clientToken] = $this->makeClient();
        [$freelancer, $freelancerToken] = $this->makeFreelancer();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief con chat',
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
            'price'         => 500,
            'status'        => ProposalStatus::Accepted->value,
        ]);
        $conversation = Conversation::create([
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
            'conversation'   => $conversation,
        ];
    }

    public function test_index_returns_user_conversations_with_unread_count(): void
    {
        $ctx = $this->makeAcceptedConversation();
        Message::create([
            'conversation_id' => $ctx['conversation']->id,
            'sender_id'       => $ctx['freelancer']->id,
            'body'            => 'Hola, ¿cómo vamos?',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson('/api/conversations')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id', 'brief_id', 'client_id', 'freelancer_id',
                        'last_message_at', 'unread_count',
                        'brief', 'client', 'freelancer',
                    ],
                ],
            ]);

        $this->assertCount(1, $response->json('data'));
        $this->assertSame(1, $response->json('data.0.unread_count'));
    }

    public function test_index_does_not_leak_other_user_conversations(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $stranger = User::factory()->create(['role' => UserRole::Client->value]);
        $strangerToken = JWTAuth::fromUser($stranger);

        $this->withHeader('Authorization', "Bearer {$strangerToken}")
            ->getJson('/api/conversations')
            ->assertStatus(200)
            ->assertJson(['data' => []]);
    }

    public function test_show_returns_conversation_with_participant(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson("/api/conversations/{$ctx['conversation']->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $ctx['conversation']->id)
            ->assertJsonPath('data.brief_id', $ctx['brief']->id);
    }

    public function test_show_rejects_non_participant(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $stranger = User::factory()->create(['role' => UserRole::Client->value]);
        $strangerToken = JWTAuth::fromUser($stranger);

        $this->withHeader('Authorization', "Bearer {$strangerToken}")
            ->getJson("/api/conversations/{$ctx['conversation']->id}")
            ->assertStatus(403);
    }

    public function test_show_returns_404_for_missing(): void
    {
        [$client, $token] = $this->makeClient();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/conversations/9999')
            ->assertStatus(404);
    }

    public function test_ensure_for_brief_creates_conversation_when_proposal_accepted(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $this->assertDatabaseHas('conversations', ['brief_id' => $ctx['brief']->id]);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/briefs/{$ctx['brief']->id}/conversation")
            ->assertStatus(201)
            ->assertJsonPath('data.brief_id', $ctx['brief']->id)
            ->assertJsonPath('data.client_id', $ctx['client']->id)
            ->assertJsonPath('data.freelancer_id', $ctx['freelancer']->id);

        $this->assertSame(1, Conversation::where('brief_id', $ctx['brief']->id)->count());
    }

    public function test_ensure_for_brief_fails_when_no_accepted_proposal(): void
    {
        [$client, $token] = $this->makeClient();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief sin propuestas aceptadas',
            'description'  => 'Descripcion suficientemente larga para el brief',
            'category'     => 'photo',
            'status'       => BriefStatus::Published->value,
            'published_at' => now(),
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/conversation")
            ->assertStatus(409);
    }

    public function test_send_message_stores_message_and_updates_last_message_at(): void
    {
        $ctx = $this->makeAcceptedConversation();

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages",
                ['body' => 'Hola, ¿cuándo puedes empezar?'])
            ->assertStatus(201)
            ->assertJsonPath('data.body', 'Hola, ¿cuándo puedes empezar?')
            ->assertJsonPath('data.sender_id', $ctx['client']->id)
            ->assertJsonPath('data.read_at', null);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $ctx['conversation']->id,
            'sender_id'       => $ctx['client']->id,
            'body'            => 'Hola, ¿cuándo puedes empezar?',
        ]);
        $ctx['conversation']->refresh();
        $this->assertNotNull($ctx['conversation']->last_message_at);
    }

    public function test_send_message_rejects_non_participant(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $stranger = User::factory()->create(['role' => UserRole::Client->value]);
        $strangerToken = JWTAuth::fromUser($stranger);

        $this->withHeader('Authorization', "Bearer {$strangerToken}")
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages",
                ['body' => 'Hackeo de conversación ajena'])
            ->assertStatus(403);
    }

    public function test_send_message_rejects_empty_body(): void
    {
        $ctx = $this->makeAcceptedConversation();

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages",
                ['body' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_send_message_rejects_too_long_body(): void
    {
        $ctx = $this->makeAcceptedConversation();

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages",
                ['body' => str_repeat('a', 2001)])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_send_message_requires_auth(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $this->postJson("/api/conversations/{$ctx['conversation']->id}/messages",
            ['body' => 'Hola'])
            ->assertStatus(401);
    }

    public function test_list_messages_returns_paginated_history(): void
    {
        $ctx = $this->makeAcceptedConversation();
        for ($i = 0; $i < 5; $i++) {
            Message::create([
                'conversation_id' => $ctx['conversation']->id,
                'sender_id'       => $i % 2 === 0 ? $ctx['client']->id : $ctx['freelancer']->id,
                'body'            => "msg $i",
                'created_at'      => Carbon::now()->subMinutes(10 - $i),
            ]);
        }

        $response = $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson("/api/conversations/{$ctx['conversation']->id}/messages?limit=3")
            ->assertStatus(200);

        $this->assertCount(3, $response->json('data'));
    }

    public function test_list_messages_since_filter_returns_only_newer(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $older = Message::create([
            'conversation_id' => $ctx['conversation']->id,
            'sender_id'       => $ctx['client']->id,
            'body'            => 'old',
            'created_at'      => Carbon::now()->subHour(),
        ]);
        $newer = Message::create([
            'conversation_id' => $ctx['conversation']->id,
            'sender_id'       => $ctx['freelancer']->id,
            'body'            => 'new',
            'created_at'      => Carbon::now(),
        ]);

        $sinceAt = Carbon::now()->subMinutes(30);
        $url = "/api/conversations/{$ctx['conversation']->id}/messages?since=" . rawurlencode($sinceAt->toIso8601String());
        $response = $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson($url)
            ->assertStatus(200);

        $this->assertCount(1, $response->json('data'));
        $this->assertSame('new', $response->json('data.0.body'));
    }

    public function test_mark_read_updates_only_messages_from_other_user(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $own = Message::create([
            'conversation_id' => $ctx['conversation']->id,
            'sender_id'       => $ctx['client']->id,
            'body'            => 'self',
        ]);
        $theirs = Message::create([
            'conversation_id' => $ctx['conversation']->id,
            'sender_id'       => $ctx['freelancer']->id,
            'body'            => 'other',
        ]);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/conversations/{$ctx['conversation']->id}/read")
            ->assertStatus(200)
            ->assertJsonPath('data.marked_count', 1);

        $this->assertNull($own->fresh()->read_at);
        $this->assertNotNull($theirs->fresh()->read_at);
    }

    public function test_unread_count_endpoint(): void
    {
        $ctx = $this->makeAcceptedConversation();
        Message::create([
            'conversation_id' => $ctx['conversation']->id,
            'sender_id'       => $ctx['freelancer']->id,
            'body'            => 'uno',
        ]);
        Message::create([
            'conversation_id' => $ctx['conversation']->id,
            'sender_id'       => $ctx['freelancer']->id,
            'body'            => 'dos',
        ]);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson('/api/conversations/unread-count')
            ->assertStatus(200)
            ->assertJsonPath('data.unread_count', 2);

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->postJson("/api/conversations/{$ctx['conversation']->id}/read");

        $this->withHeader('Authorization', "Bearer {$ctx['client_token']}")
            ->getJson('/api/conversations/unread-count')
            ->assertJsonPath('data.unread_count', 0);
    }

    public function test_accepting_proposal_creates_conversation(): void
    {
        [$client, $clientToken] = $this->makeClient();
        [$freelancer] = $this->makeFreelancer();
        $brief = Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief con propuestas',
            'description'  => 'Descripcion suficientemente larga para el brief',
            'category'     => 'photo',
            'status'       => BriefStatus::Published->value,
            'published_at' => now(),
        ]);
        $profile = FreelancerProfile::where('user_id', $freelancer->id)->first();
        $proposal = Proposal::create([
            'brief_id'      => $brief->id,
            'freelancer_id' => $profile->id,
            'message'       => 'Propuesta suficientemente larga para el brief',
            'price'         => 300,
            'status'        => ProposalStatus::Pending->value,
        ]);

        $this->withHeader('Authorization', "Bearer {$clientToken}")
            ->patchJson("/api/briefs/{$brief->id}/proposals/{$proposal->id}",
                ['status' => ProposalStatus::Accepted->value])
            ->assertStatus(200);

        $this->assertDatabaseHas('conversations', [
            'brief_id'      => $brief->id,
            'client_id'     => $client->id,
            'freelancer_id' => $freelancer->id,
        ]);
    }

    public function test_unauthenticated_cannot_list(): void
    {
        $this->getJson('/api/conversations')->assertStatus(401);
        $this->getJson('/api/conversations/unread-count')->assertStatus(401);
    }
}
