<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brief_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brief_id')->constrained('briefs')->cascadeOnDelete();
            $table->string('public_id', 191)->unique();
            $table->string('url', 500);
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('format', 16)->nullable();
            $table->unsignedInteger('bytes')->nullable();
            $table->string('title', 191)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['brief_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brief_attachments');
    }
};
