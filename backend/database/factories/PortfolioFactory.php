<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\FreelancerProfile;
use App\Models\Portfolio;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Portfolio>
 */
final class PortfolioFactory extends Factory
{
    protected $model = Portfolio::class;

    public function definition(): array
    {
        $profile = FreelancerProfile::factory()->create();

        return [
            'freelancer_profile_id' => $profile->id,
            'public_id'             => 'framematch/portfolios/fake-' . fake()->uuid(),
            'url'                   => 'https://res.cloudinary.com/demo/image/upload/v1/' . fake()->uuid() . '.jpg',
            'width'                 => 800,
            'height'                => 600,
            'format'                => 'jpg',
            'bytes'                 => 50000,
            'title'                 => fake()->sentence(3),
            'description'           => fake()->optional(0.5)->sentence(),
            'position'              => 0,
        ];
    }
}
