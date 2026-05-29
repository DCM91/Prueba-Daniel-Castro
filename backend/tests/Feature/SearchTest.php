<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\SearchHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_save_history_validates_empty_term(): void
    {
        $response = $this->postJson('/api/search/history', [
            'term' => '',
            'results_count' => 0,
        ]);

        $response->assertStatus(400)
            ->assertJson(['success' => false])
            ->assertJsonPath('error', 'Search term is required');
    }

    public function test_save_history_validates_whitespace_term(): void
    {
        $response = $this->postJson('/api/search/history', [
            'term' => '   ',
            'results_count' => 0,
        ]);

        $response->assertStatus(400)
            ->assertJson(['success' => false])
            ->assertJsonPath('error', 'Search term is required');
    }

    public function test_save_history_validates_term_length(): void
    {
        $response = $this->postJson('/api/search/history', [
            'term' => str_repeat('x', 256),
            'results_count' => 0,
        ]);

        $response->assertStatus(400)
            ->assertJson(['success' => false])
            ->assertJsonPath('error', 'Search term must be less than 255 characters');
    }

    public function test_can_save_history(): void
    {
        $response = $this->postJson('/api/search/history', [
            'term' => 'laravel',
            'results_count' => 42,
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('search_histories', [
            'term' => 'laravel',
            'results_count' => 42,
        ]);
    }

    public function test_save_history_trims_term(): void
    {
        $response = $this->postJson('/api/search/history', [
            'term' => '  angular  ',
            'results_count' => 10,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('search_histories', [
            'term' => 'angular',
        ]);
    }
}
