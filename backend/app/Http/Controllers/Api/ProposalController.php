<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\BriefStatus;
use App\Enums\ProposalStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Proposal\StoreProposalRequest;
use App\Http\Requests\Proposal\UpdateProposalStatusRequest;
use App\Http\Resources\BriefResource;
use App\Http\Resources\ProposalResource;
use App\Models\Brief;
use App\Models\FreelancerProfile;
use App\Models\Proposal;
use App\Models\User;
use App\Notifications\BriefAssignedNotification;
use App\Notifications\ProposalAcceptedNotification;
use App\Notifications\ProposalReceivedNotification;
use App\Notifications\ProposalRejectedNotification;
use App\Services\ChatService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ProposalController extends Controller
{
    public function __construct(
        private readonly ChatService $chat,
        private readonly NotificationService $notifications,
    ) {
    }

    public function index(Request $request, int $briefId): JsonResponse
    {
        $user = $request->user();
        $brief = Brief::find($briefId);
        abort_if($brief === null, 404, 'Brief no encontrado.');

        if ($user?->id !== $brief->client_id) {
            abort(403, 'Solo el autor del brief puede ver todas las propuestas.');
        }

        $proposals = $brief->proposals()
            ->with('freelancerProfile.user')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => ProposalResource::collection($proposals)->resolve(),
        ]);
    }

    public function store(StoreProposalRequest $request, int $briefId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user?->role === UserRole::Freelancer, 403, 'Solo los profesionales pueden enviar propuestas.');

        $brief = Brief::find($briefId);
        abort_if($brief === null, 404, 'Brief no encontrado.');
        abort_unless($brief->status?->value === 'published', 422, 'Este brief ya no acepta propuestas.');

        $profile = FreelancerProfile::firstOrCreate(['user_id' => $user->id]);

        $exists = Proposal::where('brief_id', $brief->id)
            ->where('freelancer_id', $profile->id)
            ->exists();
        abort_if($exists, 422, 'Ya has enviado una propuesta a este brief.');

        $proposal = Proposal::create([
            'brief_id'       => $brief->id,
            'freelancer_id'  => $profile->id,
            'message'        => $request->validated('message'),
            'price'          => $request->validated('price'),
            'status'         => ProposalStatus::Pending->value,
        ]);
        $proposal->load('freelancerProfile');

        $client = User::find($brief->client_id);
        if ($client !== null) {
            $this->notifications->send($client, new ProposalReceivedNotification($brief, $proposal));
        }

        return response()->json([
            'data' => (new ProposalResource($proposal))->resolve(),
        ], 201);
    }

    public function update(UpdateProposalStatusRequest $request, int $briefId, int $proposalId): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401, 'No autenticado. Token inválido o expirado.');

        $brief = Brief::find($briefId);
        abort_if($brief === null, 404, 'Brief no encontrado.');

        if ($user->id !== $brief->client_id) {
            abort(403, 'Solo el autor del brief puede aceptar o rechazar propuestas.');
        }

        $proposal = Proposal::where('brief_id', $brief->id)->where('id', $proposalId)->first();
        abort_if($proposal === null, 404, 'Propuesta no encontrada.');

        if ($proposal->status !== ProposalStatus::Pending) {
            abort(422, 'Esta propuesta ya fue procesada.');
        }

        $newStatus = ProposalStatus::from($request->validated('status'));

        $accepted = DB::transaction(function () use ($brief, $proposal, $newStatus) {
            $proposal->status = $newStatus;
            $proposal->save();

            if ($newStatus === ProposalStatus::Accepted) {
                $brief->status = BriefStatus::Assigned;
                $brief->save();

                Proposal::where('brief_id', $brief->id)
                    ->where('id', '!=', $proposal->id)
                    ->where('status', ProposalStatus::Pending)
                    ->update(['status' => ProposalStatus::Rejected]);
            }

            return $proposal;
        });

        if ($accepted->status === ProposalStatus::Accepted) {
            $this->chat->getOrCreateForBrief($brief);
        }

        $accepted->load('freelancerProfile.user');
        $brief->refresh();

        $freelancerUser = $accepted->freelancerProfile?->user;
        if ($freelancerUser !== null) {
            $notification = match ($accepted->status) {
                ProposalStatus::Accepted => new ProposalAcceptedNotification($brief, $accepted),
                ProposalStatus::Rejected => new ProposalRejectedNotification($brief, $accepted),
                default                   => null,
            };
            if ($notification !== null) {
                $this->notifications->send($freelancerUser, $notification);
                if ($accepted->status === ProposalStatus::Accepted) {
                    $this->notifications->send($freelancerUser, new BriefAssignedNotification($brief));
                }
            }
        }

        return response()->json([
            'data' => [
                'proposal' => (new ProposalResource($accepted))->resolve(),
                'brief'    => (new BriefResource($brief))->resolve(),
            ],
        ], 200);
    }
}
