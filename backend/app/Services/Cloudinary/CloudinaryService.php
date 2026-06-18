<?php

declare(strict_types=1);

namespace App\Services\Cloudinary;

use App\Exceptions\CloudinaryVerificationException;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Log;

final class CloudinaryService implements CloudinaryServiceInterface
{
    private const AVATAR_SIZES = [
        'xs'  => 40,
        'sm'  => 80,
        'md'  => 200,
        'lg'  => 400,
        'xxl' => 800,
    ];

    private const COVER_SIZES = [
        'sm'  => 800,
        'md'  => 1200,
        'lg'  => 1600,
        'xxl' => 2000,
    ];

    private const COVER_RATIO = 5; // width / height (16:5 → 3.2; we use 5 to mean 5 sub-units of 80px = 400px height for lg)

    public function __construct(
        private readonly HttpFactory $http,
        private readonly string $cloudName,
        private readonly string $apiKey,
        private readonly string $apiSecret,
        private readonly array $presets,
        private readonly array $folders,
    ) {
    }

    public function verifyResource(string $publicId, string $expectedFolder): array
    {
        $resource = $this->fetchResource($publicId);

        if ($resource === null && ! str_starts_with($publicId, $expectedFolder . '/')) {
            $resource = $this->fetchResource($expectedFolder . '/' . $publicId);
            if ($resource !== null) {
                $publicId = $expectedFolder . '/' . $publicId;
            }
        }

        if ($resource === null) {
            throw new CloudinaryVerificationException('El recurso no existe en Cloudinary.');
        }

        if (($resource['resource_type'] ?? null) !== 'image') {
            throw new CloudinaryVerificationException('El recurso no es una imagen.');
        }

        $folder = (string) ($resource['folder'] ?? $resource['asset_folder'] ?? '');
        $publicIdFull = (string) ($resource['public_id'] ?? $publicId);

        $matchesFolder = $folder === $expectedFolder
            || str_starts_with($folder, $expectedFolder . '/');
        $matchesPublicId = str_starts_with($publicIdFull, $expectedFolder . '/')
            || $publicIdFull === $expectedFolder;

        if (! $matchesFolder && ! $matchesPublicId) {
            throw new CloudinaryVerificationException('El recurso no pertenece a la carpeta esperada.');
        }

        if (! str_starts_with($publicIdFull, $expectedFolder . '/') && $publicIdFull !== $expectedFolder) {
            $publicIdFull = $expectedFolder . '/' . ltrim($publicIdFull, '/');
        }

        return [
            'public_id'     => $publicIdFull,
            'folder'        => $folder,
            'url'           => (string) ($resource['url'] ?? ''),
            'secure_url'    => (string) ($resource['secure_url'] ?? ''),
            'width'         => isset($resource['width']) ? (int) $resource['width'] : null,
            'height'        => isset($resource['height']) ? (int) $resource['height'] : null,
            'format'        => isset($resource['format']) ? (string) $resource['format'] : null,
            'bytes'         => isset($resource['bytes']) ? (int) $resource['bytes'] : null,
            'resource_type' => (string) ($resource['resource_type'] ?? 'image'),
        ];
    }

    private function fetchResource(string $publicId): ?array
    {
        $url = sprintf(
            'https://api.cloudinary.com/v1_1/%s/resources/image/upload/%s',
            $this->cloudName,
            rawurlencode($publicId),
        );

        $response = $this->http
            ->withBasicAuth($this->apiKey, $this->apiSecret)
            ->acceptJson()
            ->get($url);

        if ($response->status() === 404) {
            return null;
        }

        if (! $response->successful()) {
            throw new CloudinaryVerificationException('No se pudo verificar el recurso en Cloudinary.');
        }

        return $response->json();
    }

    public function deleteResource(string $publicId): void
    {
        $url = sprintf(
            'https://api.cloudinary.com/v1_1/%s/resources/image/upload',
            $this->cloudName,
        );

        try {
            $this->http
                ->withBasicAuth($this->apiKey, $this->apiSecret)
                ->acceptJson()
                ->delete($url, ['public_ids' => [$publicId]]);
        } catch (\Throwable $e) {
            Log::warning('No se pudo eliminar el recurso de Cloudinary.', [
                'public_id' => $publicId,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    public function avatarUrl(?string $publicId, string $size = 'md'): ?string
    {
        if ($publicId === null) {
            return null;
        }

        $px = self::AVATAR_SIZES[$size] ?? self::AVATAR_SIZES['md'];
        $t  = "w_{$px},h_{$px},c_fill,g_auto,r_max,q_auto,f_auto";

        return $this->buildUrl($publicId, $t);
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

        $w = self::COVER_SIZES[$size] ?? self::COVER_SIZES['lg'];
        $h = (int) round($w / self::COVER_RATIO);
        $t = "w_{$w},h_{$h},c_fill,q_auto,f_auto";

        return $this->buildUrl($publicId, $t);
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

        $t = match ($variant) {
            'thumb' => 'w_200,h_150,c_fill,q_auto,f_auto',
            'card'  => 'w_400,h_300,c_fill,q_auto,f_auto',
            'full'  => 'w_1200,c_limit,q_auto,f_auto',
            default => 'w_400,h_300,c_fill,q_auto,f_auto',
        };

        return $this->buildUrl($publicId, $t);
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

    public function briefUrl(?string $publicId, string $variant = 'card'): ?string
    {
        if ($publicId === null) {
            return null;
        }

        $t = match ($variant) {
            'thumb' => 'w_240,h_180,c_fill,q_auto,f_auto',
            'card'  => 'w_600,h_450,c_fill,q_auto,f_auto',
            'full'  => 'w_1600,c_limit,q_auto,f_auto',
            default => 'w_600,h_450,c_fill,q_auto,f_auto',
        };

        return $this->buildUrl($publicId, $t);
    }

    public function briefUrls(?string $publicId): ?array
    {
        if ($publicId === null) {
            return null;
        }

        return [
            'thumb' => $this->briefUrl($publicId, 'thumb'),
            'card'  => $this->briefUrl($publicId, 'card'),
            'full'  => $this->briefUrl($publicId, 'full'),
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

    private function buildUrl(string $publicId, string $transformation): string
    {
        return sprintf(
            'https://res.cloudinary.com/%s/image/upload/%s/%s',
            $this->cloudName,
            $transformation,
            $publicId,
        );
    }
}
