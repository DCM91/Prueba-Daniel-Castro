<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\FreelancerProfile;
use App\Services\ProfileCompletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ProfileCompletionController extends Controller
{
    public function __construct(private readonly ProfileCompletionService $completion)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user === null || $user->role !== UserRole::Freelancer) {
            return response()->json([
                'pct'     => 0,
                'missing' => ['profile'],
            ]);
        }

        $profile = FreelancerProfile::query()
            ->where('user_id', $user->id)
            ->with(['skills', 'portfolios'])
            ->first();

        if ($profile === null) {
            return response()->json([
                'pct'     => 0,
                'missing' => ['profile'],
            ]);
        }

        $result = $this->completion->calculate($profile);

        return response()->json([
            'pct'     => $result['pct'],
            'missing' => $result['missing'],
        ]);
    }
}
