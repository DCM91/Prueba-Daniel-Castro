<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\SearchHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HistoryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * GET /api/search/history returns empty array when no records exist.
     */
    public function test_can_get_empty_history(): void
    {
        $response = $this->getJson('/api/search/history');

        $response->assertStatus(200)
            ->assertJson(['success' => true, 'data' => []]);
    }

    /**
     * GET /api/search/history returns records when they exist.
     */
    public function test_can_get_history_with_records(): void
    {
        SearchHistory::create([
            'term' => 'laravel',
            'results_count' => 42,
        ]);
        SearchHistory::create([
            'term' => 'angular',
            'results_count' => 30,
        ]);

        $response = $this->getJson('/api/search/history');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'term', 'results_count', 'created_at']],
            ]);
    }

    /**
     * History is ordered by most recent first.
     */
    public function test_history_is_ordered_by_most_recent_first(): void
    {
        SearchHistory::create([
            'term' => 'oldest',
            'results_count' => 1,
            'created_at' => now()->subHour(),
        ]);
        SearchHistory::create([
            'term' => 'newest',
            'results_count' => 5,
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/search/history');

        $data = $response->json('data');
        $this->assertEquals('newest', $data[0]['term']);
        $this->assertEquals('oldest', $data[1]['term']);
    }

    /**
     * DELETE /api/search/history/{id} removes a record.
     */
    public function test_can_delete_history_item(): void
    {
        $item = SearchHistory::create([
            'term' => 'to delete',
            'results_count' => 10,
        ]);

        $response = $this->deleteJson("/api/search/history/{$item->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true, 'message' => 'History item deleted']);

        $this->assertDatabaseMissing('search_histories', ['id' => $item->id]);
    }

    /**
     * DELETE a non-existent history item returns 404.
     */
    public function test_delete_nonexistent_history_returns_404(): void
    {
        $response = $this->deleteJson('/api/search/history/99999');

        $response->assertStatus(404)
            ->assertJson(['success' => false, 'error' => 'History item not found']);
    }
}
