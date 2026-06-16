<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\FreelancerProfile;
use Illuminate\Console\Command;

final class CleanupOrphanProfiles extends Command
{
    protected $signature = 'framematch:cleanup-orphan-profiles {--force : Run without confirmation prompt}';

    protected $description = 'Elimina FreelancerProfile cuyo user_id no apunta a ningún usuario (huérfanos).';

    public function handle(): int
    {
        $orphans = FreelancerProfile::query()
            ->whereDoesntHave('user')
            ->get(['id', 'user_id', 'display_name', 'created_at']);

        if ($orphans->isEmpty()) {
            $this->info('No hay perfiles huérfanos. Base de datos limpia.');
            return self::SUCCESS;
        }

        $this->warn("Se encontraron {$orphans->count()} perfiles huérfanos:");
        $this->table(
            ['id', 'user_id', 'display_name', 'created_at'],
            $orphans->map(fn ($p) => [
                $p->id,
                $p->user_id ?? 'NULL',
                $p->display_name ?? '—',
                $p->created_at?->toDateTimeString() ?? '—',
            ])->all()
        );

        if (! $this->option('force') && ! $this->confirm('¿Eliminarlos?', false)) {
            $this->info('Operación cancelada.');
            return self::SUCCESS;
        }

        $deleted = FreelancerProfile::query()
            ->whereDoesntHave('user')
            ->delete();

        $this->info("Eliminados: {$deleted}.");

        return self::SUCCESS;
    }
}
