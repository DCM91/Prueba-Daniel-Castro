<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id'       => $this->sender_id,
            'body'            => $this->body,
            'read_at'         => $this->read_at?->toIso8601String(),
            'created_at'      => $this->created_at?->toIso8601String(),
            'sender'          => $this->whenLoaded('sender', fn () => [
                'id'    => $this->sender->id,
                'name'  => $this->sender->name,
                'avatar_url' => $this->sender->avatar_url,
            ]),
        ];
    }
}
