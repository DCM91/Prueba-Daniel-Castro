<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class FreelancerCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $skills = $this->relationLoaded('skills') ? $this->skills : collect();
        $topSkills = $skills->take(3)->map(fn ($s) => [
            'id'       => $s->id,
            'name'     => $s->name,
            'slug'     => $s->slug,
            'category' => $s->category,
            'level'    => $s->pivot->level ?? null,
        ])->values()->all();

        return [
            'id'                => $this->id,
            'user_id'           => $this->user_id,
            'display_name'      => $this->display_name,
            'avatar_url'        => $this->user->avatar_url ?? null,
            'city'              => $this->city,
            'hourly_rate'       => $this->hourly_rate !== null ? (float) $this->hourly_rate : null,
            'is_available'      => (bool) $this->is_available,
            'top_skills'        => $topSkills,
            'skills_count'      => $skills->count(),
            'profile_completion'=> $this->computeProfileCompletion(),
        ];
    }

    private function computeProfileCompletion(): int
    {
        $weights = [
            'display_name'      => 20,
            'bio'               => 25,
            'city'              => 15,
            'hourly_rate'       => 20,
            'price_per_project' => 10,
            'skills_at_least_1' => 10,
        ];

        $score = 0;
        $score += $this->display_name ? $weights['display_name'] : 0;
        $score += $this->bio ? $weights['bio'] : 0;
        $score += $this->city ? $weights['city'] : 0;
        $score += $this->hourly_rate !== null ? $weights['hourly_rate'] : 0;
        $score += $this->price_per_project !== null ? $weights['price_per_project'] : 0;
        $score += $this->relationLoaded('skills') && $this->skills->count() > 0
            ? $weights['skills_at_least_1']
            : 0;

        return (int) $score;
    }
}
