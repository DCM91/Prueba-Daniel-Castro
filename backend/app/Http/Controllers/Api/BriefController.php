<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Exceptions\CloudinaryVerificationException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Brief\AttachBriefImageRequest;
use App\Http\Requests\Brief\ReorderBriefAttachmentsRequest;
use App\Http\Requests\Brief\StoreBriefRequest;
use App\Http\Requests\Brief\UpdateBriefRequest;
use App\Http\Resources\BriefAttachmentResource;
use App\Http\Resources\BriefResource;
use App\Models\Brief;
use App\Models\BriefAttachment;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class BriefController extends Controller
{
    private const MAX_ATTACHMENTS_PER_BRIEF = 10;

    public function __construct(private readonly CloudinaryServiceInterface $cloudinary)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Brief::query()
            ->with(['client', 'attachments'])
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
        $brief = Brief::with(['client', 'attachments'])->withCount('proposals')->find($id);
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

        $brief->load(['client', 'attachments'])->loadCount('proposals');

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
        $brief->load(['client', 'attachments'])->loadCount('proposals');

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

    public function complete(Request $request, int $id, \App\Services\ReviewService $reviews): JsonResponse
    {
        $user = $request->user();
        $brief = Brief::find($id);
        abort_if($brief === null, 404, 'Brief no encontrado.');

        $completed = $reviews->completeBrief($brief, $user);
        $completed->load(['client', 'attachments'])->loadCount('proposals');

        return response()->json([
            'data' => (new \App\Http\Resources\BriefResource($completed))->resolve(),
        ]);
    }

    public function attachImage(AttachBriefImageRequest $request, int $id): JsonResponse
    {
        $user = $request->user();
        $brief = Brief::find($id);
        abort_if($brief === null, 404, 'Brief no encontrado.');
        abort_unless($user?->id === $brief->client_id, 403, 'Solo el autor puede añadir imágenes al brief.');

        if ($brief->attachments()->count() >= self::MAX_ATTACHMENTS_PER_BRIEF) {
            return response()->json([
                'message' => 'Has alcanzado el límite de imágenes para este proyecto.',
            ], 422);
        }

        try {
            $resource = $this->cloudinary->verifyResource(
                $request->string('public_id')->toString(),
                $this->cloudinary->folderFor('brief'),
            );
        } catch (CloudinaryVerificationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        $attachment = DB::transaction(function () use ($brief, $request, $resource) {
            $nextPosition = (int) ($brief->attachments()->max('position') ?? -1) + 1;

            return $brief->attachments()->create([
                'public_id' => $resource['public_id'],
                'url'       => $request->string('url')->toString(),
                'width'     => $resource['width'],
                'height'    => $resource['height'],
                'format'    => $resource['format'],
                'bytes'     => $resource['bytes'],
                'title'     => $request->input('title'),
                'position'  => $nextPosition,
            ]);
        });

        return response()->json([
            'data' => (new BriefAttachmentResource($attachment))->resolve(),
        ], 201);
    }

    public function detachImage(Request $request, int $id, int $attachmentId): JsonResponse
    {
        $user = $request->user();
        $brief = Brief::find($id);
        abort_if($brief === null, 404, 'Brief no encontrado.');
        abort_unless($user?->id === $brief->client_id, 403, 'Solo el autor puede eliminar imágenes del brief.');

        $attachment = $brief->attachments()->find($attachmentId);
        abort_if($attachment === null, 404, 'Imagen no encontrada.');

        $this->cloudinary->deleteResource($attachment->public_id);
        $attachment->delete();

        return response()->json(['message' => 'Imagen eliminada.']);
    }

    public function reorderAttachments(ReorderBriefAttachmentsRequest $request, int $id): JsonResponse
    {
        $user = $request->user();
        $brief = Brief::find($id);
        abort_if($brief === null, 404, 'Brief no encontrado.');
        abort_unless($user?->id === $brief->client_id, 403, 'Solo el autor puede reordenar las imágenes del brief.');

        $ids = $request->input('ids');

        $ownedIds = $brief->attachments()->pluck('id')->all();
        $submittedIds = array_map('intval', $ids);

        if (array_diff($submittedIds, $ownedIds) !== [] || count($submittedIds) !== count($ownedIds)) {
            return response()->json([
                'message' => 'La lista de IDs no coincide con las imágenes del proyecto.',
            ], 422);
        }

        DB::transaction(function () use ($brief, $ids) {
            foreach (array_values($ids) as $position => $attachmentId) {
                $brief->attachments()
                    ->where('id', $attachmentId)
                    ->update(['position' => $position]);
            }
        });

        $attachments = $brief->attachments()->orderBy('position')->orderByDesc('id')->get();

        return response()->json([
            'data' => BriefAttachmentResource::collection($attachments)->resolve(),
        ]);
    }
}
