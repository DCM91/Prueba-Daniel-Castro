<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SearchHistoryResource;
use App\Models\SearchHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SearchController extends Controller
{
    public function saveHistory(Request $request): JsonResponse
    {
        $term = $request->input('term');
        $count = $request->input('results_count');

        if (!$term || strlen(trim($term)) < 1) {
            return response()->json([
                'success' => false,
                'error' => 'Search term is required',
            ], 400);
        }

        $term = trim($term);

        if (strlen($term) > 255) {
            return response()->json([
                'success' => false,
                'error' => 'Search term must be less than 255 characters',
            ], 400);
        }

        SearchHistory::create([
            'term' => $term,
            'results_count' => (int) $count,
        ]);

        return response()->json([
            'success' => true,
        ]);
    }

    public function history(): JsonResponse
    {
        $history = SearchHistory::recent(50)->get();

        return response()->json([
            'success' => true,
            'data' => SearchHistoryResource::collection($history),
        ]);
    }

    public function deleteHistory(string $id): JsonResponse
    {
        $item = SearchHistory::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'error' => 'History item not found',
            ], 404);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'History item deleted',
        ]);
    }
}
