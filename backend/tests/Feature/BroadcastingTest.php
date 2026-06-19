<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BriefStatus;
use App\Enums\ProposalStatus;
use App\Enums\UserRole;
use App\Events\ConversationUpdated;
use App\Events\MessageSent;
use App\Events\UnreadCountChanged;
use App\Models\Brief;
use App\Models\Conversation;
use App\Models\FreelancerProfile;
use App\Models\Proposal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class BroadcastingTest extends TestCase
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
        return compact('client', 'clientToken', 'freelancer', 'freelancerToken', 'brief', 'conversation');
    }

    public function test_send_message_dispatches_message_sent_and_unread_count_events(): void
    {
        Event::fake([MessageSent::class, UnreadCountChanged::class]);

        $ctx = $this->makeAcceptedConversation();
        $body = 'Hola desde el cliente, mensaje lo bastante largo para pasar la validación.';

        $response = $this->withHeader('Authorization', 'Bearer ' . $ctx['clientToken'])
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages", ['body' => $body]);
        $response->assertStatus(201);

        Event::assertDispatched(MessageSent::class, 1);
        Event::assertDispatched(MessageSent::class, function (MessageSent $e) use ($ctx, $body) {
            return $e->message->conversation_id === $ctx['conversation']->id
                && $e->message->sender_id === $ctx['client']->id
                && $e->message->body === $body;
        });

        // UnreadCountChanged se emite para el counterpart (freelancer) y para el sender (0)
        Event::assertDispatched(UnreadCountChanged::class, function (UnreadCountChanged $e) use ($ctx) {
            return $e->userId === $ctx['freelancer']->id && $e->total === 1;
        });
        Event::assertDispatched(UnreadCountChanged::class, function (UnreadCountChanged $e) use ($ctx) {
            return $e->userId === $ctx['client']->id && $e->total === 0;
        });
    }

    public function test_send_message_does_not_dispatch_events_when_request_fails(): void
    {
        Event::fake([MessageSent::class, UnreadCountChanged::class]);

        $ctx = $this->makeAcceptedConversation();
        // Empty body fails validation (required)
        $this->withHeader('Authorization', 'Bearer ' . $ctx['clientToken'])
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages", ['body' => ''])
            ->assertStatus(422);

        Event::assertNotDispatched(MessageSent::class);
        Event::assertNotDispatched(UnreadCountChanged::class);
    }

    public function test_mark_read_dispatches_conversation_updated_and_unread_count_events(): void
    {
        Event::fake([MessageSent::class, ConversationUpdated::class, UnreadCountChanged::class]);

        $ctx = $this->makeAcceptedConversation();
        $body = 'Mensaje lo bastante largo para ser válido en el chat.';
        $this->withHeader('Authorization', 'Bearer ' . $ctx['clientToken'])
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages", ['body' => $body])
            ->assertStatus(201);

        Event::assertDispatched(MessageSent::class, 1);
        Event::assertDispatched(ConversationUpdated::class, 0);

        // Use actingAs to bypass the JWT state that may be cached from the
        // previous request in the same test.
        $this->actingAs($ctx['freelancer'], 'api')
            ->postJson("/api/conversations/{$ctx['conversation']->id}/read")
            ->assertStatus(200);

        Event::assertDispatched(ConversationUpdated::class, 1);
        Event::assertDispatched(ConversationUpdated::class, function (ConversationUpdated $e) use ($ctx) {
            return $e->conversation->id === $ctx['conversation']->id;
        });
    }

    public function test_mark_read_with_no_unread_messages_does_not_dispatch_events(): void
    {
        Event::fake([ConversationUpdated::class, UnreadCountChanged::class]);

        $ctx = $this->makeAcceptedConversation();
        // No messages sent, so markRead updates 0 rows.
        $this->withHeader('Authorization', 'Bearer ' . $ctx['clientToken'])
            ->postJson("/api/conversations/{$ctx['conversation']->id}/read")
            ->assertStatus(200);

        Event::assertNotDispatched(ConversationUpdated::class);
        Event::assertNotDispatched(UnreadCountChanged::class);
    }

    public function test_message_sent_event_broadcasts_on_private_conversation_channel(): void
    {
        Event::fake([MessageSent::class]);

        $ctx = $this->makeAcceptedConversation();
        $body = 'Mensaje de prueba con la longitud mínima requerida para validación.';
        $this->withHeader('Authorization', 'Bearer ' . $ctx['clientToken'])
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages", ['body' => $body])
            ->assertStatus(201);

        Event::assertDispatched(MessageSent::class, function (MessageSent $e) use ($ctx) {
            $channels = $e->broadcastOn();
            return count($channels) === 1
                && $channels[0]->name === 'private-conversation.' . $ctx['conversation']->id;
        });
    }

    public function test_unread_count_changed_broadcasts_on_private_user_channel(): void
    {
        Event::fake([UnreadCountChanged::class]);

        $ctx = $this->makeAcceptedConversation();
        $body = 'Mensaje para verificar la emisión del evento UnreadCountChanged.';
        $this->withHeader('Authorization', 'Bearer ' . $ctx['clientToken'])
            ->postJson("/api/conversations/{$ctx['conversation']->id}/messages", ['body' => $body])
            ->assertStatus(201);

        Event::assertDispatched(UnreadCountChanged::class, function (UnreadCountChanged $e) use ($ctx) {
            $channels = $e->broadcastOn();
            return count($channels) === 1
                && $channels[0]->name === 'private-user.' . $ctx['freelancer']->id;
        });
    }

    public function test_private_conversation_channel_authorizes_participant(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $authorizer = new \App\Broadcasting\ChatChannelAuthorizer();

        $this->assertTrue($authorizer->authorizeConversation($ctx['client']->id, $ctx['conversation']->id));
        $this->assertTrue($authorizer->authorizeConversation($ctx['freelancer']->id, $ctx['conversation']->id));
    }

    public function test_private_conversation_channel_rejects_non_participant(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $stranger = User::factory()->create(['role' => UserRole::Client->value]);
        $authorizer = new \App\Broadcasting\ChatChannelAuthorizer();

        $this->assertFalse($authorizer->authorizeConversation($stranger->id, $ctx['conversation']->id));
    }

    public function test_private_conversation_channel_rejects_unknown_conversation(): void
    {
        $authorizer = new \App\Broadcasting\ChatChannelAuthorizer();
        $this->assertFalse($authorizer->authorizeConversation(1, 999_999));
    }

    public function test_private_user_channel_only_authorizes_self(): void
    {
        $ctx = $this->makeAcceptedConversation();
        $authorizer = new \App\Broadcasting\ChatChannelAuthorizer();

        $this->assertTrue($authorizer->authorizeUser($ctx['client']->id, $ctx['client']->id));
        $this->assertFalse($authorizer->authorizeUser($ctx['freelancer']->id, $ctx['client']->id));
    }
}
