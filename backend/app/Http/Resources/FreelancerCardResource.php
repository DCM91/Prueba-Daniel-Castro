<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Review;
use App\Services\ProfileCompletionService;
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

        $portfolios = $this->relationLoaded('portfolios') ? $this->portfolios : null;
        $resource = $this->resource;
        if ($portfolios !== null) {
            $resource->setRelation('portfolios', $portfolios);
        }
        $pct = app(ProfileCompletionService::class)->calculate($resource)['pct'];

        $rating = ['count' => 0, 'average' => null];
        if ($this->user_id !== null) {
            $row = Review::query()
                ->where('reviewee_id', $this->user_id)
                ->selectRaw('COUNT(*) as count, AVG(rating) as average')
                ->first();
            $rating = [
                'count'   => (int) ($row->count ?? 0),
                'average' => $row->average !== null ? round((float) $row->average, 2) : null,
            ];
        }

        return [
            'id'                => $this->id,
            'user_id'           => $this->user_id,
            'display_name'      => $this->display_name,
            'avatar_url'        => $this->user->avatar_url ?? null,
            'city'              => $this->user?->city,
            'hourly_rate'       => $this->hourly_rate !== null ? (float) $this->hourly_rate : null,
            'is_available'      => (bool) $this->is_available,
            'rating'            => $rating,
            'top_skills'        => $topSkills,
            'skills_count'      => $skills->count(),
            'profile_completion'=> $pct,
        ];
    }
}
