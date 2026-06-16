<?php

declare(strict_types=1);

namespace App\Services\Cloudinary;

use App\Exceptions\CloudinaryVerificationException;

/**
 * Test double for CloudinaryService. Injects canned data without hitting the
 * Cloudinary Admin API. Used in feature tests via:
 *   $this->app->instance(CloudinaryServiceInterface::class, new CloudinaryServiceFake([...]));
 */
final class CloudinaryServiceFake implements CloudinaryServiceInterface
{
    /**
     * @param array<string, array{folder: string, public_id?: string, width?: int, height?: int, format?: string, bytes?: int}> $resources
     *   Map of publicId => resource metadata. The folder MUST match what the test expects.
     * @param array<int, string> $deleted Public IDs that have been "deleted" during the test.
     * @param array<int, string> $nonExistent Public IDs that should be reported as 404.
     */
    public function __construct(
        private readonly array $resources = [],
        private readonly array $folders = [
            'avatar'    => 'framematch/avatars',
            'cover'     => 'framematch/covers',
            'portfolio' => 'framematch/portfolios',
            'brief'     => 'framematch/briefs',
        ],
        private readonly array $presets = [
            'avatar'    => 'fm_av_upl',
            'cover'     => 'fm_cv_upl',
            'portfolio' => 'fm_pf_upl',
            'brief'     => 'fm_br_upl',
        ],
        private readonly string $cloudName = 'fake-cloud',
        public array $deleted = [],
        public array $nonExistent = [],
    ) {
    }

    public function verifyResource(string $publicId, string $expectedFolder): array
    {
        if (in_array($publicId, $this->nonExistent, true)) {
            throw new CloudinaryVerificationException('El recurso no existe en Cloudinary.');
        }

        if (! isset($this->resources[$publicId])) {
            throw new CloudinaryVerificationException('El recurso no existe en Cloudinary.');
        }

        $resource = $this->resources[$publicId];
        if (($resource['folder'] ?? '') !== $expectedFolder
            && ! str_starts_with($resource['folder'] ?? '', $expectedFolder . '/')) {
            throw new CloudinaryVerificationException('El recurso no pertenece a la carpeta esperada.');
        }

        return [
            'public_id'     => $publicId,
            'folder'        => $resource['folder'],
            'url'           => "https://res.cloudinary.com/{$this->cloudName}/image/upload/{$publicId}.jpg",
            'secure_url'    => "https://res.cloudinary.com/{$this->cloudName}/image/upload/{$publicId}.jpg",
            'width'         => $resource['width'] ?? null,
            'height'        => $resource['height'] ?? null,
            'format'        => $resource['format'] ?? null,
            'bytes'         => $resource['bytes'] ?? null,
            'resource_type' => 'image',
        ];
    }

    public function deleteResource(string $publicId): void
    {
        $this->deleted[] = $publicId;
    }

    public function avatarUrl(?string $publicId, string $size = 'md'): ?string
    {
        if ($publicId === null) {
            return null;
        }

        return "https://res.cloudinary.com/{$this->cloudName}/image/upload/w_200,h_200,c_fill,g_auto,r_max,q_auto,f_auto/{$publicId}";
    }

    public function avatarUrls(?string $publicId): ?array
    {
        if ($publicId === null) {
            return null;
        }

        return [
            'xs'  => $this->avatarUrl($publicId, 'xs'),
            'sm'  => $this->avatarUrl($publicId, 'sm'),
            'md'  => $this->avatarUrl($publicId, 'md'),
            'lg'  => $this->avatarUrl($publicId, 'lg'),
            'xxl' => $this->avatarUrl($publicId, 'xxl'),
        ];
    }

    public function coverUrl(?string $publicId, string $size = 'lg'): ?string
    {
        if ($publicId === null) {
            return null;
        }

        return "https://res.cloudinary.com/{$this->cloudName}/image/upload/w_1600,h_320,c_fill,q_auto,f_auto/{$publicId}";
    }

    public function coverUrls(?string $publicId): ?array
    {
        if ($publicId === null) {
            return null;
        }

        return [
            'sm'  => $this->coverUrl($publicId, 'sm'),
            'md'  => $this->coverUrl($publicId, 'md'),
            'lg'  => $this->coverUrl($publicId, 'lg'),
            'xxl' => $this->coverUrl($publicId, 'xxl'),
        ];
    }

    public function portfolioUrl(?string $publicId, string $variant = 'card'): ?string
    {
        if ($publicId === null) {
            return null;
        }

        return "https://res.cloudinary.com/{$this->cloudName}/image/upload/w_400,h_300,c_fill,q_auto,f_auto/{$publicId}";
    }

    public function portfolioUrls(?string $publicId): ?array
    {
        if ($publicId === null) {
            return null;
        }

        return [
            'thumb' => $this->portfolioUrl($publicId, 'thumb'),
            'card'  => $this->portfolioUrl($publicId, 'card'),
            'full'  => $this->portfolioUrl($publicId, 'full'),
        ];
    }

    public function briefAttachmentUrl(?string $publicId, string $variant = 'thumb'): ?string
    {
        if ($publicId === null) {
            return null;
        }

        return "https://res.cloudinary.com/{$this->cloudName}/image/upload/w_300,h_200,c_fill,q_auto,f_auto/{$publicId}";
    }

    public function briefAttachmentUrls(?string $publicId): ?array
    {
        if ($publicId === null) {
            return null;
        }

        return [
            'thumb' => $this->briefAttachmentUrl($publicId, 'thumb'),
            'full'  => $this->briefAttachmentUrl($publicId, 'full'),
        ];
    }

    public function presetFor(string $type): string
    {
        return (string) ($this->presets[$type] ?? '');
    }

    public function folderFor(string $type): string
    {
        return (string) ($this->folders[$type] ?? '');
    }
}
