<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationKind;
use App\Models\Brief;
use App\Models\Proposal;

/**
 * Notifies a freelancer that the client rejected their proposal.
 */
final class ProposalRejectedNotification extends BaseNotification
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
            'title'       => 'Propuesta rechazada',
            'body'        => 'Tu propuesta para "' . $this->brief->title . '" no ha sido aceptada.',
            'icon'        => 'x-circle',
            'link'        => '/briefs/' . $this->brief->id,
            'meta'        => [
                'brief_id'     => $this->brief->id,
                'proposal_id'  => $this->proposal->id,
            ],
        ];
    }

    protected function resolveKind(): NotificationKind
    {
        return NotificationKind::ProposalRejected;
    }
}
