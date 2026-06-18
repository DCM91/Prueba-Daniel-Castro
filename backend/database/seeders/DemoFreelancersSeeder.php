<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\SkillCategory;
use App\Enums\SkillLevel;
use App\Enums\UserRole;
use App\Models\FreelancerProfile;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class DemoFreelancersSeeder extends Seeder
{
    public function run(): void
    {
        $demo = [
            [
                'name'              => 'Lucia Marin',
                'display_name'      => 'Lucia Marin Foto',
                'email'             => 'lucia.marin@example.com',
                'bio'               => 'Fotografa de producto con 8 anos de experiencia en ecommerce y catalogo. He trabajado con marcas de moda, cosmetica y tecnologia.',
                'hourly_rate'       => 55.00,
                'price_per_project' => 420.00,
                'skill_slugs'       => ['fotografia-de-producto', 'fotografia-de-moda'],
            ],
            [
                'name'              => 'Diego Soto',
                'display_name'      => 'Diego Soto Studio',
                'email'             => 'diego.soto@example.com',
                'bio'               => 'Director de fotografia especializado en video corporativo y brand films. Equipo propio de iluminacion y camaras 4K.',
                'hourly_rate'       => 75.00,
                'price_per_project' => 850.00,
                'skill_slugs'       => ['video-corporativo', 'video-publicitario', 'edicion-de-video'],
            ],
            [
                'name'              => 'Nuria Reyes',
                'display_name'      => 'Nuria Reyes Eventos',
                'email'             => 'nuria.reyes@example.com',
                'bio'               => 'Fotografa de bodas y eventos sociales. Estilo natural, reportaje documentado y post-produccion cuidadosa.',
                'hourly_rate'       => 45.00,
                'price_per_project' => 600.00,
                'skill_slugs'       => ['fotografia-de-eventos', 'video-de-bodas', 'edicion-de-video'],
            ],
            [
                'name'              => 'Marcos Vidal',
                'display_name'      => 'Marcos Vidal Color',
                'email'             => 'marcos.vidal@example.com',
                'bio'               => 'Editor y colorista. Da el look final a peliculas, cortometrajes y brand content. Dominio de DaVinci Resolve y Premiere Pro.',
                'hourly_rate'       => 60.00,
                'price_per_project' => 380.00,
                'skill_slugs'       => ['edicion-de-video', 'color-grading', 'motion-graphics'],
            ],
            [
                'name'              => 'Aitana Beltran',
                'display_name'      => 'Aitana Beltran Drone',
                'email'             => 'aitana.beltran@example.com',
                'bio'               => 'Piloto de dron certificada AESA. Tomas aereas para inmobiliarias, eventos y publicidad. Equipo 4K con estabilizador de 3 ejes.',
                'hourly_rate'       => 80.00,
                'price_per_project' => 500.00,
                'skill_slugs'       => ['video-con-drone', 'fotografia-inmobiliaria', 'video-publicitario'],
            ],
            [
                'name'              => 'Pablo Heredia',
                'display_name'      => 'Pablo Heredia Motion',
                'email'             => 'pablo.heredia@example.com',
                'bio'               => 'Motion designer y editor freelance. Intros, lower thirds, animacion de logos y contenido para redes sociales.',
                'hourly_rate'       => 40.00,
                'price_per_project' => 250.00,
                'skill_slugs'       => ['motion-graphics', 'edicion-de-video', 'fotomontaje'],
            ],
        ];

        $levels = [
            SkillLevel::Junior->value,
            SkillLevel::Mid->value,
            SkillLevel::Senior->value,
        ];

        DB::transaction(function () use ($demo, $levels): void {
            foreach ($demo as $i => $row) {
                $user = User::updateOrCreate(
                    ['email' => $row['email']],
                    [
                        'name'              => $row['name'],
                        'role'              => UserRole::Freelancer,
                        'password'          => Hash::make('password123'),
                        'email_verified_at' => now(),
                    ]
                );

                $profile = FreelancerProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'display_name'      => $row['display_name'],
                        'bio'               => $row['bio'],
                        'hourly_rate'       => $row['hourly_rate'],
                        'price_per_project' => $row['price_per_project'],
                        'is_available'      => true,
                    ]
                );

                $skills = Skill::whereIn('slug', $row['skill_slugs'])->get();
                $sync = [];
                foreach ($skills as $j => $skill) {
                    $sync[$skill->id] = [
                        'level'            => $levels[$j % count($levels)],
                        'years_experience' => 2 + $j,
                    ];
                }
                $profile->skills()->sync($sync);
            }
        });
    }
}
