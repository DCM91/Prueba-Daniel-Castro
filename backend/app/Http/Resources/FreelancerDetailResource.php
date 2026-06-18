<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Review;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class FreelancerDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $cloudinary = app(CloudinaryServiceInterface::class);

        $skills = $this->relationLoaded('skills') ? $this->skills : collect();
        $portfolios = $this->relationLoaded('portfolios') ? $this->portfolios : collect();

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
            'bio'               => $this->bio,
            'city'              => $this->city,
            'hourly_rate'       => $this->hourly_rate !== null ? (float) $this->hourly_rate : null,
            'price_per_project' => $this->price_per_project !== null ? (float) $this->price_per_project : null,
            'is_available'      => (bool) $this->is_available,
            'cover_url'         => $this->cover_url,
            'cover_urls'        => $cloudinary->coverUrls($this->cover_public_id),
            'created_at'        => optional($this->user)->created_at?->toIso8601String(),
            'rating'            => $rating,
            'skills'            => $skills->map(fn ($s) => [
                'id'                => $s->id,
                'name'              => $s->name,
                'slug'              => $s->slug,
                'category'          => $s->category,
                'level'             => $s->pivot->level ?? null,
                'years_experience'  => $s->pivot->years_experience !== null ? (int) $s->pivot->years_experience : null,
            ])->values()->all(),
            'portfolios'        => $portfolios->map(fn ($p) => [
                'id'          => $p->id,
                'public_id'   => $p->public_id,
                'url'         => $p->url,
                'urls'        => $cloudinary->portfolioUrls($p->public_id),
                'width'       => $p->width,
                'height'      => $p->height,
                'format'      => $p->format,
                'bytes'       => $p->bytes,
                'title'       => $p->title,
                'description' => $p->description,
                'position'    => $p->position,
                'created_at'  => $p->created_at?->toIso8601String(),
            ])->values()->all(),
        ];
    }
}
