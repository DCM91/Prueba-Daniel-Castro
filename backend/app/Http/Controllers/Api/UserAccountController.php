<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateAccountRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\JsonResponse;

final class UserAccountController extends Controller
{
    public function __construct(private readonly CloudinaryServiceInterface $cloudinary)
    {
    }

    public function update(UpdateAccountRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->fill($request->validated());
        $user->save();

        $user->load(['freelancerProfile.skills', 'oauthIdentities']);

        return response()->json([
            'data' => new UserResource(
                $user,
                $this->cloudinary->avatarUrls($user->avatar_public_id),
            ),
        ]);
    }
}
