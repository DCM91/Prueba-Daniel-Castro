<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;

/**
 * @mixin DatabaseNotification
 */
final class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = (array) ($this->data ?? []);

        return [
            'id'         => (string) $this->id,
            'kind'       => $data['kind'] ?? null,
            'title'      => $data['title'] ?? '',
            'body'       => $data['body'] ?? '',
            'icon'       => $data['icon'] ?? null,
            'link'       => $data['link'] ?? null,
            'meta'       => $data['meta'] ?? null,
            'read_at'    => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
