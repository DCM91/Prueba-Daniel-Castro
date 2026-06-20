<?php

use App\Enums\OAuthProvider;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BriefController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\FreelancerCatalogController;
use App\Http\Controllers\Api\FreelancerCoverController;
use App\Http\Controllers\Api\FreelancerPortfolioController;
use App\Http\Controllers\Api\FreelancerProfileController;
use App\Http\Controllers\Api\NotificationsController;
use App\Http\Controllers\Api\OAuthController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\ProfileCompletionController;
use App\Http\Controllers\Api\ProposalController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SkillController;
use App\Http\Controllers\Api\UserAccountController;
use App\Http\Controllers\Api\UserAvatarController;
use App\Http\Middleware\EnsureUserIsFreelancer;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status'    => 'ok',
        'service'   => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::get('/skills', [SkillController::class, 'index']);

Route::get('/freelancers',       [FreelancerCatalogController::class, 'index']);
Route::get('/freelancers/{id}',  [FreelancerCatalogController::class, 'show'])
    ->whereNumber('id');

Route::get('/briefs', [BriefController::class, 'index']);
Route::get('/briefs/{id}', [BriefController::class, 'show'])->whereNumber('id');

Route::get('/briefs/{briefId}/proposals', [ProposalController::class, 'index'])
    ->whereNumber('briefId');

Route::middleware('auth:api')->group(function () {
    Route::post('/briefs', [BriefController::class, 'store']);
    Route::put('/briefs/{id}', [BriefController::class, 'update'])->whereNumber('id');
    Route::delete('/briefs/{id}', [BriefController::class, 'destroy'])->whereNumber('id');
    Route::post('/briefs/{id}/attachments', [BriefController::class, 'attachImage'])->whereNumber('id');
    Route::delete('/briefs/{id}/attachments/{attachmentId}', [BriefController::class, 'detachImage'])
        ->whereNumber('id')
        ->whereNumber('attachmentId');
    Route::patch('/briefs/{id}/attachments/reorder', [BriefController::class, 'reorderAttachments'])->whereNumber('id');
    Route::patch('/briefs/{id}/complete', [BriefController::class, 'complete'])->whereNumber('id');
    Route::post('/briefs/{id}/reviews', [ReviewController::class, 'store'])->whereNumber('id');
    Route::get('/briefs/{id}/reviews', [ReviewController::class, 'forBrief'])->whereNumber('id');
    Route::get('/users/{id}/reviews', [ReviewController::class, 'forUser'])->whereNumber('id');
    Route::get('/users/{id}/rating', [ReviewController::class, 'aggregateForUser'])->whereNumber('id');
    Route::put('/reviews/{id}', [ReviewController::class, 'update'])->whereNumber('id');
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy'])->whereNumber('id');

    Route::post('/briefs/{briefId}/proposals', [ProposalController::class, 'store'])
        ->whereNumber('briefId');
    Route::patch('/briefs/{briefId}/proposals/{id}', [ProposalController::class, 'update'])
        ->whereNumber('briefId')
        ->whereNumber('id');

    Route::post('/me/avatar', [UserAvatarController::class, 'store'])
        ->middleware('throttle:30,1');
    Route::delete('/me/avatar', [UserAvatarController::class, 'destroy'])
        ->middleware('throttle:30,1');

    Route::put('/me', [UserAccountController::class, 'update']);

    Route::get('/me/completion', [ProfileCompletionController::class, 'show']);
    Route::post('/me/onboarding-complete', [OnboardingController::class, 'complete']);

    Route::get('/me/oauth-identities', [OAuthController::class, 'listIdentities']);
    Route::delete('/me/oauth-identities/{provider}', [OAuthController::class, 'unlinkIdentity'])
        ->whereIn('provider', OAuthProvider::values());

    Route::get('/conversations', [ChatController::class, 'index']);
    Route::get('/conversations/unread-count', [ChatController::class, 'unreadCount']);
    Route::get('/conversations/{id}', [ChatController::class, 'show'])->whereNumber('id');
    Route::get('/conversations/{id}/messages', [ChatController::class, 'messages'])->whereNumber('id');
    Route::post('/conversations/{id}/messages', [ChatController::class, 'send'])->whereNumber('id');
    Route::post('/conversations/{id}/read', [ChatController::class, 'read'])->whereNumber('id');
    Route::post('/briefs/{id}/conversation', [ChatController::class, 'ensureForBrief'])->whereNumber('id');

    Route::get('/me/notifications', [NotificationsController::class, 'index']);
    Route::get('/me/notifications/unread-count', [NotificationsController::class, 'unreadCount']);
    Route::post('/me/notifications/{id}/read', [NotificationsController::class, 'markRead']);
    Route::post('/me/notifications/read-all', [NotificationsController::class, 'markAllRead']);
});

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:6,1');
    Route::post('/login',    [AuthController::class, 'login'])
        ->middleware('throttle:6,1');

    // OAuth redirect/callback: 'web' middleware for session-based CSRF state
    Route::middleware('web')->group(function () {
        Route::get('/oauth/{provider}/redirect', [OAuthController::class, 'redirect'])
            ->whereIn('provider', OAuthProvider::values())
            ->name('auth.oauth.redirect');
        Route::get('/oauth/{provider}/callback', [OAuthController::class, 'callback'])
            ->whereIn('provider', OAuthProvider::values())
            ->name('auth.oauth.callback');
    });

    Route::middleware('auth:api')->group(function () {
        Route::get('/me',       [AuthController::class, 'me']);
        Route::post('/logout',  [AuthController::class, 'logout']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
        Route::post('/oauth/complete-profile', [OAuthController::class, 'completeProfile'])
            ->name('auth.oauth.complete');
    });
});

Route::middleware(['auth:api', EnsureUserIsFreelancer::class])
    ->prefix('freelancer')
    ->group(function () {
        Route::get('/me',        [FreelancerProfileController::class, 'show']);
        Route::put('/me',        [FreelancerProfileController::class, 'update']);
        Route::put('/me/skills', [FreelancerProfileController::class, 'syncSkills']);

        Route::put('/me/cover',    [FreelancerCoverController::class, 'update'])
            ->middleware('throttle:30,1');
        Route::delete('/me/cover', [FreelancerCoverController::class, 'destroy'])
            ->middleware('throttle:30,1');

        Route::get('/me/portfolios',            [FreelancerPortfolioController::class, 'index']);
        Route::post('/me/portfolios',           [FreelancerPortfolioController::class, 'store'])
            ->middleware('throttle:60,1');
        Route::patch('/me/portfolios/{id}',     [FreelancerPortfolioController::class, 'update'])
            ->whereNumber('id');
        Route::delete('/me/portfolios/{id}',    [FreelancerPortfolioController::class, 'destroy'])
            ->whereNumber('id');
        Route::post('/me/portfolios/reorder',   [FreelancerPortfolioController::class, 'reorder']);
    });

Route::get('/freelancers/{id}/portfolios', [FreelancerPortfolioController::class, 'publicIndex'])
    ->whereNumber('id');
