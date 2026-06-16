<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Brief\StoreBriefRequest;
use App\Http\Requests\Brief\UpdateBriefRequest;
use App\Http\Resources\BriefResource;
use App\Models\Brief;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class BriefController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Brief::query()
            ->with('client')
            ->withCount('proposals')
            ->orderByDesc('published_at')
            ->orderByDesc('id');

        $scope = $request->query('scope', 'all');
        if ($scope === 'mine' && $user) {
            $query->where('client_id', $user->id);
        } else {
            $query->where('status', 'published');
        }

        $briefs = $query->paginate(12);

        return response()->json([
            'data' => BriefResource::collection($briefs->getCollection())->resolve(),
            'meta' => [
                'current_page' => $briefs->currentPage(),
                'last_page'    => $briefs->lastPage(),
                'per_page'     => $briefs->perPage(),
                'total'        => $briefs->total(),
            ],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $brief = Brief::with(['client'])->withCount('proposals')->find($id);
        abort_if($brief === null, 404, 'Brief no encontrado.');

        return response()->json([
            'data' => (new BriefResource($brief))->resolve(),
        ]);
    }

    public function store(StoreBriefRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user?->role === UserRole::Client, 403, 'Solo los clientes pueden crear briefs.');

        $brief = Brief::create([
            'client_id'    => $user->id,
            'title'        => $request->validated('title'),
            'description'  => $request->validated('description'),
            'category'     => $request->validated('category'),
            'city'         => $request->validated('city'),
            'budget_min'   => $request->validated('budget_min'),
            'budget_max'   => $request->validated('budget_max'),
            'deadline'     => $request->validated('deadline'),
            'status'       => 'published',
            'published_at' => now(),
        ]);

        $brief->load('client')->loadCount('proposals');

        return response()->json([
            'data' => (new BriefResource($brief))->resolve(),
        ], 201);
    }

    public function update(UpdateBriefRequest $request, int $id): JsonResponse
    {
        $user = $request->user();
        $brief = Brief::find($id);
        abort_if($brief === null, 404, 'Brief no encontrado.');
        abort_unless($user?->id === $brief->client_id, 403, 'Solo el autor puede editar el brief.');

        $brief->update($request->validated());
        $brief->load('client')->loadCount('proposals');

        return response()->json([
            'data' => (new BriefResource($brief))->resolve(),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $brief = Brief::find($id);
        abort_if($brief === null, 404, 'Brief no encontrado.');
        abort_unless($user?->id === $brief->client_id, 403, 'Solo el autor puede borrar el brief.');

        $brief->delete();

        return response()->json(['message' => 'Brief eliminado correctamente.']);
    }
}
