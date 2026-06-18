<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\CloudinaryVerificationException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Avatar\StoreAvatarRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class UserAvatarController extends Controller
{
    public function __construct(private readonly CloudinaryServiceInterface $cloudinary)
    {
    }

    public function store(StoreAvatarRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $folder = $this->cloudinary->folderFor('avatar');

        try {
            $resource = $this->cloudinary->verifyResource(
                $request->string('public_id')->toString(),
                $folder,
            );
        } catch (CloudinaryVerificationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 403);
        }

        if ($user->avatar_public_id !== null && $user->avatar_public_id !== $resource['public_id']) {
            $this->cloudinary->deleteResource($user->avatar_public_id);
        }

        $user->avatar_url        = $request->string('url')->toString();
        $user->avatar_public_id  = $resource['public_id'];
        $user->save();

        $user->load(['freelancerProfile.skills', 'oauthIdentities']);

        return response()->json([
            'data' => new UserResource(
                $user,
                $this->cloudinary->avatarUrls($user->avatar_public_id),
            ),
        ], 200);
    }

    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->avatar_public_id !== null) {
            $this->cloudinary->deleteResource($user->avatar_public_id);
        }

        $user->avatar_url       = null;
        $user->avatar_public_id = null;
        $user->save();

        $user->load(['freelancerProfile.skills', 'oauthIdentities']);

        return response()->json([
            'data' => new UserResource(
                $user,
                $this->cloudinary->avatarUrls(null),
            ),
        ], 200);
    }
}
