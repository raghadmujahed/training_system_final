<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_assignments', function (Blueprint $table) {
            if (! Schema::hasColumn('training_assignments', 'academic_status')) {
                $table->enum('academic_status', [
                    'not_started',
                    'in_training',
                    'needs_follow_up',
                    'completed',
                    'late',
                    'withdrawn',
                ])->default('not_started')->after('status');
            }

            if (! Schema::hasColumn('training_assignments', 'academic_status_note')) {
                $table->text('academic_status_note')->nullable()->after('academic_status');
            }

            if (! Schema::hasColumn('training_assignments', 'academic_status_updated_by')) {
                $table->foreignId('academic_status_updated_by')
                    ->nullable()
                    ->after('academic_status_note')
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('training_assignments', 'academic_status_updated_at')) {
                $table->timestamp('academic_status_updated_at')->nullable()->after('academic_status_updated_by');
            }

            if (! $this->indexExists('training_assignments', 'ta_supervisor_academic_status_idx')) {
                $table->index(['academic_supervisor_id', 'academic_status'], 'ta_supervisor_academic_status_idx');
            }
        });

        DB::table('training_assignments')->update([
            'academic_status' => DB::raw("CASE status WHEN 'ongoing' THEN 'in_training' WHEN 'completed' THEN 'completed' ELSE 'not_started' END"),
            'academic_status_updated_at' => DB::raw('updated_at'),
        ]);

        if (! Schema::hasTable('academic_supervision_status_histories')) {
            Schema::create('academic_supervision_status_histories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_assignment_id');
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('academic_supervisor_id')->nullable();
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->text('note')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestamp('changed_at');
            $table->timestamps();

            $table->foreign('training_assignment_id', 'as_status_hist_assignment_fk')
                ->references('id')
                ->on('training_assignments')
                ->cascadeOnDelete();
            $table->foreign('student_id', 'as_status_hist_student_fk')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
            $table->foreign('academic_supervisor_id', 'as_status_hist_supervisor_fk')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->foreign('changed_by', 'as_status_hist_changed_by_fk')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->index(['training_assignment_id', 'changed_at'], 'academic_status_history_assignment_idx');
            $table->index(['student_id', 'academic_supervisor_id'], 'academic_status_history_student_supervisor_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_supervision_status_histories');

        Schema::table('training_assignments', function (Blueprint $table) {
            $table->dropIndex('ta_supervisor_academic_status_idx');
            $table->dropConstrainedForeignId('academic_status_updated_by');
            $table->dropColumn([
                'academic_status',
                'academic_status_note',
                'academic_status_updated_at',
            ]);
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn ($existing) => ($existing['name'] ?? null) === $index);
    }
};
