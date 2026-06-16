<?php

declare(strict_types=1);

namespace App\Enums;

enum SkillCategory: string
{
    case Photo = 'photo';
    case Video = 'video';
    case Edit = 'edit';
    case Content = 'content';

    public static function labels(): array
    {
        return [
            self::Photo->value   => 'Fotografía',
            self::Video->value   => 'Video',
            self::Edit->value    => 'Edición',
            self::Content->value => 'Creación de Contenido',
        ];
    }
}
