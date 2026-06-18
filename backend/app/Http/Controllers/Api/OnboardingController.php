<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\FreelancerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

final class OnboardingController extends Controller
{
    public function complete(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401, 'No autenticado. Token inválido o expirado.');

        if ($user->role !== UserRole::Freelancer) {
            abort(403, 'Solo los profesionales pueden completar el onboarding.');
        }

        $profile = FreelancerProfile::query()->firstOrCreate(
            ['user_id' => $user->id],
        );

        $profile->onboarding_completed_at = $profile->onboarding_completed_at ?? Carbon::now();
        $profile->save();

        return response()->json([
            'data' => [
                'onboarding_completed_at' => $profile->onboarding_completed_at?->toIso8601String(),
            ],
        ], 200);
    }
}
