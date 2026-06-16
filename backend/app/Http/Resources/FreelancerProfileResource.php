<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class FreelancerProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var CloudinaryServiceInterface $cloudinary */
        $cloudinary = app(CloudinaryServiceInterface::class);

        $data = [
            'id'                => $this->id,
            'user_id'           => $this->user_id,
            'display_name'      => $this->display_name,
            'bio'               => $this->bio,
            'city'              => $this->city,
            'hourly_rate'       => $this->hourly_rate !== null ? (float) $this->hourly_rate : null,
            'price_per_project' => $this->price_per_project !== null ? (float) $this->price_per_project : null,
            'is_available'      => (bool) $this->is_available,
            'cover_url'         => $this->cover_url,
            'cover_urls'        => $cloudinary->coverUrls($this->cover_public_id),
            'skills'            => $this->relationLoaded('skills')
                ? $this->skills->map(fn ($s) => [
                    'id'                => $s->id,
                    'name'              => $s->name,
                    'slug'              => $s->slug,
                    'category'          => $s->category,
                    'level'             => $s->pivot->level ?? null,
                    'years_experience'  => $s->pivot->years_experience !== null ? (int) $s->pivot->years_experience : null,
                ])->all()
                : [],
        ];

        if ($this->relationLoaded('portfolios')) {
            $data['portfolios'] = $this->portfolios->map(fn ($p) => [
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
            ])->all();
        }

        return $data;
    }
}
