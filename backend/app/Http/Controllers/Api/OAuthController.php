<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CompleteOAuthProfileRequest;
use App\Http\Resources\OAuthIdentityResource;
use App\Models\FreelancerProfile;
use App\Models\User;
use App\Services\OAuthIdentityService;
use App\Services\OAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

final class OAuthController extends Controller
{
    private const STATE_SESSION_KEY = 'oauth_state';
    private const LINK_INTENT_KEY    = 'oauth_link_intent';

    public function __construct(
        private readonly OAuthService $oauthService,
        private readonly OAuthIdentityService $identityService,
    ) {
    }

    public function redirect(Request $request, string $provider): SymfonyRedirectResponse
    {
        $this->ensureValidProvider($provider);

        $state = Str::random(40);
        $request->session()->put(self::STATE_SESSION_KEY . '.' . $provider, $state);

        if ($request->boolean('link') && Auth::guard('api')->check()) {
            $request->session()->put(
                self::LINK_INTENT_KEY . '.' . $provider,
                Auth::guard('api')->id(),
            );
        }

        return Socialite::driver($provider)
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        $this->ensureValidProvider($provider);
        $providerEnum = OAuthProvider::from($provider);

        $expectedState = $request->session()->pull(self::STATE_SESSION_KEY . '.' . $provider);
        $receivedState = $request->query('state');

        if (! is_string($expectedState) || ! is_string($receivedState) || ! hash_equals($expectedState, $receivedState)) {
            abort(419, 'Estado OAuth inválido. Inténtalo de nuevo.');
        }

        $socialiteUser = Socialite::driver($provider)->stateless()->user();

        $linkUserId = $request->session()->pull(self::LINK_INTENT_KEY . '.' . $provider);
        if (is_int($linkUserId) || (is_string($linkUserId) && ctype_digit($linkUserId))) {
            return $this->completeLinking($providerEnum, $socialiteUser, (int) $linkUserId);
        }

        $email = $socialiteUser->getEmail();
        $name  = (string) ($socialiteUser->getName() ?: $socialiteUser->getNickname() ?: 'Usuario');
        $avatar = method_exists($socialiteUser, 'getAvatar') ? $socialiteUser->getAvatar() : null;

        [$user, $isNew] = $this->oauthService->findOrCreateUser(
            provider: $providerEnum,
            oauthId: (string) $socialiteUser->getId(),
            email: is_string($email) ? $email : '',
            emailVerified: true,
            name: $name,
            avatarUrl: is_string($avatar) ? $avatar : null,
        );

        $token = Auth::guard('api')->login($user);
        $ttl   = Auth::guard('api')->factory()->getTTL() * 60;

        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:4200'), '/');
        $separator   = str_contains($frontendUrl, '?') ? '&' : '?';

        return redirect()->to(
            $frontendUrl
            . '/auth/callback'
            . $separator
            . http_build_query([
                'token'      => $token,
                'expires_in' => $ttl,
                'new_user'   => $isNew ? '1' : '0',
            ])
        );
    }

    public function completeProfile(CompleteOAuthProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = Auth::guard('api')->user();
        $role = UserRole::from($request->validated('role'));

        $user->role = $role;
        $user->save();

        if ($role === UserRole::Freelancer && ! $user->freelancerProfile) {
            FreelancerProfile::create(['user_id' => $user->id]);
        }

        $user->load(['freelancerProfile.skills', 'oauthIdentities']);

        $token = Auth::guard('api')->login($user);
        $ttl   = Auth::guard('api')->factory()->getTTL() * 60;

        return response()->json([
            'data' => [
                'user'         => new \App\Http\Resources\UserResource($user),
                'access_token' => $token,
                'token_type'   => 'bearer',
                'expires_in'   => $ttl,
            ],
        ], 200);
    }

    public function listIdentities(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = Auth::guard('api')->user();
        $identities = $user->oauthIdentities()
            ->orderBy('provider')
            ->get();

        return response()->json([
            'data' => OAuthIdentityResource::collection($identities)->resolve(),
        ]);
    }

    public function unlinkIdentity(Request $request, string $provider): JsonResponse
    {
        $this->ensureValidProvider($provider);
        $providerEnum = OAuthProvider::from($provider);

        /** @var User $user */
        $user = Auth::guard('api')->user();
        $removed = $this->identityService->unlinkProvider($user, $providerEnum);

        if (! $removed) {
            return response()->json([
                'message' => 'No tienes esa cuenta vinculada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Cuenta desvinculada.',
        ]);
    }

    private function completeLinking(OAuthProvider $provider, $socialite, int $userId): RedirectResponse
    {
        /** @var User|null $user */
        $user = User::find($userId);
        if ($user === null) {
            abort(401, 'La sesión de vinculación ha caducado.');
        }

        try {
            $this->identityService->linkIdentityToUser(
                $user,
                $provider,
                (string) $socialite->getId(),
                $socialite,
                is_string($socialite->getEmail()) ? $socialite->getEmail() : null,
                method_exists($socialite, 'getAvatar') ? $socialite->getAvatar() : null,
            );
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:4200'), '/');
            $separator   = str_contains($frontendUrl, '?') ? '&' : '?';
            return redirect()->to(
                $frontendUrl
                . '/account'
                . $separator
                . http_build_query([
                    'oauth_error' => $e->getMessage(),
                    'provider'    => $provider->value,
                ])
            );
        }

        $token = Auth::guard('api')->login($user);
        $ttl   = Auth::guard('api')->factory()->getTTL() * 60;

        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:4200'), '/');
        $separator   = str_contains($frontendUrl, '?') ? '&' : '?';

        return redirect()->to(
            $frontendUrl
            . '/account'
            . $separator
            . http_build_query([
                'token'           => $token,
                'expires_in'      => $ttl,
                'oauth_linked'    => $provider->value,
            ])
        );
    }

    private function ensureValidProvider(string $provider): void
    {
        if (! in_array($provider, OAuthProvider::values(), true)) {
            abort(404, 'Proveedor OAuth no soportado.');
        }
    }
}
