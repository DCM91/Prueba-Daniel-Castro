<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Brief;
use App\Models\FreelancerProfile;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class BriefsAndProposalsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SkillSeeder::class);
    }

    private function makeClient(): array
    {
        $user = User::factory()->create(['role' => 'client']);
        $token = auth('api')->login($user);
        return [$user, $token];
    }

    private function makeFreelancer(): array
    {
        $user = User::factory()->freelancer()->create();
        FreelancerProfile::create(['user_id' => $user->id, 'display_name' => 'Pro']);
        $token = auth('api')->login($user);
        return [$user, $token];
    }

    public function test_index_returns_published_briefs(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        Brief::create([
            'client_id' => $client->id,
            'title' => 'Brief 1',
            'description' => 'Descripcion larga del brief 1',
            'category' => 'photo',
            'status' => 'published',
            'published_at' => now(),
        ]);
        Brief::create([
            'client_id' => $client->id,
            'title' => 'Draft Brief',
            'description' => 'No debe aparecer',
            'category' => 'photo',
            'status' => 'draft',
        ]);

        $response = $this->getJson('/api/briefs');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Brief 1');
    }

    public function test_index_scope_mine_returns_only_own_briefs(): void
    {
        [$client, $token] = $this->makeClient();
        $other = User::factory()->create(['role' => 'client']);
        Brief::create([
            'client_id' => $client->id, 'title' => 'Mi brief', 'description' => 'X'.str_repeat('y', 30),
            'category' => 'photo', 'status' => 'published', 'published_at' => now(),
        ]);
        Brief::create([
            'client_id' => $other->id, 'title' => 'Otro brief', 'description' => 'X'.str_repeat('y', 30),
            'category' => 'photo', 'status' => 'published', 'published_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/briefs?scope=mine');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Mi brief');
    }

    public function test_show_returns_brief_with_proposals_count(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $brief = Brief::create([
            'client_id' => $client->id,
            'title' => 'Brief Show',
            'description' => 'Descripcion detallada del brief',
            'category' => 'video',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $response = $this->getJson("/api/briefs/{$brief->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $brief->id)
            ->assertJsonPath('data.title', 'Brief Show')
            ->assertJsonStructure(['data' => ['client' => ['id', 'name']]]);
    }

    public function test_show_returns_404_for_missing_brief(): void
    {
        $response = $this->getJson('/api/briefs/9999');
        $response->assertStatus(404)->assertJson(['message' => 'Brief no encontrado.']);
    }

    public function test_store_creates_brief_as_client(): void
    {
        [$client, $token] = $this->makeClient();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/briefs', [
                'title' => 'Nuevo brief de prueba',
                'description' => 'Descripcion suficientemente larga para pasar validacion',
                'category' => 'photo',
                'city' => 'Madrid',
                'budget_min' => 200,
                'budget_max' => 800,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Nuevo brief de prueba')
            ->assertJsonPath('data.status', 'published');

        $this->assertDatabaseHas('briefs', [
            'title' => 'Nuevo brief de prueba',
            'client_id' => $client->id,
        ]);
    }

    public function test_store_rejects_freelancer(): void
    {
        [, $token] = $this->makeFreelancer();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/briefs', [
                'title' => 'No autorizado',
                'description' => 'Descripcion suficientemente larga para pasar validacion',
                'category' => 'photo',
            ]);

        $response->assertStatus(403);
    }

    public function test_store_validates_required_fields(): void
    {
        [$client, $token] = $this->makeClient();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/briefs', [
                'title' => 'X',
                'description' => 'Corto',
                'category' => 'foo',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'description', 'category']);
    }

    public function test_update_edits_own_brief(): void
    {
        [$client, $token] = $this->makeClient();
        $brief = Brief::create([
            'client_id' => $client->id,
            'title' => 'Brief original',
            'description' => 'Descripcion suficientemente larga para pasar validacion',
            'category' => 'photo',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/briefs/{$brief->id}", [
                'title' => 'Brief editado',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Brief editado');
    }

    public function test_update_rejects_non_owner(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $other = User::factory()->create(['role' => 'client']);
        $brief = Brief::create([
            'client_id' => $owner->id,
            'title' => 'Brief A',
            'description' => 'Descripcion suficientemente larga para pasar',
            'category' => 'photo',
            'status' => 'published',
            'published_at' => now(),
        ]);
        $token = auth('api')->login($other);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/briefs/{$brief->id}", ['title' => 'Titulo hack']);

        $response->assertStatus(403);
    }

    public function test_destroy_deletes_own_brief(): void
    {
        [$client, $token] = $this->makeClient();
        $brief = Brief::create([
            'client_id' => $client->id,
            'title' => 'A borrar',
            'description' => 'Descripcion suficientemente larga para pasar validacion',
            'category' => 'photo',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/briefs/{$brief->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('briefs', ['id' => $brief->id]);
    }

    public function test_proposal_index_requires_brief_owner(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $other = User::factory()->create(['role' => 'client']);
        $brief = Brief::create([
            'client_id' => $client->id, 'title' => 'Brief', 'description' => 'X'.str_repeat('y', 30),
            'category' => 'photo', 'status' => 'published', 'published_at' => now(),
        ]);
        $token = auth('api')->login($other);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/briefs/{$brief->id}/proposals");

        $response->assertStatus(403);
    }

    public function test_proposal_store_creates_proposal_as_freelancer(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $brief = Brief::create([
            'client_id' => $client->id, 'title' => 'Brief', 'description' => 'X'.str_repeat('y', 30),
            'category' => 'photo', 'status' => 'published', 'published_at' => now(),
        ]);
        [, $token] = $this->makeFreelancer();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/proposals", [
                'message' => 'Propuesta detallada para el brief con suficiente texto',
                'price' => 450,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.price', 450)
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_proposal_store_rejects_client(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $brief = Brief::create([
            'client_id' => $client->id, 'title' => 'Brief', 'description' => 'X'.str_repeat('y', 30),
            'category' => 'photo', 'status' => 'published', 'published_at' => now(),
        ]);
        [, $token] = $this->makeClient();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/proposals", [
                'message' => 'Propuesta detallada para el brief con suficiente texto',
                'price' => 450,
            ]);

        $response->assertStatus(403);
    }

    public function test_proposal_store_prevents_duplicates(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $brief = Brief::create([
            'client_id' => $client->id, 'title' => 'Brief', 'description' => 'X'.str_repeat('y', 30),
            'category' => 'photo', 'status' => 'published', 'published_at' => now(),
        ]);
        [, $token] = $this->makeFreelancer();
        $payload = [
            'message' => 'Propuesta detallada para el brief con suficiente texto',
            'price' => 450,
        ];
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/proposals", $payload)
            ->assertStatus(201);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/proposals", $payload);

        $response->assertStatus(422);
    }

    public function test_proposal_store_rejects_closed_brief(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $brief = Brief::create([
            'client_id' => $client->id, 'title' => 'Closed', 'description' => 'X'.str_repeat('y', 30),
            'category' => 'photo', 'status' => 'cancelled',
        ]);
        [, $token] = $this->makeFreelancer();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/proposals", [
                'message' => 'Propuesta detallada para el brief con suficiente texto',
                'price' => 450,
            ]);

        $response->assertStatus(422);
    }

    public function test_proposal_store_validates_short_message(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $brief = Brief::create([
            'client_id' => $client->id, 'title' => 'Brief', 'description' => 'X'.str_repeat('y', 30),
            'category' => 'photo', 'status' => 'published', 'published_at' => now(),
        ]);
        [, $token] = $this->makeFreelancer();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/briefs/{$brief->id}/proposals", [
                'message' => 'Corto',
                'price' => 100,
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['message']);
    }
}
