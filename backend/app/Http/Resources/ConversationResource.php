<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $unread = $this->unread_count ?? null;
        $data = [
            'id'              => $this->id,
            'brief_id'        => $this->brief_id,
            'client_id'       => $this->client_id,
            'freelancer_id'   => $this->freelancer_id,
            'last_message_at' => $this->last_message_at?->toIso8601String(),
            'created_at'      => $this->created_at?->toIso8601String(),
            'unread_count'    => $unread,
        ];

        if ($this->relationLoaded('brief')) {
            $data['brief'] = [
                'id'    => $this->brief->id,
                'title' => $this->brief->title,
                'status' => $this->brief->status instanceof \BackedEnum ? $this->brief->status->value : $this->brief->status,
            ];
        }

        if ($this->relationLoaded('client')) {
            $data['client'] = [
                'id'    => $this->client->id,
                'name'  => $this->client->name,
                'avatar_url' => $this->client->avatar_url,
            ];
        }

        if ($this->relationLoaded('freelancer')) {
            $data['freelancer'] = [
                'id'    => $this->freelancer->id,
                'name'  => $this->freelancer->name,
                'avatar_url' => $this->freelancer->avatar_url,
            ];
        }

        if ($this->relationLoaded('messages')) {
            $data['latest_message'] = $this->messages->last()
                ? (new MessageResource($this->messages->last()))->toArray($request)
                : null;
        }

        return $data;
    }
}
