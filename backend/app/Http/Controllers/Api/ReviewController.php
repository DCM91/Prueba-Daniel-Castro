<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Brief;
use App\Models\Review;
use App\Models\User;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

final class ReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviews)
    {
    }

    public function store(StoreReviewRequest $request, int $briefId): JsonResponse
    {
        /** @var User $user */
        $user = JWTAuth::user();
        $brief = Brief::find($briefId);
        abort_if($brief === null, 404, 'Brief no encontrado.');

        $review = $this->reviews->create(
            $brief,
            $user,
            (int) $request->validated('rating'),
            $request->validated('comment'),
        );

        return response()->json([
            'data' => (new ReviewResource($review->load(['reviewer', 'reviewee', 'brief'])))->resolve(),
        ], 201);
    }

    public function forUser(Request $request, int $userId): JsonResponse
    {
        $limit = min(100, max(1, (int) $request->query('limit', 20)));
        $reviews = $this->reviews->listForUser($userId, $limit);

        return response()->json([
            'data' => ReviewResource::collection($reviews)->resolve(),
        ]);
    }

    public function forBrief(Request $request, int $briefId): JsonResponse
    {
        $brief = Brief::find($briefId);
        abort_if($brief === null, 404, 'Brief no encontrado.');

        /** @var User|null $user */
        $user = JWTAuth::user();

        $reviews = $this->reviews->listForBrief($brief, $user);

        return response()->json([
            'data' => ReviewResource::collection($reviews)->resolve(),
        ]);
    }

    public function aggregateForUser(Request $request, int $userId): JsonResponse
    {
        $aggregate = $this->reviews->aggregateForUser($userId);

        return response()->json([
            'data' => [
                'user_id' => $userId,
                'count'   => $aggregate['count'],
                'average' => $aggregate['average'],
            ],
        ]);
    }
}
