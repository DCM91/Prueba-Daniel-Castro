<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationKind;
use App\Models\Brief;
use App\Models\Proposal;

/**
 * Notifies a freelancer that the client accepted their proposal and
 * the brief is now assigned to them.
 */
final class ProposalAcceptedNotification extends BaseNotification
{
    public function __construct(
        public readonly Brief $brief,
        public readonly Proposal $proposal,
    ) {
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'kind'        => $this->kind()->value,
            'title'       => '¡Tu propuesta ha sido aceptada!',
            'body'        => 'Has sido asignado al proyecto "' . $this->brief->title . '".',
            'icon'        => 'check-circle',
            'link'        => '/briefs/' . $this->brief->id,
            'meta'        => [
                'brief_id'     => $this->brief->id,
                'proposal_id'  => $this->proposal->id,
            ],
        ];
    }

    protected function resolveKind(): NotificationKind
    {
        return NotificationKind::ProposalAccepted;
    }
}
