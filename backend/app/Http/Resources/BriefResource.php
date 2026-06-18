<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class BriefResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'client_id'    => $this->client_id,
            'title'        => $this->title,
            'description'  => $this->description,
            'category'     => $this->category,
            'city'         => $this->city,
            'budget_min'   => $this->budget_min !== null ? (float) $this->budget_min : null,
            'budget_max'   => $this->budget_max !== null ? (float) $this->budget_max : null,
            'deadline'     => $this->deadline?->toDateString(),
            'status'       => $this->status?->value ?? $this->status,
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at'   => $this->created_at?->toIso8601String(),
            'proposals_count' => $this->whenCounted('proposals'),
            'client'       => $this->whenLoaded('client', fn () => [
                'id'    => $this->client->id,
                'name'  => $this->client->name,
            ]),
            'attachments' => $this->whenLoaded('attachments', fn () =>
                BriefAttachmentResource::collection($this->attachments)->resolve()
            ),
        ];
    }
}
