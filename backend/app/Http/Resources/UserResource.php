<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class UserResource extends JsonResource
{
    /**
     * @param  mixed  $resource
     * @param  array{xs: ?string, sm: ?string, md: ?string, lg: ?string, xxl: ?string}|null  $avatarUrls
     *   Pre-computed Cloudinary URLs for the user avatar at multiple sizes. Built by
     *   the controller from App\Services\Cloudinary\CloudinaryServiceInterface.
     */
    public function __construct(mixed $resource, private readonly ?array $avatarUrls = null)
    {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        $data = [
            'id'         => $this->id,
            'name'       => $this->name,
            'email'      => $this->email,
            'phone'      => $this->phone,
            'city'       => $this->city,
            'role'       => $this->role instanceof UserRole ? $this->role->value : $this->role,
            'created_at' => $this->created_at?->toIso8601String(),
            'avatar_url' => $this->avatar_url,
            'avatar_urls'=> $this->avatarUrls,
        ];

        if ($this->role === UserRole::Freelancer && $this->relationLoaded('freelancerProfile')) {
            $profile = $this->freelancerProfile;
            $data['freelancer_profile'] = $profile
                ? (new FreelancerProfileResource($profile))->toArray($request)
                : null;
        }

        return $data;
    }
}
