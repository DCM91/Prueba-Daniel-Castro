<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\SendMessageRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Brief;
use App\Models\Conversation;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

final class ChatController extends Controller
{
    public function __construct(private readonly ChatService $chat)
    {
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = JWTAuth::user();
        $conversations = $this->chat->listForUser($user);

        return response()->json([
            'data' => ConversationResource::collection($conversations)->resolve(),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = JWTAuth::user();
        $conversation = $this->chat->findForUser($user, $id);

        return response()->json([
            'data' => (new ConversationResource($conversation->load('messages.sender')))->resolve(),
        ]);
    }

    public function ensureForBrief(Request $request, int $briefId): JsonResponse
    {
        $brief = Brief::find($briefId);
        abort_if($brief === null, 404, 'Brief no encontrado.');

        $conversation = $this->chat->getOrCreateForBrief($brief);

        return response()->json([
            'data' => (new ConversationResource($conversation->load(['client', 'freelancer', 'brief'])))->resolve(),
        ], 201);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = JWTAuth::user();
        $conversation = $this->chat->findForUser($user, $id);

        $result = $this->chat->listMessages(
            $conversation,
            $user->id,
            $request->query('since'),
            min(100, max(1, (int) $request->query('limit', 50))),
        );

        return response()->json([
            'data'         => MessageResource::collection($result['data'])->resolve(),
            'has_more'     => $result['has_more'],
            'earliest_at'  => $result['earliest_at'],
            'latest_at'    => $result['latest_at'],
        ]);
    }

    public function send(SendMessageRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = JWTAuth::user();
        $conversation = $this->chat->findForUser($user, $id);

        $message = $this->chat->sendMessage(
            $conversation,
            $user,
            trim($request->validated('body')),
        );

        return response()->json([
            'data' => (new MessageResource($message))->resolve(),
        ], 201);
    }

    public function read(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = JWTAuth::user();
        $conversation = $this->chat->findForUser($user, $id);

        $count = $this->chat->markRead($conversation, $user);

        return response()->json([
            'data' => [
                'conversation_id' => $conversation->id,
                'marked_count'    => $count,
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = JWTAuth::user();
        return response()->json([
            'data' => [
                'unread_count' => $this->chat->totalUnread($user),
            ],
        ]);
    }
}
