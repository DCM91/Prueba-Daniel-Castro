<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE skills MODIFY category ENUM('photo','video','edit','content') NOT NULL");
            return;
        }

        // SQLite: $table->enum() in the original migration created a CHECK constraint
        // that we cannot ALTER. Drop the index, drop the column, re-add the column
        // as a plain string (the FormRequest enforces the allowed values at the
        // application layer), and re-add the index.
        Schema::table('skills', function (Blueprint $table) {
            $table->dropIndex('skills_category_index');
        });
        Schema::table('skills', function (Blueprint $table) {
            $table->dropColumn('category');
        });
        Schema::table('skills', function (Blueprint $table) {
            $table->string('category', 32)->index('skills_category_index');
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE skills SET category = 'edit' WHERE category = 'content'");
            DB::statement("ALTER TABLE skills MODIFY category ENUM('photo','video','edit') NOT NULL");
            return;
        }

        Schema::table('skills', function (Blueprint $table) {
            $table->dropIndex('skills_category_index');
        });
        Schema::table('skills', function (Blueprint $table) {
            $table->dropColumn('category');
        });
        Schema::table('skills', function (Blueprint $table) {
            $table->enum('category', ['photo', 'video', 'edit'])->index('skills_category_index');
        });
    }
};
