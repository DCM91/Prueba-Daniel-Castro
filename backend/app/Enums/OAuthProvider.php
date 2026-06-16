<?php

declare(strict_types=1);

namespace App\Enums;

enum OAuthProvider: string
{
    case Google = 'google';
    case Facebook = 'facebook';

    public static function labels(): array
    {
        return [
            self::Google->value   => 'Google',
            self::Facebook->value => 'Facebook',
        ];
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
