<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('evaluation_scores') || !Schema::hasColumn('evaluation_scores', 'score')) {
            return;
        }

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys=OFF;');

            Schema::create('evaluation_scores_tmp', function (Blueprint $table) {
                $table->id();
                $table->foreignId('evaluation_id')
                    ->constrained()
                    ->onDelete('cascade');
                $table->foreignId('item_id')
                    ->constrained('evaluation_items')
                    ->onDelete('cascade');
                $table->decimal('score', 5, 2)->nullable();
                $table->text('response_text')->nullable();
                $table->string('file_path')->nullable();
                $table->timestamps();
                $table->unique(['evaluation_id', 'item_id']);
            });

            DB::statement('
                INSERT INTO evaluation_scores_tmp (id, evaluation_id, item_id, score, response_text, file_path, created_at, updated_at)
                SELECT id, evaluation_id, item_id, score, response_text, file_path, created_at, updated_at
                FROM evaluation_scores
            ');

            Schema::drop('evaluation_scores');
            Schema::rename('evaluation_scores_tmp', 'evaluation_scores');

            DB::statement('PRAGMA foreign_keys=ON;');
            return;
        }

        // MySQL / MariaDB
        DB::statement('ALTER TABLE evaluation_scores MODIFY score DECIMAL(5,2) NULL');
    }

    public function down(): void
    {
        if (!Schema::hasTable('evaluation_scores') || !Schema::hasColumn('evaluation_scores', 'score')) {
            return;
        }

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys=OFF;');

            Schema::create('evaluation_scores_tmp', function (Blueprint $table) {
                $table->id();
                $table->foreignId('evaluation_id')
                    ->constrained()
                    ->onDelete('cascade');
                $table->foreignId('item_id')
                    ->constrained('evaluation_items')
                    ->onDelete('cascade');
                $table->decimal('score', 5, 2);
                $table->text('response_text')->nullable();
                $table->string('file_path')->nullable();
                $table->timestamps();
                $table->unique(['evaluation_id', 'item_id']);
            });

            DB::statement('
                INSERT INTO evaluation_scores_tmp (id, evaluation_id, item_id, score, response_text, file_path, created_at, updated_at)
                SELECT id, evaluation_id, item_id, COALESCE(score, 0), response_text, file_path, created_at, updated_at
                FROM evaluation_scores
            ');

            Schema::drop('evaluation_scores');
            Schema::rename('evaluation_scores_tmp', 'evaluation_scores');

            DB::statement('PRAGMA foreign_keys=ON;');
            return;
        }

        // MySQL / MariaDB
        DB::statement('UPDATE evaluation_scores SET score = 0 WHERE score IS NULL');
        DB::statement('ALTER TABLE evaluation_scores MODIFY score DECIMAL(5,2) NOT NULL');
    }
};
