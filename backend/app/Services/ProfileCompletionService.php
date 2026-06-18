<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\FreelancerProfile;

final class ProfileCompletionService
{
    /**
     * Single source of truth for the "profile completion %".
     *
     * Consumed by:
     *   - FreelancerCardResource (catálogo público)
     *   - FreelancerCatalogController::applySort() (orden "featured")
     *   - GET /api/me/completion (SPA wizard + home)
     *   - El futuro wizard de onboarding (Bloque 3)
     *
     * Suma 100. Incluye avatar/cover/portfolio (que la fórmula legacy
     * ignoraba), y lee `city` de `users.city` (migración de Bloque 2.5
     * elimina `freelancer_profiles.city`).
     */
    public const WEIGHTS = [
        'display_name'      => 15,
        'bio'               => 20,
        'city'              => 10,
        'hourly_rate'       => 10,
        'price_per_project' => 10,
        'is_available'      => 5,
        'skills'            => 10,
        'avatar'            => 10,
        'cover'             => 5,
        'portfolio'         => 5,
    ];

    /**
     * @return array{pct: int, missing: string[]}
     */
    public function calculate(FreelancerProfile $profile): array
    {
        $score = 0;
        $missing = [];

        if ($this->isFilled($profile->display_name)) {
            $score += self::WEIGHTS['display_name'];
        } else {
            $missing[] = 'display_name';
        }

        if ($this->isFilled($profile->bio)) {
            $score += self::WEIGHTS['bio'];
        } else {
            $missing[] = 'bio';
        }

        $city = $profile->user?->city;
        if ($this->isFilled($city)) {
            $score += self::WEIGHTS['city'];
        } else {
            $missing[] = 'city';
        }

        if ($profile->hourly_rate !== null) {
            $score += self::WEIGHTS['hourly_rate'];
        } else {
            $missing[] = 'hourly_rate';
        }

        if ($profile->price_per_project !== null) {
            $score += self::WEIGHTS['price_per_project'];
        } else {
            $missing[] = 'price_per_project';
        }

        if ($profile->is_available) {
            $score += self::WEIGHTS['is_available'];
        } else {
            $missing[] = 'is_available';
        }

        $skillCount = $profile->relationLoaded('skills') ? $profile->skills->count() : null;
        if ($skillCount !== null && $skillCount >= 1) {
            $score += self::WEIGHTS['skills'];
        } elseif ($skillCount === null) {
            $missing[] = 'skills';
        } else {
            $missing[] = 'skills';
        }

        $avatarPublicId = $profile->user?->avatar_public_id;
        if ($this->isFilled($avatarPublicId)) {
            $score += self::WEIGHTS['avatar'];
        } else {
            $missing[] = 'avatar';
        }

        if ($this->isFilled($profile->cover_public_id)) {
            $score += self::WEIGHTS['cover'];
        } else {
            $missing[] = 'cover';
        }

        $portfolioCount = $profile->relationLoaded('portfolios') ? $profile->portfolios->count() : null;
        if ($portfolioCount !== null && $portfolioCount >= 3) {
            $score += self::WEIGHTS['portfolio'];
        } elseif ($portfolioCount === null) {
            $missing[] = 'portfolio';
        } else {
            $missing[] = 'portfolio';
        }

        return [
            'pct'     => (int) $score,
            'missing' => $missing,
        ];
    }

    private function isFilled(mixed $value): bool
    {
        if ($value === null) {
            return false;
        }
        if (is_string($value) && trim($value) === '') {
            return false;
        }
        return true;
    }
}
