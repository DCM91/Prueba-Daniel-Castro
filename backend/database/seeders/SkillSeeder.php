<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\SkillCategory;
use App\Models\Skill;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

final class SkillSeeder extends Seeder
{
    public function run(): void
    {
        $skills = [
            ['name' => 'Fotografía de retrato',     'category' => SkillCategory::Photo],
            ['name' => 'Fotografía de producto',    'category' => SkillCategory::Photo],
            ['name' => 'Fotografía de eventos',     'category' => SkillCategory::Photo],
            ['name' => 'Fotografía de moda',        'category' => SkillCategory::Photo],
            ['name' => 'Fotografía inmobiliaria',   'category' => SkillCategory::Photo],
            ['name' => 'Fotografía gastronómica',   'category' => SkillCategory::Photo],
            ['name' => 'Fotografía deportiva',      'category' => SkillCategory::Photo],
            ['name' => 'Fotografía de paisaje',     'category' => SkillCategory::Photo],
            ['name' => 'Video corporativo',         'category' => SkillCategory::Video],
            ['name' => 'Video de bodas',            'category' => SkillCategory::Video],
            ['name' => 'Video de eventos',          'category' => SkillCategory::Video],
            ['name' => 'Video documental',          'category' => SkillCategory::Video],
            ['name' => 'Video publicitario',        'category' => SkillCategory::Video],
            ['name' => 'Video con drone',           'category' => SkillCategory::Video],
            ['name' => 'Video para redes sociales', 'category' => SkillCategory::Video],
            ['name' => 'Video para YouTube',        'category' => SkillCategory::Video],
            ['name' => 'Edición de video',          'category' => SkillCategory::Edit],
            ['name' => 'Color grading',             'category' => SkillCategory::Edit],
            ['name' => 'Motion graphics',           'category' => SkillCategory::Edit],
            ['name' => 'Fotomontaje',               'category' => SkillCategory::Edit],
            ['name' => 'Subtitulado',               'category' => SkillCategory::Edit],
            ['name' => 'VFX y efectos visuales',    'category' => SkillCategory::Edit],
            ['name' => 'Edición de audio',          'category' => SkillCategory::Edit],
            ['name' => 'Retoque fotográfico',       'category' => SkillCategory::Edit],
            ['name' => 'Copywriting',               'category' => SkillCategory::Content],
            ['name' => 'Guion para vídeo',          'category' => SkillCategory::Content],
            ['name' => 'Gestión de redes sociales', 'category' => SkillCategory::Content],
            ['name' => 'Producción de pódcast',     'category' => SkillCategory::Content],
            ['name' => 'Locución',                  'category' => SkillCategory::Content],
            ['name' => 'Newsletter y email marketing', 'category' => SkillCategory::Content],
        ];

        foreach ($skills as $skill) {
            Skill::updateOrCreate(
                ['slug' => Str::slug($skill['name'])],
                [
                    'name'      => $skill['name'],
                    'category'  => $skill['category'],
                    'is_active' => true,
                ]
            );
        }
    }
}
