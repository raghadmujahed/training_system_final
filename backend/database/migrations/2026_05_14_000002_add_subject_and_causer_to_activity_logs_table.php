<?php

use App\Models\ActivityLog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('activity_logs', 'subject_type')) {
                $table->string('subject_type')->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('activity_logs', 'subject_id')) {
                $table->unsignedBigInteger('subject_id')->nullable()->after('subject_type');
            }
            if (! Schema::hasColumn('activity_logs', 'causer_id')) {
                $table->foreignId('causer_id')->nullable()->after('subject_id')->constrained('users')->nullOnDelete();
            }
        });

        if (Schema::hasColumn('activity_logs', 'subject_type')
            && Schema::hasColumn('activity_logs', 'subject_id')
            && ! Schema::hasIndex('activity_logs', 'activity_logs_subject_index')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                $table->index(['subject_type', 'subject_id'], 'activity_logs_subject_index');
            });
        }

        if (Schema::hasColumn('activity_logs', 'causer_id')) {
            DB::table('activity_logs')
                ->whereNull('causer_id')
                ->update(['causer_id' => DB::raw('user_id')]);
        }

        if (Schema::hasColumn('activity_logs', 'subject_type')) {
            ActivityLog::query()
                ->whereNull('subject_type')
                ->whereNotNull('action')
                ->orderBy('id')
                ->chunkById(200, function ($logs): void {
                    foreach ($logs as $log) {
                        $parts = explode('.', (string) $log->action, 2);
                        $type = $parts[0] ?? null;
                        if ($type === null || $type === '') {
                            continue;
                        }
                        $new = $log->new_data;
                        $old = $log->old_data;
                        $subjectId = null;
                        if (is_array($new) && isset($new['id'])) {
                            $subjectId = $new['id'];
                        } elseif (is_array($old) && isset($old['id'])) {
                            $subjectId = $old['id'];
                        }
                        $log->forceFill([
                            'subject_type' => $type,
                            'subject_id' => is_numeric($subjectId) ? (int) $subjectId : null,
                        ])->saveQuietly();
                    }
                });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('activity_logs', 'activity_logs_subject_index')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                $table->dropIndex('activity_logs_subject_index');
            });
        }

        Schema::table('activity_logs', function (Blueprint $table) {
            if (Schema::hasColumn('activity_logs', 'causer_id')) {
                $table->dropForeign(['causer_id']);
            }
            if (Schema::hasColumn('activity_logs', 'causer_id')) {
                $table->dropColumn('causer_id');
            }
            if (Schema::hasColumn('activity_logs', 'subject_id')) {
                $table->dropColumn('subject_id');
            }
            if (Schema::hasColumn('activity_logs', 'subject_type')) {
                $table->dropColumn('subject_type');
            }
        });
    }
};
