<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('freelancer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('public_id', 191)->unique();
            $table->string('url', 500);
            $table->unsignedSmallInteger('width')->nullable();
            $table->unsignedSmallInteger('height')->nullable();
            $table->string('format', 16)->nullable();
            $table->unsignedInteger('bytes')->nullable();
            $table->string('title', 120)->nullable();
            $table->string('description', 500)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['freelancer_profile_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolios');
    }
};
