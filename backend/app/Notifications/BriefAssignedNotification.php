<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationKind;
use App\Models\Brief;

/**
 * Notifies a freelancer that a brief has been moved to `assigned` and
 * they are the chosen professional. Functionally the same as
 * {@see ProposalAcceptedNotification} but emitted with a distinct kind
 * so the frontend can show a more prominent copy.
 */
final class BriefAssignedNotification extends BaseNotification
{
    public function __construct(public readonly Brief $brief)
    {
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'kind'        => $this->kind()->value,
            'title'       => 'Nuevo proyecto asignado',
            'body'        => 'Te han asignado el proyecto "' . $this->brief->title . '".',
            'icon'        => 'briefcase',
            'link'        => '/briefs/' . $this->brief->id,
            'meta'        => [
                'brief_id' => $this->brief->id,
            ],
        ];
    }

    protected function resolveKind(): NotificationKind
    {
        return NotificationKind::BriefAssigned;
    }
}
