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
        Schema::create('user_oauth_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('provider', 32);
            $table->string('provider_user_id', 191);
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->json('scopes')->nullable();
            $table->string('provider_email', 191)->nullable();
            $table->timestamp('linked_at')->useCurrent();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'provider_user_id'], 'user_oauth_identities_provider_unique');
            $table->index(['user_id', 'provider'], 'user_oauth_identities_user_provider_idx');
        });

        if (Schema::hasColumn('users', 'oauth_provider') && Schema::hasColumn('users', 'oauth_id')) {
            DB::table('users')
                ->whereNotNull('oauth_provider')
                ->whereNotNull('oauth_id')
                ->orderBy('id')
                ->chunkById(100, function ($rows) {
                    foreach ($rows as $row) {
                        DB::table('user_oauth_identities')->insertOrIgnore([
                            'user_id'          => $row->id,
                            'provider'         => $row->oauth_provider,
                            'provider_user_id' => $row->oauth_id,
                            'linked_at'        => now(),
                            'created_at'       => now(),
                            'updated_at'       => now(),
                        ]);
                    }
                });

            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique('users_oauth_provider_id_unique');
                $table->dropColumn(['oauth_provider', 'oauth_id']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'oauth_provider')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('oauth_provider', 32)->nullable()->after('avatar_url');
                $table->string('oauth_id', 191)->nullable()->after('oauth_provider');
                $table->unique(['oauth_provider', 'oauth_id'], 'users_oauth_provider_id_unique');
            });
        }

        Schema::dropIfExists('user_oauth_identities');
    }
};
