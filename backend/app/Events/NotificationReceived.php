<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcasted on `private-user.{userId}` whenever a new in-app
 * notification is persisted. The frontend subscribes to this event on
 * its own private channel (the same one used by `UnreadCountChanged`)
 * and prepends the payload to the bell dropdown.
 */
final class NotificationReceived implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly User $user,
        public readonly string $notificationId,
        public readonly array $payload,
    ) {
    }

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->user->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.received';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id'              => $this->notificationId,
            'kind'            => $this->payload['kind'] ?? null,
            'title'           => $this->payload['title'] ?? '',
            'body'            => $this->payload['body'] ?? '',
            'icon'            => $this->payload['icon'] ?? null,
            'link'            => $this->payload['link'] ?? null,
            'meta'            => $this->payload['meta'] ?? null,
            'read_at'         => null,
            'created_at'      => now()->toIso8601String(),
        ];
    }
}
