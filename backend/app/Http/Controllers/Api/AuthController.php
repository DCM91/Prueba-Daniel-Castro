<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\FreelancerProfile;
use App\Models\User;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

final class AuthController extends Controller
{
    public function __construct(private readonly CloudinaryServiceInterface $cloudinary)
    {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => $data['password'],
                'role'     => $data['role'],
            ]);

            if ($user->isFreelancer()) {
                FreelancerProfile::create(['user_id' => $user->id]);
            }

            return $user;
        });

        $user->load('freelancerProfile.skills');

        $token = JWTAuth::fromUser($user);

        return $this->respondWithToken($token, $user, 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        $token = auth('api')->attempt($credentials);

        if (! $token) {
            return response()->json([
                'message' => 'Credenciales inválidas.',
            ], 401);
        }

        /** @var User $user */
        $user = auth('api')->user();
        $user->load('freelancerProfile.skills');

        return $this->respondWithToken($token, $user);
    }

    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = auth('api')->user();
        $user->load('freelancerProfile.skills');

        return response()->json([
            'data' => $this->userResource($user),
        ]);
    }

    public function logout(): JsonResponse
    {
        try {
            auth('api')->logout();
        } catch (JWTException $e) {
            return response()->json([
                'message' => 'No se pudo cerrar la sesión.',
            ], 500);
        }

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    public function refresh(): JsonResponse
    {
        try {
            $token = auth('api')->refresh();
        } catch (JWTException $e) {
            return response()->json([
                'message' => 'No se pudo refrescar el token.',
            ], 401);
        }

        /** @var User $user */
        $user = auth('api')->user();
        $user->load('freelancerProfile.skills');

        return $this->respondWithToken($token, $user);
    }

    private function respondWithToken(string $token, User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => [
                'user'         => $this->userResource($user),
                'access_token' => $token,
                'token_type'   => 'bearer',
                'expires_in'   => auth('api')->factory()->getTTL() * 60,
            ],
        ], $status);
    }

    private function userResource(User $user): UserResource
    {
        return new UserResource(
            $user,
            $this->cloudinary->avatarUrls($user->avatar_public_id),
        );
    }
}
