# Plan: Fix Cloudinary folder validation 403 error

## Root Cause

Cloudinary's unsigned upload API returns `public_id` **without** the folder prefix when a folder is configured in the upload preset. The frontend sends this basename-only `public_id` to the backend. `CloudinaryService::verifyResource()` finds the resource but the folder check at line 67-77 fails because:

1. The code only reads `$resource['folder']` — but the admin API may return `folder` as empty/null for resources uploaded via unsigned presets
2. The `public_id` doesn't contain the folder prefix either
3. The code ignores the `asset_folder` field that Cloudinary includes in upload responses

Both `$matchesFolder` and `$matchesPublicId` evaluate to false → throws "El recurso no pertenece a la carpeta esperada." → HTTP 403.

---

## Changes

### 1. `backend/app/Services/Cloudinary/CloudinaryService.php`

**Change A: Extract `fetchResource()` private method**

Replace the inline HTTP call in `verifyResource()` with a reusable private method that:
- Returns `null` on 404 (instead of throwing)
- Throws `CloudinaryVerificationException` on other errors
- Returns the parsed JSON array on success

**Change B: Rewrite `verifyResource()` to try both public_id formats**

```php
public function verifyResource(string $publicId, string $expectedFolder): array
{
    $resource = $this->fetchResource($publicId);

    // If not found and public_id lacks the folder prefix, retry with the full path.
    // This handles the case where Cloudinary's unsigned upload API returns
    // a basename-only public_id but the Admin API needs the full path.
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

    // Use folder field, falling back to asset_folder (Cloudinary upload API field
    // that may also appear in admin API responses for unsigned-preset uploads).
    $folder = (string) ($resource['folder'] ?? $resource['asset_folder'] ?? '');
    $publicIdFull = (string) ($resource['public_id'] ?? $publicId);

    $matchesFolder = $folder === $expectedFolder
        || str_starts_with($folder, $expectedFolder . '/');
    $matchesPublicId = str_starts_with($publicIdFull, $expectedFolder . '/')
        || $publicIdFull === $expectedFolder;

    if (! $matchesFolder && ! $matchesPublicId) {
        throw new CloudinaryVerificationException('El recurso no pertenece a la carpeta esperada.');
    }

    // Normalize: ensure the stored public_id always includes the expected folder
    // for consistent URL generation and deletion across the codebase.
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
```

**Diff summary for CloudinaryService.php:**
- Lines 40-90: Replace `verifyResource()` with new implementation
- Add `fetchResource()` as new private method after `verifyResource()`

---

### 2. `backend/app/Services/Cloudinary/CloudinaryServiceFake.php`

**Change A: Add `asset_folder` fallback for folder detection (line 56)**

```php
// Before:
$folder = (string) ($resource['folder'] ?? '');
// After:
$folder = (string) ($resource['folder'] ?? $resource['asset_folder'] ?? '');
```

**Change B: Add public_id normalization after verification**

After line 64 (after the folder check, before the return), add:

```php
if (! str_starts_with($publicIdFull, $expectedFolder . '/') && $publicIdFull !== $expectedFolder) {
    $publicIdFull = $expectedFolder . '/' . ltrim($publicIdFull, '/');
}
```

---

### 3. Tests

**Existing tests should continue to pass** because:
- Tests already use full-path public_ids (`framematch/avatars/42-abc`)
- The `fetchResource()` extraction preserves the same HTTP behavior (404 → null, other 4xx/5xx → exception)
- The retry logic only triggers when first lookup returns null AND public_id lacks the prefix (doesn't apply to existing tests)
- The `asset_folder` fallback is harmless when `folder` is already present
- The public_id normalization is a no-op when public_id already has the prefix

**Add new test case** in `backend/tests/Feature/AvatarUploadTest.php`:

```php
public function test_public_id_without_folder_prefix_still_accepted(): void
{
    $this->bindFakeCloudinary([
        'framematch/avatars/basename-only' => [
            'folder'    => 'framematch/avatars',
            'width'     => 800,
            'height'    => 800,
            'format'    => 'jpg',
            'bytes'     => 12345,
        ],
    ]);

    $user = User::factory()->create();
    $token = JWTAuth::fromUser($user);

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/me/avatar', $this->validPayload([
            'public_id' => 'basename-only',
            'url'       => 'https://res.cloudinary.com/demo/image/upload/v1/basename.jpg',
        ]))
        ->assertOk()
        ->assertJsonPath('data.avatar_url', 'https://res.cloudinary.com/demo/image/upload/v1/basename.jpg')
        ->assertJsonPath('data.avatar_urls.md', 'https://res.cloudinary.com/fake-cloud/image/upload/w_200,h_200,c_fill,g_auto,r_max,q_auto,f_auto/framematch/avatars/basename-only');

    $this->assertDatabaseHas('users', [
        'id'               => $user->id,
        'avatar_public_id' => 'framematch/avatars/basename-only',
    ]);
}
```

**Add new test case** in `backend/tests/Unit/CloudinaryServiceTest.php`:

```php
public function test_verify_resource_retries_with_folder_prefix_when_basename_not_found(): void
{
    Http::fake([
        // First call with basename-only returns 404
        'api.cloudinary.com/*' => Http::sequence()
            ->push(['error' => ['message' => 'not found']], 404)
            // Second call with full path succeeds
            ->push([
                'public_id'     => 'framematch/avatars/abc',
                'folder'        => 'framematch/avatars',
                'url'           => 'http://res.cloudinary.com/demo/image/upload/v123/abc.jpg',
                'secure_url'    => 'https://res.cloudinary.com/demo/image/upload/v123/abc.jpg',
                'width'         => 800,
                'height'        => 800,
                'format'        => 'jpg',
                'bytes'         => 12345,
                'resource_type' => 'image',
            ], 200),
    ]);

    $resource = $this->makeService()->verifyResource('abc', 'framematch/avatars');

    $this->assertSame('framematch/avatars/abc', $resource['public_id']);
    $this->assertSame('framematch/avatars', $resource['folder']);
}
```

---

## Impact Analysis

| Component | Impact |
|---|---|
| `UserAvatarController` | No changes needed — receives normalized public_id from verifyResource |
| `FreelancerCoverController` | No changes needed — same flow, uses same verifyResource |
| `FreelancerPortfolioController` | No changes needed |
| URL generation (`buildUrl`) | Will use normalized full-path public_id from DB, works correctly |
| Deletion (`deleteResource`) | Will use normalized full-path public_id, works correctly |
| Frontend | No changes needed — continues sending public_id as-is from Cloudinary |
| Existing tests | All should pass unchanged |

---

## Verification

1. Run backend tests:
```bash
cd backend && php artisan test
```

2. Manual verification:
   - Upload an avatar through the frontend
   - Verify no 403 error
   - Verify the avatar URL works in the UI
   - Delete the avatar and verify removal works
