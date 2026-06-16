<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Client = 'client';
    case Freelancer = 'freelancer';
    case Agency = 'agency';
    case Company = 'company';
    case Admin = 'admin';

    public static function selfRegistrable(): array
    {
        return [self::Client->value, self::Freelancer->value];
    }

    public static function labels(): array
    {
        return [
            self::Client->value     => 'Cliente',
            self::Freelancer->value => 'Freelancer',
            self::Agency->value     => 'Agencia',
            self::Company->value    => 'Empresa',
            self::Admin->value      => 'Administrador',
        ];
    }
}
