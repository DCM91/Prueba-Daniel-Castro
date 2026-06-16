<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\CloudinaryVerificationException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Cover\StoreCoverRequest;
use App\Http\Resources\FreelancerProfileResource;
use App\Models\FreelancerProfile;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class FreelancerCoverController extends Controller
{
    public function __construct(private readonly CloudinaryServiceInterface $cloudinary)
    {
    }

    public function update(StoreCoverRequest $request): JsonResponse
    {
        $profile = $this->resolveProfile($request);

        try {
            $resource = $this->cloudinary->verifyResource(
                $request->string('public_id')->toString(),
                $this->cloudinary->folderFor('cover'),
            );
        } catch (CloudinaryVerificationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        if ($profile->cover_public_id !== null && $profile->cover_public_id !== $resource['public_id']) {
            $this->cloudinary->deleteResource($profile->cover_public_id);
        }

        $profile->cover_url        = $request->string('url')->toString();
        $profile->cover_public_id  = $resource['public_id'];
        $profile->save();

        return response()->json([
            'data' => $this->withUrls($profile->load('skills')),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $profile = $this->resolveProfile($request);

        if ($profile->cover_public_id !== null) {
            $this->cloudinary->deleteResource($profile->cover_public_id);
        }

        $profile->cover_url       = null;
        $profile->cover_public_id = null;
        $profile->save();

        return response()->json([
            'data' => $this->withUrls($profile->load('skills')),
        ]);
    }

    private function resolveProfile(Request $request): FreelancerProfile
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        abort_if($user?->role !== \App\Enums\UserRole::Freelancer, 403, 'Solo los profesionales pueden gestionar su perfil.');

        return $user->freelancerProfile()->firstOrCreate(['user_id' => $user->id]);
    }

    private function withUrls(FreelancerProfile $profile): FreelancerProfileResource
    {
        return new FreelancerProfileResource($profile);
    }
}
