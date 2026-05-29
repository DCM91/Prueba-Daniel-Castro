<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class SearchHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'term' => $this->term,
            'results_count' => $this->results_count,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}