<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationKind;
use App\Models\Brief;
use App\Models\Proposal;

/**
 * Notifies the client that a freelancer has submitted a proposal on
 * one of their briefs.
 */
final class ProposalReceivedNotification extends BaseNotification
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
            'title'       => 'Nueva propuesta recibida',
            'body'        => 'Has recibido una propuesta para "' . $this->brief->title . '".',
            'icon'        => 'inbox',
            'link'        => '/briefs/' . $this->brief->id,
            'meta'        => [
                'brief_id'     => $this->brief->id,
                'proposal_id'  => $this->proposal->id,
            ],
        ];
    }

    protected function resolveKind(): NotificationKind
    {
        return NotificationKind::ProposalReceived;
    }
}
