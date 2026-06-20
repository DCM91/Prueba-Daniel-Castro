<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationKind;
use App\Models\Brief;

/**
 * Notifies the assigned freelancer that the client has marked the
 * brief as completed. From here the freelancer can leave a review.
 */
final class BriefCompletedNotification extends BaseNotification
{
    public function __construct(public readonly Brief $brief)
    {
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'kind'        => $this->kind()->value,
            'title'       => 'Proyecto completado',
            'body'        => 'El cliente ha marcado "' . $this->brief->title . '" como completado.',
            'icon'        => 'flag',
            'link'        => '/briefs/' . $this->brief->id,
            'meta'        => [
                'brief_id' => $this->brief->id,
            ],
        ];
    }

    protected function resolveKind(): NotificationKind
    {
        return NotificationKind::BriefCompleted;
    }
}
