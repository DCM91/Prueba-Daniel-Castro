<?php

use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/test', function () {
    return response()->json([
        'message' => 'Hello from Laravel API!',
        'timestamp' => now()->toDateTimeString(),
    ]);
});

Route::get('/db-test', function () {
    try {
        $result = DB::connection()->getPdo();
        $database = DB::connection()->getDatabaseName();
        return response()->json([
            'status' => 'success',
            'message' => 'MySQL connected!',
            'database' => $database,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 500);
    }
});

Route::prefix('search')->group(function () {
    Route::post('/history', [SearchController::class, 'saveHistory'])->name('search.history.save');
    Route::get('/history', [SearchController::class, 'history'])->name('search.history');
    Route::delete('/history/{id}', [SearchController::class, 'deleteHistory'])->name('search.history.delete');
});
