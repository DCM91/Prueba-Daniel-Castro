<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CompleteOAuthProfileRequest;
use App\Models\FreelancerProfile;
use App\Models\User;
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

    public function __construct(private readonly OAuthService $oauthService)
    {
    }

    public function redirect(Request $request, string $provider): SymfonyRedirectResponse
    {
        $this->ensureValidProvider($provider);

        $state = Str::random(40);
        $request->session()->put(self::STATE_SESSION_KEY . '.' . $provider, $state);

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

        $email = $socialiteUser->getEmail();
        if (! is_string($email) || $email === '') {
            abort(422, 'El proveedor no devolvió un email.');
        }

        $oauthId = (string) $socialiteUser->getId();
        $name    = (string) ($socialiteUser->getName() ?: $socialiteUser->getNickname() ?: 'Usuario');
        $avatar  = method_exists($socialiteUser, 'getAvatar')
            ? $socialiteUser->getAvatar()
            : null;

        // Google y Facebook solo exponen emails verificados a través de su OAuth.
        // Si en el futuro añadimos un provider que devuelva `email_verified=false`,
        // se puede refactorizar para leer el flag del payload.
        $emailVerified = true;

        [$user, $isNew] = $this->oauthService->findOrCreateUser(
            provider: $providerEnum,
            oauthId: $oauthId,
            email: $email,
            emailVerified: $emailVerified,
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

        $user->load('freelancerProfile.skills');

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

    private function ensureValidProvider(string $provider): void
    {
        if (! in_array($provider, OAuthProvider::values(), true)) {
            abort(404, 'Proveedor OAuth no soportado.');
        }
    }
}
