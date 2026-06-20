<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NotificationsController extends Controller
{
    public function __construct(private readonly NotificationService $notifications)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401, 'No autenticado. Token inválido o expirado.');

        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));
        $unreadOnly = filter_var(
            $request->query('unread_only', false),
            FILTER_VALIDATE_BOOLEAN,
        );

        $paginator = $this->notifications->paginate($user, $page, $perPage, $unreadOnly);

        return response()->json([
            'data' => NotificationResource::collection($paginator->items())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401, 'No autenticado. Token inválido o expirado.');

        return response()->json([
            'data' => [
                'total' => $this->notifications->unreadCount($user),
            ],
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401, 'No autenticado. Token inválido o expirado.');

        $notification = $this->notifications->markRead($user, $id);

        return response()->json([
            'data' => (new NotificationResource($notification))->resolve(),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401, 'No autenticado. Token inválido o expirado.');

        $updated = $this->notifications->markAllRead($user);

        return response()->json([
            'data' => [
                'updated' => $updated,
            ],
        ]);
    }
}
