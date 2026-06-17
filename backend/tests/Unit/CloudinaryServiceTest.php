<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\CloudinaryVerificationException;
use App\Services\Cloudinary\CloudinaryService;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class CloudinaryServiceTest extends TestCase
{
    private function makeService(array $overrides = []): CloudinaryService
    {
        return new CloudinaryService(
            app(HttpFactory::class),
            $overrides['cloud']    ?? 'demo-cloud',
            $overrides['apiKey']   ?? 'demo-key',
            $overrides['apiSecret']?? 'demo-secret',
            $overrides['presets']  ?? [
                'avatar'    => 'fm_av_upl',
                'cover'     => 'fm_cv_upl',
                'portfolio' => 'fm_pf_upl',
                'brief'     => 'fm_br_upl',
            ],
            $overrides['folders']  ?? [
                'avatar'    => 'framematch/avatars',
                'cover'     => 'framematch/covers',
                'portfolio' => 'framematch/portfolios',
                'brief'     => 'framematch/briefs',
            ],
        );
    }

    public function test_verify_resource_returns_metadata_on_200(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::response([
                'public_id'     => 'framematch/avatars/42-abc',
                'folder'        => 'framematch/avatars',
                'url'           => 'http://res.cloudinary.com/demo-cloud/image/upload/v123/abc.jpg',
                'secure_url'    => 'https://res.cloudinary.com/demo-cloud/image/upload/v123/abc.jpg',
                'width'         => 800,
                'height'        => 800,
                'format'        => 'jpg',
                'bytes'         => 12345,
                'resource_type' => 'image',
            ], 200),
        ]);

        $resource = $this->makeService()->verifyResource(
            'framematch/avatars/42-abc',
            'framematch/avatars',
        );

        $this->assertSame('framematch/avatars/42-abc', $resource['public_id']);
        $this->assertSame('framematch/avatars', $resource['folder']);
        $this->assertSame(800, $resource['width']);
        $this->assertSame(800, $resource['height']);
        $this->assertSame('jpg', $resource['format']);
        $this->assertSame(12345, $resource['bytes']);
        $this->assertSame('image', $resource['resource_type']);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/resources/image/upload/')
                && $request->url() === 'https://api.cloudinary.com/v1_1/demo-cloud/resources/image/upload/framematch%2Favatars%2F42-abc';
        });
    }

    public function test_verify_resource_throws_when_resource_not_found(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::response(['error' => ['message' => 'not found']], 404),
        ]);

        $this->expectException(CloudinaryVerificationException::class);
        $this->expectExceptionMessage('El recurso no existe en Cloudinary.');

        $this->makeService()->verifyResource('framematch/avatars/missing', 'framematch/avatars');
    }

    public function test_verify_resource_throws_when_folder_mismatch(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::response([
                'public_id'     => 'framematch/portfolios/99',
                'folder'        => 'framematch/portfolios',
                'resource_type' => 'image',
            ], 200),
        ]);

        $this->expectException(CloudinaryVerificationException::class);
        $this->expectExceptionMessage('El recurso no pertenece a la carpeta esperada.');

        $this->makeService()->verifyResource('framematch/portfolios/99', 'framematch/avatars');
    }

    public function test_verify_resource_throws_when_resource_type_is_not_image(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::response([
                'public_id'     => 'framematch/avatars/video1',
                'folder'        => 'framematch/avatars',
                'resource_type' => 'video',
            ], 200),
        ]);

        $this->expectException(CloudinaryVerificationException::class);
        $this->expectExceptionMessage('El recurso no es una imagen.');

        $this->makeService()->verifyResource('framematch/avatars/video1', 'framematch/avatars');
    }

    public function test_avatar_url_includes_face_aware_fill_and_auto_format(): void
    {
        $url = $this->makeService()->avatarUrl('framematch/avatars/42-abc', 'md');

        $this->assertSame(
            'https://res.cloudinary.com/demo-cloud/image/upload/w_200,h_200,c_fill,g_auto,r_max,q_auto,f_auto/framematch/avatars/42-abc',
            $url,
        );
    }

    public function test_avatar_urls_returns_all_sizes(): void
    {
        $urls = $this->makeService()->avatarUrls('framematch/avatars/42-abc');

        $this->assertNotNull($urls);
        $this->assertArrayHasKey('xs', $urls);
        $this->assertArrayHasKey('sm', $urls);
        $this->assertArrayHasKey('md', $urls);
        $this->assertArrayHasKey('lg', $urls);
        $this->assertArrayHasKey('xxl', $urls);
        $this->assertStringContainsString('w_40,', $urls['xs']);
        $this->assertStringContainsString('w_800,', $urls['xxl']);
    }

    public function test_avatar_url_returns_null_when_public_id_is_null(): void
    {
        $this->assertNull($this->makeService()->avatarUrl(null));
        $this->assertNull($this->makeService()->avatarUrls(null));
    }

    public function test_cover_url_uses_5_to_1_aspect_ratio(): void
    {
        $url = $this->makeService()->coverUrl('framematch/covers/1-xyz', 'lg');

        $this->assertStringContainsString('w_1600,', $url);
        $this->assertStringContainsString('h_320,', $url);
        $this->assertStringContainsString('c_fill', $url);
        $this->assertStringContainsString('q_auto,f_auto', $url);
    }

    public function test_portfolio_url_supports_thumb_card_and_full_variants(): void
    {
        $service = $this->makeService();
        $thumb = $service->portfolioUrl('framematch/portfolios/p1', 'thumb');
        $card  = $service->portfolioUrl('framematch/portfolios/p1', 'card');
        $full  = $service->portfolioUrl('framematch/portfolios/p1', 'full');

        $this->assertStringContainsString('w_200,h_150,', $thumb);
        $this->assertStringContainsString('w_400,h_300,', $card);
        $this->assertStringContainsString('w_1200,', $full);
        $this->assertStringContainsString('c_limit,', $full);
    }

    public function test_preset_and_folder_helpers_return_configured_values(): void
    {
        $service = $this->makeService();

        $this->assertSame('fm_av_upl', $service->presetFor('avatar'));
        $this->assertSame('framematch/avatars', $service->folderFor('avatar'));
        $this->assertSame('fm_pf_upl', $service->presetFor('portfolio'));
        $this->assertSame('framematch/portfolios', $service->folderFor('portfolio'));
    }

    public function test_verify_resource_retries_with_folder_prefix_when_basename_not_found(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::sequence()
                ->push(['error' => ['message' => 'not found']], 404)
                ->push([
                    'public_id'     => 'framematch/avatars/abc',
                    'folder'        => 'framematch/avatars',
                    'url'           => 'http://res.cloudinary.com/demo-cloud/image/upload/v123/abc.jpg',
                    'secure_url'    => 'https://res.cloudinary.com/demo-cloud/image/upload/v123/abc.jpg',
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

    public function test_verify_resource_accepts_asset_folder_as_fallback(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::response([
                'public_id'     => 'wvokkrfqzuu7tqmmvdtk',
                'asset_folder'  => 'framematch/avatars',
                'url'           => 'http://res.cloudinary.com/demo-cloud/image/upload/v123/test.jpg',
                'secure_url'    => 'https://res.cloudinary.com/demo-cloud/image/upload/v123/test.jpg',
                'width'         => 800,
                'height'        => 800,
                'format'        => 'jpg',
                'bytes'         => 12345,
                'resource_type' => 'image',
            ], 200),
        ]);

        $resource = $this->makeService()->verifyResource('wvokkrfqzuu7tqmmvdtk', 'framematch/avatars');

        $this->assertSame('framematch/avatars/wvokkrfqzuu7tqmmvdtk', $resource['public_id']);
        $this->assertSame('framematch/avatars', $resource['folder']);
    }

    public function test_delete_resource_sends_delete_request_and_swallows_errors(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::response(['result' => 'ok'], 200),
        ]);

        $this->makeService()->deleteResource('framematch/avatars/old');

        Http::assertSent(function ($request) {
            return $request->method() === 'DELETE'
                && str_contains($request->url(), '/resources/image/upload')
                && $request->data() === ['public_ids' => ['framematch/avatars/old']];
        });
    }

    public function test_delete_resource_logs_and_continues_on_failure(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::response('boom', 500),
        ]);

        // Should NOT throw — delete is best-effort.
        $this->makeService()->deleteResource('framematch/avatars/old');

        $this->assertTrue(true);
    }
}
