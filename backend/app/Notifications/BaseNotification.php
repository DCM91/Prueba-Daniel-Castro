<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationKind;
use Illuminate\Notifications\Notification;

/**
 * Base class for in-app notifications. Each subclass declares a
 * {@see NotificationKind} and renders a small array payload that the
 * frontend uses to render the bell dropdown and the toast.
 *
 * Persisted in the `notifications` table via the `database` channel.
 * Real-time push is dispatched separately as a `NotificationReceived`
 * broadcast event by {@see \App\Services\NotificationService::send()}.
 */
abstract class BaseNotification extends Notification
{
    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    /**
     * Build the payload stored in `notifications.data` and pushed to the
     * frontend via WebSocket.
     *
     * @return array<string, mixed>
     */
    abstract public function toArray(mixed $notifiable): array;

    public function kind(): NotificationKind
    {
        return $this->resolveKind();
    }

    abstract protected function resolveKind(): NotificationKind;
}
