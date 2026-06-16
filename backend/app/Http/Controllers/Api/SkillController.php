<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SkillResource;
use App\Models\Skill;
use Illuminate\Http\JsonResponse;

final class SkillController extends Controller
{
    public function index(): JsonResponse
    {
        $skills = Skill::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => SkillResource::collection($skills),
        ]);
    }
}
