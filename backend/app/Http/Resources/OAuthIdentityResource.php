<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\OAuthProvider;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class OAuthIdentityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $provider = $this->provider instanceof OAuthProvider ? $this->provider : null;
        $labels   = OAuthProvider::labels();

        return [
            'id'                => $this->id,
            'provider'          => $provider?->value,
            'provider_label'    => $provider ? ($labels[$provider->value] ?? ucfirst($provider->value)) : null,
            'provider_email'    => $this->provider_email,
            'linked_at'         => $this->linked_at?->toIso8601String(),
            'last_used_at'      => $this->last_used_at?->toIso8601String(),
            'token_expires_at'  => $this->token_expires_at?->toIso8601String(),
            'has_refresh_token' => $this->refresh_token !== null,
        ];
    }
}
