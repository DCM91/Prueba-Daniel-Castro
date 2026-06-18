<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\FreelancerProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FreelancerProfile>
 */
final class FreelancerProfileFactory extends Factory
{
    protected $model = FreelancerProfile::class;

    public function definition(): array
    {
        return [
            'user_id'           => User::factory()->state([
                'role' => UserRole::Freelancer,
                'city' => fake()->city(),
            ]),
            'display_name'      => fake()->name(),
            'bio'               => fake()->paragraph(),
            'hourly_rate'       => fake()->randomFloat(2, 10, 200),
            'price_per_project' => fake()->randomFloat(2, 50, 5000),
            'is_available'      => true,
        ];
    }

    public function unavailable(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_available' => false,
        ]);
    }
}
