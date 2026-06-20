<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\NotificationReceived;
use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Notifications\Notification;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Thin facade over Laravel's `Notifiable` trait. Persists the
 * notification in the `notifications` table and emits a real-time
 * `NotificationReceived` event on the user's private WebSocket
 * channel so the frontend can prepend the payload without polling.
 */
final class NotificationService
{
    public function send(User $user, Notification $notification): DatabaseNotification
    {
        $payload = method_exists($notification, 'toArray')
            ? (array) $notification->toArray($user)
            : [];

        $id = (string) Str::orderedUuid();
        $notification->id = $id;
        $user->notifyNow($notification);

        $stored = $user->notifications()->whereKey($id)->first();
        if ($stored === null) {
            throw new RuntimeException('Failed to persist notification.');
        }

        NotificationReceived::dispatch($user, $id, $payload);

        return $stored;
    }

    public function unreadCount(User $user): int
    {
        return $user->unreadNotifications()->count();
    }

    /**
     * @return LengthAwarePaginator<DatabaseNotification>
     */
    public function paginate(User $user, int $page, int $perPage, bool $unreadOnly): LengthAwarePaginator
    {
        $query = $user->notifications()->orderByDesc('created_at')->orderByDesc('id');
        if ($unreadOnly) {
            $query->whereNull('read_at');
        }
        return $query->paginate(perPage: $perPage, page: $page);
    }

    public function markRead(User $user, string $notificationId): DatabaseNotification
    {
        $notification = $user->notifications()->whereKey($notificationId)->first();
        if ($notification === null) {
            throw new NotFoundHttpException('Notificación no encontrada.');
        }
        if ($notification->read_at === null) {
            $notification->markAsRead();
        }
        return $notification->fresh();
    }

    public function markAllRead(User $user): int
    {
        return $user->unreadNotifications()->update(['read_at' => now()]);
    }

    /**
     * @return Collection<int, DatabaseNotification>
     */
    public function latest(User $user, int $limit = 10): Collection
    {
        return $user->notifications()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }
}
