<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Exceptions\CloudinaryVerificationException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Portfolio\ReorderPortfoliosRequest;
use App\Http\Requests\Portfolio\StorePortfolioRequest;
use App\Http\Requests\Portfolio\UpdatePortfolioRequest;
use App\Models\FreelancerProfile;
use App\Models\Portfolio;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

final class FreelancerPortfolioController extends Controller
{
    public function __construct(private readonly CloudinaryServiceInterface $cloudinary)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $profile = $this->resolveProfile($request);
        $portfolios = $profile->portfolios()->get();

        return response()->json([
            'data' => $portfolios->map(fn ($p) => $this->transform($p))->all(),
        ]);
    }

    public function store(StorePortfolioRequest $request): JsonResponse
    {
        $profile = $this->resolveProfile($request);

        try {
            $resource = $this->cloudinary->verifyResource(
                $request->string('public_id')->toString(),
                $this->cloudinary->folderFor('portfolio'),
            );
        } catch (CloudinaryVerificationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        $portfolio = DB::transaction(function () use ($profile, $request, $resource) {
            $nextPosition = (int) ($profile->portfolios()->max('position') ?? -1) + 1;

            return $profile->portfolios()->create([
                'public_id'   => $resource['public_id'],
                'url'         => $request->string('url')->toString(),
                'width'       => $resource['width'],
                'height'      => $resource['height'],
                'format'      => $resource['format'],
                'bytes'       => $resource['bytes'],
                'title'       => $request->input('title'),
                'description' => $request->input('description'),
                'position'    => $nextPosition,
            ]);
        });

        return response()->json([
            'data' => $this->transform($portfolio),
        ], 201);
    }

    public function update(UpdatePortfolioRequest $request, int $id): JsonResponse
    {
        $profile = $this->resolveProfile($request);
        $portfolio = $profile->portfolios()->findOrFail($id);

        $data = $request->validated();
        if (array_key_exists('position', $data) && $data['position'] !== null) {
            $data['position'] = (int) $data['position'];
        }
        $portfolio->fill($data)->save();

        return response()->json([
            'data' => $this->transform($portfolio->fresh()),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $profile = $this->resolveProfile($request);
        $portfolio = $profile->portfolios()->findOrFail($id);

        $this->cloudinary->deleteResource($portfolio->public_id);
        $portfolio->delete();

        return response()->json(['message' => 'Elemento eliminado.']);
    }

    public function reorder(ReorderPortfoliosRequest $request): JsonResponse
    {
        $profile = $this->resolveProfile($request);
        $ids = $request->input('ids');

        DB::transaction(function () use ($profile, $ids) {
            foreach (array_values($ids) as $position => $id) {
                $profile->portfolios()
                    ->where('id', $id)
                    ->update(['position' => $position]);
            }
        });

        $portfolios = $profile->portfolios()->orderBy('position')->get();

        return response()->json([
            'data' => $portfolios->map(fn ($p) => $this->transform($p))->all(),
        ]);
    }

    public function publicIndex(int $id): JsonResponse
    {
        $profile = FreelancerProfile::with('portfolios')->findOrFail($id);
        $portfolios = $profile->portfolios;

        return response()->json([
            'data' => $portfolios->map(fn ($p) => $this->transform($p))->all(),
        ]);
    }

    private function resolveProfile(Request $request): FreelancerProfile
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        abort_if($user?->role !== UserRole::Freelancer, 403, 'Solo los profesionales pueden gestionar su portfolio.');

        return $user->freelancerProfile()->firstOrCreate(['user_id' => $user->id]);
    }

    private function transform(Portfolio $portfolio): array
    {
        return [
            'id'          => $portfolio->id,
            'public_id'   => $portfolio->public_id,
            'url'         => $portfolio->url,
            'urls'        => $this->cloudinary->portfolioUrls($portfolio->public_id),
            'width'       => $portfolio->width,
            'height'      => $portfolio->height,
            'format'      => $portfolio->format,
            'bytes'       => $portfolio->bytes,
            'title'       => $portfolio->title,
            'description' => $portfolio->description,
            'position'    => $portfolio->position,
            'created_at'  => $portfolio->created_at?->toIso8601String(),
        ];
    }
}
