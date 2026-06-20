<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\BriefStatus;
use App\Enums\ProposalStatus;
use App\Models\Brief;
use App\Models\Conversation;
use App\Models\Proposal;
use App\Models\Review;
use App\Models\User;
use App\Notifications\BriefCompletedNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ReviewService
{
    public function __construct(private readonly NotificationService $notifications)
    {
    }

    public function completeBrief(Brief $brief, User $actor): Brief
    {
        if ($actor->id !== $brief->client_id) {
            throw new AccessDeniedHttpException('Solo el cliente puede marcar el proyecto como completado.');
        }

        if ($brief->status !== BriefStatus::Assigned) {
            throw new ConflictHttpException(
                'Solo se puede completar un brief en estado "asignado".',
            );
        }

        $brief->forceFill(['status' => BriefStatus::Completed])->save();
        $fresh = $brief->fresh();

        $conversation = Conversation::query()->where('brief_id', $brief->id)->first();
        if ($conversation !== null) {
            $freelancer = User::find($conversation->freelancer_id);
            if ($freelancer !== null) {
                $this->notifications->send($freelancer, new BriefCompletedNotification($fresh));
            }
        }

        return $fresh;
    }

    public function counterpartFor(Brief $brief, User $user): int
    {
        if ($user->id === $brief->client_id) {
            $conversation = Conversation::query()->where('brief_id', $brief->id)->first();
            abort_if($conversation === null, 404, 'Este brief no tiene una conversación activa.');
            return $conversation->freelancer_id;
        }

        $conversation = Conversation::query()->where('brief_id', $brief->id)->first();
        abort_if($conversation === null, 404, 'Este brief no tiene una conversación activa.');
        abort_unless($user->id === $conversation->freelancer_id, 403, 'No participas en este brief.');
        return $brief->client_id;
    }

    public function canReview(Brief $brief, User $reviewer): bool
    {
        if ($brief->status !== BriefStatus::Completed) {
            return false;
        }
        $conversation = Conversation::query()->where('brief_id', $brief->id)->first();
        if ($conversation === null) {
            return false;
        }
        $isClient = $reviewer->id === $brief->client_id;
        $isFreelancer = $reviewer->id === $conversation->freelancer_id;
        if (! $isClient && ! $isFreelancer) {
            return false;
        }
        return ! Review::query()
            ->where('brief_id', $brief->id)
            ->where('reviewer_id', $reviewer->id)
            ->exists();
    }

    public function create(Brief $brief, User $reviewer, int $rating, ?string $comment): Review
    {
        if ($brief->status !== BriefStatus::Completed) {
            throw new ConflictHttpException(
                'Solo se pueden dejar reviews cuando el proyecto está completado.',
            );
        }

        $conversation = Conversation::query()->where('brief_id', $brief->id)->first();
        if ($conversation === null) {
            throw new ConflictHttpException(
                'Este brief no tiene una conversación activa.',
            );
        }

        $isParticipant = $reviewer->id === $brief->client_id
            || $reviewer->id === $conversation->freelancer_id;
        if (! $isParticipant) {
            throw new AccessDeniedHttpException('No participas en este brief.');
        }

        $alreadyReviewed = Review::query()
            ->where('brief_id', $brief->id)
            ->where('reviewer_id', $reviewer->id)
            ->exists();
        if ($alreadyReviewed) {
            throw new ConflictHttpException('Ya has valorado este proyecto.');
        }

        $revieweeId = $this->counterpartFor($brief, $reviewer);

        return DB::transaction(function () use ($brief, $reviewer, $revieweeId, $rating, $comment) {
            return Review::create([
                'brief_id'     => $brief->id,
                'reviewer_id'  => $reviewer->id,
                'reviewee_id'  => $revieweeId,
                'rating'       => $rating,
                'comment'      => $comment,
            ]);
        });
    }

    public function listForUser(int $userId, int $limit = 20): Collection
    {
        return Review::query()
            ->where('reviewee_id', $userId)
            ->with(['reviewer', 'brief'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function update(Review $review, User $actor, int $rating, ?string $comment): Review
    {
        if ($actor->id !== $review->reviewer_id) {
            throw new AccessDeniedHttpException('Solo el autor de la reseña puede editarla.');
        }

        $review->forceFill([
            'rating'  => $rating,
            'comment' => $comment,
        ])->save();

        return $review->fresh();
    }

    public function destroy(Review $review, User $actor): void
    {
        if ($actor->id !== $review->reviewer_id) {
            throw new AccessDeniedHttpException('Solo el autor de la reseña puede eliminarla.');
        }

        $review->delete();
    }

    public function listForBrief(Brief $brief, ?User $viewer = null): Collection
    {
        $query = Review::query()
            ->where('brief_id', $brief->id)
            ->with(['reviewer', 'reviewee']);

        if ($viewer !== null) {
            $isClient = $viewer->id === $brief->client_id;
            $conversation = Conversation::query()->where('brief_id', $brief->id)->first();
            $isFreelancer = $conversation !== null && $viewer->id === $conversation->freelancer_id;
            abort_unless($isClient || $isFreelancer, 403, 'No participas en este brief.');
        }

        return $query->get();
    }

    public function aggregateForUser(int $userId): array
    {
        $row = Review::query()
            ->where('reviewee_id', $userId)
            ->selectRaw('COUNT(*) as count, AVG(rating) as average')
            ->first();

        return [
            'count'   => (int) ($row->count ?? 0),
            'average' => $row->average !== null ? round((float) $row->average, 2) : null,
        ];
    }
}
