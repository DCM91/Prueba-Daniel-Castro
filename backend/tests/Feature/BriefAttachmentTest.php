<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Brief;
use App\Models\BriefAttachment;
use App\Models\User;
use App\Services\Cloudinary\CloudinaryServiceFake;
use App\Services\Cloudinary\CloudinaryServiceInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

final class BriefAttachmentTest extends TestCase
{
    use RefreshDatabase;

    private function bindFakeCloudinary(array $extraResources = []): CloudinaryServiceFake
    {
        $fake = new CloudinaryServiceFake(array_merge([
            'framematch/briefs/1' => [
                'folder' => 'framematch/briefs', 'width' => 1200, 'height' => 800,
                'format' => 'jpg', 'bytes' => 120000,
            ],
            'framematch/briefs/2' => [
                'folder' => 'framematch/briefs', 'width' => 1200, 'height' => 800,
                'format' => 'jpg', 'bytes' => 90000,
            ],
        ], $extraResources));

        $this->app->instance(CloudinaryServiceInterface::class, $fake);

        return $fake;
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'public_id' => 'framematch/briefs/1',
            'url'       => 'https://res.cloudinary.com/demo/brief/1.jpg',
            'width'     => 1200,
            'height'    => 800,
            'format'    => 'jpg',
            'bytes'     => 120000,
            'title'     => 'Imagen de referencia',
        ], $overrides);
    }

    private function createBriefWithOwner(User $client): Brief
    {
        return Brief::create([
            'client_id'    => $client->id,
            'title'        => 'Brief con adjuntos',
            'description'  => 'Descripcion larga del brief con adjuntos para testing',
            'category'     => 'photo',
            'status'       => 'published',
            'published_at' => now(),
        ]);
    }

    public function test_client_can_attach_image_to_own_brief(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments", $this->validPayload())
            ->assertStatus(201)
            ->assertJsonPath('data.public_id', 'framematch/briefs/1')
            ->assertJsonStructure([
                'data' => [
                    'id', 'brief_id', 'public_id', 'url',
                    'urls' => ['thumb', 'card', 'full'],
                    'width', 'height', 'format', 'bytes', 'title', 'position',
                ],
            ]);

        $this->assertDatabaseCount('brief_attachments', 1);
        $this->assertDatabaseHas('brief_attachments', [
            'brief_id'  => $brief->id,
            'public_id' => 'framematch/briefs/1',
            'position'  => 0,
        ]);
    }

    public function test_attach_image_increments_position(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments", $this->validPayload())
            ->assertStatus(201);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments",
                $this->validPayload(['public_id' => 'framematch/briefs/2']))
            ->assertStatus(201)
            ->assertJsonPath('data.position', 1);
    }

    public function test_non_owner_cannot_attach_image(): void
    {
        $this->bindFakeCloudinary();
        $owner  = User::factory()->create(['role' => 'client']);
        $other  = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($other);
        $brief  = $this->createBriefWithOwner($owner);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments", $this->validPayload())
            ->assertStatus(403);

        $this->assertDatabaseCount('brief_attachments', 0);
    }

    public function test_freelancer_cannot_attach_image(): void
    {
        $this->bindFakeCloudinary();
        $client     = User::factory()->create(['role' => 'client']);
        $freelancer = User::factory()->freelancer()->create();
        $token      = JWTAuth::fromUser($freelancer);
        $brief      = $this->createBriefWithOwner($client);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments", $this->validPayload())
            ->assertStatus(403);
    }

    public function test_attach_rejects_payload_without_public_id(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $payload = $this->validPayload();
        unset($payload['public_id']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments", $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['public_id']);
    }

    public function test_attach_rejects_invalid_public_id_format(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments",
                $this->validPayload(['public_id' => 'invalid public id!']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['public_id']);
    }

    public function test_attach_rejects_unknown_cloudinary_resource(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments",
                $this->validPayload(['public_id' => 'framematch/briefs/does-not-exist']))
            ->assertStatus(403);
    }

    public function test_attach_rejects_wrong_folder(): void
    {
        $this->bindFakeCloudinary([
            'framematch/portfolios/x' => [
                'folder' => 'framematch/portfolios', 'width' => 800, 'height' => 600,
                'format' => 'jpg', 'bytes' => 50000,
            ],
        ]);
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments",
                $this->validPayload(['public_id' => 'framematch/portfolios/x']))
            ->assertStatus(403)
            ->assertJsonPath('message', 'El recurso no pertenece a la carpeta esperada.');
    }

    public function test_attach_requires_title(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $payload = $this->validPayload();
        unset($payload['title']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments", $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);

        $this->assertDatabaseCount('brief_attachments', 0);
    }

    public function test_attach_rejects_when_limit_reached(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        for ($i = 0; $i < 10; $i++) {
            BriefAttachment::create([
                'brief_id'  => $brief->id,
                'public_id' => "framematch/briefs/seed-{$i}",
                'url'       => "https://res.cloudinary.com/demo/brief/seed-{$i}.jpg",
                'position'  => $i,
            ]);
        }

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/attachments", $this->validPayload())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Has alcanzado el límite de imágenes para este proyecto.');
    }

    public function test_unauthenticated_cannot_attach(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $brief  = $this->createBriefWithOwner($client);

        $this->postJson("/api/briefs/{$brief->id}/attachments", $this->validPayload())
            ->assertStatus(401);
    }

    public function test_client_can_detach_own_attachment(): void
    {
        $fake = $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $attachment = BriefAttachment::create([
            'brief_id'  => $brief->id,
            'public_id' => 'framematch/briefs/1',
            'url'       => 'https://res.cloudinary.com/demo/brief/1.jpg',
            'position'  => 0,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/briefs/{$brief->id}/attachments/{$attachment->id}")
            ->assertStatus(200)
            ->assertJsonPath('message', 'Imagen eliminada.');

        $this->assertDatabaseMissing('brief_attachments', ['id' => $attachment->id]);
        $this->assertContains('framematch/briefs/1', $fake->deleted);
    }

    public function test_non_owner_cannot_detach(): void
    {
        $this->bindFakeCloudinary();
        $owner = User::factory()->create(['role' => 'client']);
        $other = User::factory()->create(['role' => 'client']);
        $token = JWTAuth::fromUser($other);
        $brief = $this->createBriefWithOwner($owner);

        $attachment = BriefAttachment::create([
            'brief_id'  => $brief->id,
            'public_id' => 'framematch/briefs/1',
            'url'       => 'https://res.cloudinary.com/demo/brief/1.jpg',
            'position'  => 0,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/briefs/{$brief->id}/attachments/{$attachment->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('brief_attachments', ['id' => $attachment->id]);
    }

    public function test_reorder_attachments(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $a = BriefAttachment::create([
            'brief_id'  => $brief->id, 'public_id' => 'framematch/briefs/1',
            'url' => 'https://res.cloudinary.com/demo/brief/1.jpg', 'position' => 0,
        ]);
        $b = BriefAttachment::create([
            'brief_id'  => $brief->id, 'public_id' => 'framematch/briefs/2',
            'url' => 'https://res.cloudinary.com/demo/brief/2.jpg', 'position' => 1,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/briefs/{$brief->id}/attachments/reorder",
                ['ids' => [$b->id, $a->id]])
            ->assertStatus(200)
            ->assertJsonPath('data.0.id', $b->id)
            ->assertJsonPath('data.0.position', 0)
            ->assertJsonPath('data.1.id', $a->id)
            ->assertJsonPath('data.1.position', 1);
    }

    public function test_reorder_rejects_ids_not_owned_by_brief(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $token  = JWTAuth::fromUser($client);
        $brief  = $this->createBriefWithOwner($client);

        $a = BriefAttachment::create([
            'brief_id'  => $brief->id, 'public_id' => 'framematch/briefs/1',
            'url' => 'https://res.cloudinary.com/demo/brief/1.jpg', 'position' => 0,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/briefs/{$brief->id}/attachments/reorder",
                ['ids' => [$a->id, 9999]])
            ->assertStatus(422);
    }

    public function test_show_brief_includes_attachments(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $brief  = $this->createBriefWithOwner($client);

        BriefAttachment::create([
            'brief_id'  => $brief->id, 'public_id' => 'framematch/briefs/1',
            'url' => 'https://res.cloudinary.com/demo/brief/1.jpg', 'position' => 0,
        ]);

        $this->getJson("/api/briefs/{$brief->id}")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.attachments')
            ->assertJsonPath('data.attachments.0.public_id', 'framematch/briefs/1')
            ->assertJsonStructure([
                'data' => [
                    'attachments' => [
                        '*' => ['id', 'public_id', 'url', 'urls' => ['thumb', 'card', 'full']],
                    ],
                ],
            ]);
    }

    public function test_index_briefs_includes_attachments(): void
    {
        $this->bindFakeCloudinary();
        $client = User::factory()->create(['role' => 'client']);
        $brief  = $this->createBriefWithOwner($client);

        BriefAttachment::create([
            'brief_id'  => $brief->id, 'public_id' => 'framematch/briefs/1',
            'url' => 'https://res.cloudinary.com/demo/brief/1.jpg', 'position' => 0,
        ]);

        $this->getJson('/api/briefs')
            ->assertStatus(200)
            ->assertJsonPath('data.0.attachments.0.public_id', 'framematch/briefs/1');
    }
}
