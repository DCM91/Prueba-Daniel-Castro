<?php

declare(strict_types=1);

namespace App\Services\Cloudinary;

use App\Exceptions\CloudinaryVerificationException;

interface CloudinaryServiceInterface
{
    /**
     * Verify that a resource exists in Cloudinary and belongs to the expected folder.
     *
     * @return array{public_id: string, folder: string, url: string, secure_url: string, width: ?int, height: ?int, format: ?string, bytes: ?int, resource_type: string}
     *
     * @throws CloudinaryVerificationException
     */
    public function verifyResource(string $publicId, string $expectedFolder): array;

    /**
     * Best-effort delete of a Cloudinary resource. Failures are logged, never thrown.
     */
    public function deleteResource(string $publicId): void;

    /**
     * Build the URL of a user avatar at a given size. Returns null if publicId is null.
     */
    public function avatarUrl(?string $publicId, string $size = 'md'): ?string;

    /**
     * @return array{xs: ?string, sm: ?string, md: ?string, lg: ?string, xxl: ?string}|null
     */
    public function avatarUrls(?string $publicId): ?array;

    /**
     * Build the URL of a freelancer cover at a given size.
     */
    public function coverUrl(?string $publicId, string $size = 'lg'): ?string;

    /**
     * @return array{sm: ?string, md: ?string, lg: ?string, xxl: ?string}|null
     */
    public function coverUrls(?string $publicId): ?array;

    /**
     * Build the URL of a portfolio item at a given variant.
     */
    public function portfolioUrl(?string $publicId, string $variant = 'card'): ?string;

    /**
     * @return array{thumb: ?string, card: ?string, full: ?string}|null
     */
    public function portfolioUrls(?string $publicId): ?array;

    /**
     * Build the URL of a brief attachment at a given variant.
     */
    public function briefUrl(?string $publicId, string $variant = 'card'): ?string;

    /**
     * @return array{thumb: ?string, card: ?string, full: ?string}|null
     */
    public function briefUrls(?string $publicId): ?array;

    /**
     * Get the unsigned upload preset name for a given image type.
     */
    public function presetFor(string $type): string;

    /**
     * Get the expected Cloudinary folder for a given image type.
     */
    public function folderFor(string $type): string;
}
