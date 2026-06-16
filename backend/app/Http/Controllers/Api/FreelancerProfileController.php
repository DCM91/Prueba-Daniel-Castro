<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Freelancer\SyncSkillsRequest;
use App\Http\Requests\Freelancer\UpdateProfileRequest;
use App\Http\Resources\FreelancerProfileResource;
use App\Models\FreelancerProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class FreelancerProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $profile = $this->resolveProfile($request);
        $profile->load('skills');

        return response()->json([
            'data' => new FreelancerProfileResource($profile),
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $profile = $this->resolveProfile($request);
        $profile->update($request->validated());
        $profile->load('skills');

        return response()->json([
            'data' => new FreelancerProfileResource($profile),
        ]);
    }

    public function syncSkills(SyncSkillsRequest $request): JsonResponse
    {
        $profile = $this->resolveProfile($request);

        $payload = collect($request->validated('skills'))
            ->mapWithKeys(fn (array $skill) => [
                $skill['skill_id'] => [
                    'level'            => $skill['level'],
                    'years_experience' => $skill['years_experience'],
                ],
            ])
            ->all();

        $profile->skills()->sync($payload);

        $profile->load('skills');

        return response()->json([
            'data' => new FreelancerProfileResource($profile),
        ]);
    }

    private function resolveProfile(Request $request): FreelancerProfile
    {
        $user = $request->user();

        abort_if(
            $user?->role !== UserRole::Freelancer,
            403,
            'Solo los profesionales pueden gestionar su perfil.'
        );

        return $user->freelancerProfile()->firstOrCreate([
            'user_id' => $user->id,
        ]);
    }
}
