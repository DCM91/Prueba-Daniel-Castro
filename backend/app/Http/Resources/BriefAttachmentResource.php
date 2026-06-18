<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class BriefAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var CloudinaryServiceInterface $cloudinary */
        $cloudinary = app(CloudinaryServiceInterface::class);

        return [
            'id'         => $this->id,
            'brief_id'   => $this->brief_id,
            'public_id'   => $this->public_id,
            'url'         => $this->url,
            'urls'        => $cloudinary->briefUrls($this->public_id),
            'width'       => $this->width,
            'height'      => $this->height,
            'format'      => $this->format,
            'bytes'       => $this->bytes,
            'title'       => $this->title,
            'position'    => $this->position,
            'created_at'  => $this->created_at?->toIso8601String(),
        ];
    }
}
