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
            ->whereHas('user')
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

        $paginator = $this->applySort($query, $request->validated('sort'))
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
            ->whereHas('user')
            ->with(['user', 'skills', 'portfolios'])
            ->find($id);

        abort_if($profile === null, 404, 'Profesional no encontrado.');

        return response()->json([
            'data' => new FreelancerDetailResource($profile),
        ]);
    }

    /**
     * Aplica el orden al query de catálogo en función del parámetro `sort`.
     *
     * - `featured` (default cuando se omite): ordena por % de perfil completo DESC
     *   y, como desempate, por antigüedad ASC (los más antiguos primero).
     * - `price_asc`: tarifa por hora ASC.
     * - `price_desc`: tarifa por hora DESC.
     * - `recent`: más recientes primero.
     * - sin sort o no reconocido: comportamiento legacy (hourly_rate ASC, display_name ASC).
     *
     * La fórmula de completion replica los pesos de FreelancerCardResource::computeProfileCompletion
     * para que la lista pública y el "Profesionales destacados" coincidan.
     */
    private function applySort(\Illuminate\Database\Eloquent\Builder $query, ?string $sort): \Illuminate\Database\Eloquent\Builder
    {
        $driver = $query->getModel()->getConnection()->getDriverName();

        if ($sort === 'featured') {
            $expr = $this->completionExpression($driver);
            $query->orderByRaw($expr . ' DESC');
            $query->orderBy('freelancer_profiles.created_at', 'asc');
            $query->orderBy('display_name', 'asc');
            return $query;
        }

        if ($sort === 'price_asc') {
            return $query->orderBy('hourly_rate', 'asc')->orderBy('display_name', 'asc');
        }

        if ($sort === 'price_desc') {
            return $query->orderBy('hourly_rate', 'desc')->orderBy('display_name', 'asc');
        }

        if ($sort === 'recent') {
            return $query->orderBy('freelancer_profiles.created_at', 'desc')->orderBy('display_name', 'asc');
        }

        return $query->orderBy('hourly_rate', 'asc')->orderBy('display_name', 'asc');
    }

    private function completionExpression(string $driver): string
    {
        $hasSkill = $driver === 'mysql'
            ? "(SELECT CASE WHEN COUNT(*) > 0 THEN 10 ELSE 0 END FROM freelancer_skill WHERE freelancer_skill.freelancer_profile_id = freelancer_profiles.id)"
            : "(SELECT CASE WHEN COUNT(*) > 0 THEN 10 ELSE 0 END FROM freelancer_skill WHERE freelancer_skill.freelancer_profile_id = freelancer_profiles.id)";

        return sprintf(
            '((CASE WHEN display_name IS NOT NULL THEN 20 ELSE 0 END) '
            . '+ (CASE WHEN bio IS NOT NULL THEN 25 ELSE 0 END) '
            . '+ (CASE WHEN city IS NOT NULL THEN 15 ELSE 0 END) '
            . '+ (CASE WHEN hourly_rate IS NOT NULL THEN 20 ELSE 0 END) '
            . '+ (CASE WHEN price_per_project IS NOT NULL THEN 10 ELSE 0 END) '
            . '+ %s)',
            $hasSkill
        );
    }
}
