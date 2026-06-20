<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationKind;
use App\Models\Review;

/**
 * Notifies the recipient of a review that the other party has just
 * posted their rating and (optionally) a comment.
 */
final class ReviewReceivedNotification extends BaseNotification
{
    public function __construct(
        public readonly Review $review,
        public readonly int $rating,
        public readonly ?string $commentPreview,
    ) {
    }

    public function toArray(mixed $notifiable): array
    {
        $body = 'Has recibido una valoración de ' . $this->rating . '/5.';
        if ($this->commentPreview !== null && $this->commentPreview !== '') {
            $body .= ' "' . mb_substr($this->commentPreview, 0, 80) . '"';
        }

        return [
            'kind'        => $this->kind()->value,
            'title'       => 'Nueva valoración',
            'body'        => $body,
            'icon'        => 'star',
            'link'        => '/users/' . $this->review->reviewer_id,
            'meta'        => [
                'review_id'   => $this->review->id,
                'brief_id'    => $this->review->brief_id,
                'rating'      => $this->rating,
            ],
        ];
    }

    protected function resolveKind(): NotificationKind
    {
        return NotificationKind::ReviewReceived;
    }
}
