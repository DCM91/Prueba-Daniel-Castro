<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('freelancer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name')->nullable();
            $table->text('bio')->nullable();
            $table->string('city', 80)->nullable();
            $table->decimal('hourly_rate', 8, 2)->nullable();
            $table->decimal('price_per_project', 10, 2)->nullable();
            $table->boolean('is_available')->default(true);
            $table->timestamps();

            $table->index('city');
            $table->index('is_available');
            $table->index('hourly_rate');
            $table->index('price_per_project');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('freelancer_profiles');
    }
};
