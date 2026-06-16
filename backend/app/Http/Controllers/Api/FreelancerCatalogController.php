<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Freelancer\SearchFreelancersRequest;
use App\Http\Resources\FreelancerCardResource;
use App\Http\Resources\FreelancerDetailResource;
use App\Models\FreelancerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

final class FreelancerCatalogController extends Controller
{
    public function index(SearchFreelancersRequest $request): JsonResponse
    {
        $query = FreelancerProfile::query()
            ->where('is_available', true)
            ->with(['user', 'skills']);

        if ($category = $request->validated('category')) {
            $query->whereHas('skills', function ($q) use ($category) {
                $q->where('category', $category);
            });
        }

        if ($city = $request->validated('city')) {
            $query->where('city', $city);
        }

        if ($maxRate = $request->validated('max_rate')) {
            $query->where('hourly_rate', '<=', $maxRate);
        }

        if ($q = $request->validated('q')) {
            $like = '%' . $q . '%';
            $query->where(function ($q1) use ($like) {
                $q1->where('display_name', 'like', $like)
                    ->orWhere('city', 'like', $like)
                    ->orWhereHas('skills', function ($q2) use ($like) {
                        $q2->where('name', 'like', $like);
                    });
            });
        }

        $paginator = $query
            ->orderBy('hourly_rate', 'asc')
            ->orderBy('display_name', 'asc')
            ->paginate(12);

        $cards = FreelancerCardResource::collection($paginator->getCollection())->resolve();

        $payload = [
            'data' => $cards,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ];

        return response()->json($payload);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $profile = FreelancerProfile::query()
            ->where('is_available', true)
            ->with(['user', 'skills', 'portfolios'])
            ->find($id);

        abort_if($profile === null, 404, 'Profesional no encontrado.');

        return response()->json([
            'data' => new FreelancerDetailResource($profile),
        ]);
    }
}
