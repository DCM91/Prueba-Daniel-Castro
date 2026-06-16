<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brief_id')
                ->constrained('briefs')
                ->cascadeOnDelete();
            $table->foreignId('freelancer_id')
                ->constrained('freelancer_profiles')
                ->cascadeOnDelete();
            $table->text('message');
            $table->decimal('price', 10, 2);
            $table->string('status', 32)->default('pending');
            $table->timestamps();

            $table->unique(['brief_id', 'freelancer_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposals');
    }
};
