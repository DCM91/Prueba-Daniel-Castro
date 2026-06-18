<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        foreach (DB::table('freelancer_profiles')->whereNotNull('city')->where('city', '!=', '')->cursor() as $row) {
            $user = DB::table('users')->where('id', $row->user_id)->first();
            if ($user === null) {
                continue;
            }
            if ($user->city === null || trim((string) $user->city) === '') {
                DB::table('users')->where('id', $row->user_id)->update([
                    'city' => $row->city,
                ]);
            }
        }

        if ($driver === 'mysql') {
            Schema::table('freelancer_profiles', function ($table) {
                $table->dropIndex('freelancer_profiles_city_index');
                $table->dropColumn('city');
            });
        } else {
            DB::statement('DROP INDEX IF EXISTS freelancer_profiles_city_index');
            DB::statement('ALTER TABLE freelancer_profiles DROP COLUMN city');
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            Schema::table('freelancer_profiles', function ($table) {
                $table->string('city', 80)->nullable()->after('bio');
                $table->index('city', 'freelancer_profiles_city_index');
            });
        } else {
            DB::statement('ALTER TABLE freelancer_profiles ADD COLUMN city VARCHAR(80) NULL AFTER bio');
            DB::statement('CREATE INDEX IF NOT EXISTS freelancer_profiles_city_index ON freelancer_profiles (city)');
        }

        foreach (DB::table('users')->whereNotNull('city')->where('city', '!=', '')->cursor() as $user) {
            $profile = DB::table('freelancer_profiles')->where('user_id', $user->id)->first();
            if ($profile === null) {
                continue;
            }
            if ($profile->city === null || trim((string) $profile->city) === '') {
                DB::table('freelancer_profiles')->where('user_id', $user->id)->update([
                    'city' => $user->city,
                ]);
            }
        }
    }
};
