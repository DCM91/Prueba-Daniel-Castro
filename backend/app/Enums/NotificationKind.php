<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Stable identifier for the visual kind of a notification. Used by the
 * frontend to pick an icon and a title-key. Persisted inside the
 * `data` JSON column of the `notifications` table.
 */
enum NotificationKind: string
{
    case ProposalReceived = 'proposal_received';
    case ProposalAccepted = 'proposal_accepted';
    case ProposalRejected = 'proposal_rejected';
    case BriefAssigned    = 'brief_assigned';
    case BriefCompleted   = 'brief_completed';
    case ReviewReceived   = 'review_received';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $c): string => $c->value, self::cases());
    }
}
