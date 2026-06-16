<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ProposalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'brief_id'        => $this->brief_id,
            'freelancer_id'   => $this->freelancer_id,
            'message'         => $this->message,
            'price'           => $this->price !== null ? (float) $this->price : null,
            'status'          => $this->status?->value ?? $this->status,
            'created_at'      => $this->created_at?->toIso8601String(),
            'freelancer'      => $this->whenLoaded('freelancerProfile', fn () => [
                'id'           => $this->freelancerProfile->id,
                'user_id'      => $this->freelancerProfile->user_id,
                'display_name' => $this->freelancerProfile->display_name,
                'city'         => $this->freelancerProfile->city,
                'hourly_rate'  => $this->freelancerProfile->hourly_rate !== null ? (float) $this->freelancerProfile->hourly_rate : null,
            ]),
        ];
    }
}
