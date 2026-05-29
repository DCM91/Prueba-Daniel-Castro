<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\SearchHistory;
use PHPUnit\Framework\TestCase;

class SearchHistoryModelTest extends TestCase
{
    /**
     * The table has no updated_at column — Eloquent must not try to write it.
     */
    public function test_updated_at_is_null(): void
    {
        $this->assertNull(SearchHistory::UPDATED_AT);
    }

    /**
     * Only term and results_count are mass-assignable.
     */
    public function test_fillable_contains_only_term_and_results_count(): void
    {
        $model = new SearchHistory();

        $fillable = $model->getFillable();

        $this->assertContains('term', $fillable);
        $this->assertContains('results_count', $fillable);
        $this->assertCount(2, $fillable);
    }

    /**
     * created_at is cast to datetime.
     */
    public function test_created_at_is_cast_to_datetime(): void
    {
        $model = new SearchHistory();

        $casts = $model->getCasts();

        $this->assertArrayHasKey('created_at', $casts);
        $this->assertSame('datetime', $casts['created_at']);
    }

    /**
     * results_count is cast to integer.
     */
    public function test_results_count_is_cast_to_integer(): void
    {
        $model = new SearchHistory();

        $casts = $model->getCasts();

        $this->assertArrayHasKey('results_count', $casts);
        $this->assertSame('integer', $casts['results_count']);
    }
}
