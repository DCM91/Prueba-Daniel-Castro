<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
            $table->string('avatar_url', 500)->nullable()->after('password');
            $table->string('oauth_provider', 32)->nullable()->after('avatar_url');
            $table->string('oauth_id', 191)->nullable()->after('oauth_provider');
            $table->unique(['oauth_provider', 'oauth_id'], 'users_oauth_provider_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_oauth_provider_id_unique');
            $table->dropColumn(['avatar_url', 'oauth_provider', 'oauth_id']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable(false)->change();
        });
    }
};
