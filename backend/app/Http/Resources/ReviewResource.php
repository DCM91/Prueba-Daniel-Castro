<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'brief_id'     => $this->brief_id,
            'reviewer_id'  => $this->reviewer_id,
            'reviewee_id'  => $this->reviewee_id,
            'rating'       => $this->rating,
            'comment'      => $this->comment,
            'created_at'   => $this->created_at?->toIso8601String(),
            'updated_at'   => $this->updated_at?->toIso8601String(),
            'reviewer'     => $this->whenLoaded('reviewer', fn () => [
                'id'    => $this->reviewer->id,
                'name'  => $this->reviewer->name,
                'avatar_url' => $this->reviewer->avatar_url,
            ]),
            'reviewee'     => $this->whenLoaded('reviewee', fn () => [
                'id'    => $this->reviewee->id,
                'name'  => $this->reviewee->name,
                'avatar_url' => $this->reviewee->avatar_url,
            ]),
            'brief'        => $this->whenLoaded('brief', fn () => [
                'id'    => $this->brief->id,
                'title' => $this->brief->title,
            ]),
        ];
    }
}
