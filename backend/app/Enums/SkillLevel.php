<?php

declare(strict_types=1);

namespace App\Enums;

enum SkillLevel: string
{
    case Junior = 'junior';
    case Mid = 'mid';
    case Senior = 'senior';

    public static function labels(): array
    {
        return [
            self::Junior->value => 'Junior',
            self::Mid->value    => 'Mid',
            self::Senior->value => 'Senior',
        ];
    }
}
