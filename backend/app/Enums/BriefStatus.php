<?php

declare(strict_types=1);

namespace App\Enums;

enum BriefStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case InReview = 'in_review';
    case Assigned = 'assigned';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
