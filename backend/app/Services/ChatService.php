<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\BriefStatus;
use App\Enums\ProposalStatus;
use App\Events\ConversationUpdated;
use App\Events\MessageSent;
use App\Events\UnreadCountChanged;
use App\Models\Brief;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Proposal;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ChatService
{
    public function getOrCreateForBrief(Brief $brief): Conversation
    {
        return DB::transaction(function () use ($brief) {
            $existing = Conversation::query()->where('brief_id', $brief->id)->first();
            if ($existing !== null) {
                return $existing;
            }

            $acceptedProposal = Proposal::query()
                ->where('brief_id', $brief->id)
                ->where('status', ProposalStatus::Accepted->value)
                ->first();

            if ($acceptedProposal === null) {
                throw new ConflictHttpException(
                    'El brief no tiene ninguna propuesta aceptada todavía.',
                );
            }

            $freelancerUserId = $acceptedProposal->freelancerProfile?->user_id;
            if ($freelancerUserId === null) {
                throw new ConflictHttpException(
                    'La propuesta aceptada no tiene un freelancer asociado.',
                );
            }

            return Conversation::create([
                'brief_id'      => $brief->id,
                'client_id'     => $brief->client_id,
                'freelancer_id' => $freelancerUserId,
            ]);
        });
    }

    public function ensureParticipant(Conversation $conversation, int $userId): void
    {
        if (! $conversation->hasParticipant($userId)) {
            throw new AccessDeniedHttpException('No participas en esta conversación.');
        }
    }

    public function listForUser(User $user, int $limit = 50): Collection
    {
        return Conversation::query()
            ->where(function (Builder $q) use ($user) {
                $q->where('client_id', $user->id)
                    ->orWhere('freelancer_id', $user->id);
            })
            ->with(['client', 'freelancer', 'brief'])
            ->withCount([
                'messages as unread_count' => function (Builder $q) use ($user) {
                    $q->whereNull('read_at')->where('sender_id', '!=', $user->id);
                },
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function findForUser(User $user, int $conversationId): Conversation
    {
        $conversation = Conversation::query()
            ->with(['client', 'freelancer', 'brief'])
            ->find($conversationId);

        if ($conversation === null) {
            throw new NotFoundHttpException('Conversación no encontrada.');
        }

        $this->ensureParticipant($conversation, $user->id);
        return $conversation;
    }

    public function listMessages(Conversation $conversation, int $userId, ?string $since, int $limit = 50): array
    {
        $query = $conversation->messages()->with('sender');

        if ($since !== null && $since !== '') {
            $normalized = str_contains($since, ' ') ? preg_replace('/ /', '+', $since, 1) : $since;
            try {
                $sinceAt = Carbon::parse($normalized);
                $query->where('created_at', '>', $sinceAt);
            } catch (\Throwable) {
            }
        }

        $messages = $query->orderBy('created_at')->orderBy('id')->limit($limit)->get();
        $hasMore  = $messages->count() === $limit;
        $earliest = $conversation->messages()->min('created_at');
        $latest   = $messages->last()?->created_at?->toIso8601String();

        return [
            'data'              => $messages,
            'has_more'          => $hasMore,
            'earliest_at'       => $earliest !== null ? Carbon::parse($earliest)->toIso8601String() : null,
            'latest_at'         => $latest,
        ];
    }

    public function sendMessage(Conversation $conversation, User $sender, string $body): Message
    {
        $message = DB::transaction(function () use ($conversation, $sender, $body) {
            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id'       => $sender->id,
                'body'            => $body,
            ]);
            $conversation->forceFill(['last_message_at' => $message->created_at])->save();
            return $message;
        });

        $message = $message->load('sender');

        MessageSent::dispatch($message);

        $counterpartId = $conversation->counterpart($sender->id);
        UnreadCountChanged::dispatch($counterpartId, $this->totalUnreadById($counterpartId));
        UnreadCountChanged::dispatch($sender->id, $this->totalUnreadById($sender->id));

        return $message;
    }

    public function markRead(Conversation $conversation, User $reader): int
    {
        $updated = Message::query()
            ->where('conversation_id', $conversation->id)
            ->whereNull('read_at')
            ->where('sender_id', '!=', $reader->id)
            ->update(['read_at' => Carbon::now()]);

        if ($updated > 0) {
            ConversationUpdated::dispatch($conversation);
            UnreadCountChanged::dispatch($reader->id, $this->totalUnreadById($reader->id));
        }

        return $updated;
    }

    private function totalUnreadById(int $userId): int
    {
        $conversationIds = Conversation::query()
            ->where('client_id', $userId)
            ->orWhere('freelancer_id', $userId)
            ->pluck('id')
            ->all();

        if ($conversationIds === []) {
            return 0;
        }

        return Message::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $userId)
            ->whereIn('conversation_id', $conversationIds)
            ->count();
    }

    public function totalUnread(User $user): int
    {
        return $this->totalUnreadById($user->id);
    }
}
