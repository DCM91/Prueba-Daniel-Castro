<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureUserIsFreelancer
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if(
            $request->user()?->role !== UserRole::Freelancer,
            403,
            'Solo los profesionales pueden gestionar su perfil.'
        );

        return $next($request);
    }
}
