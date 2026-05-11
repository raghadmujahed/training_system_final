<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add training_period_id to tables that need period-based archiving.
     * This allows proper separation between periods and prevents duplicate conflicts.
     */
    public function up(): void
    {
        // Sections - add training_period_id and update unique constraint
        if (Schema::hasTable('sections')) {
            Schema::table('sections', function (Blueprint $table) {
                if (!Schema::hasColumn('sections', 'training_period_id')) {
                    $table->foreignId('training_period_id')->nullable()->after('course_id')
                        ->constrained('training_periods')->nullOnDelete();
                }
            });

            // Update unique constraint to include training_period_id
            // First check if the old unique index exists and drop it
            try {
                Schema::table('sections', function (Blueprint $table) {
                    // Drop old unique index if exists (by name pattern)
                    $table->dropUnique('sections_name_course_id_academic_year_semester_unique');
                });
            } catch (\Exception $e) {
                // Index might not exist, continue
            }

            // Add new unique constraint scoped by training_period_id
            // This allows same section name in different periods
            Schema::table('sections', function (Blueprint $table) {
                // Unique within a training period: name + course + period
                $table->unique(['name', 'course_id', 'training_period_id'], 'sections_unique_in_period')
                    ->whereNotNull('training_period_id')
                    ->whereNull('archived_at');
            });
        }

        // Enrollments - add training_period_id and update unique constraint
        if (Schema::hasTable('enrollments')) {
            Schema::table('enrollments', function (Blueprint $table) {
                if (!Schema::hasColumn('enrollments', 'training_period_id')) {
                    $table->foreignId('training_period_id')->nullable()->after('section_id')
                        ->constrained('training_periods')->nullOnDelete();
                }
            });

            // Drop old unique constraint and add new one scoped by period
            try {
                Schema::table('enrollments', function (Blueprint $table) {
                    $table->dropUnique('enrollments_user_id_section_id_academic_year_semester_unique');
                });
            } catch (\Exception $e) {
                // Index might not exist, continue
            }

            Schema::table('enrollments', function (Blueprint $table) {
                // Unique within a training period: user + section + period
                $table->unique(['user_id', 'section_id', 'training_period_id'], 'enrollments_unique_in_period')
                    ->whereNotNull('training_period_id')
                    ->whereNull('archived_at');
            });
        }

        // Section students (pivot) - add training_period_id
        if (Schema::hasTable('section_students')) {
            Schema::table('section_students', function (Blueprint $table) {
                if (!Schema::hasColumn('section_students', 'training_period_id')) {
                    $table->foreignId('training_period_id')->nullable()->after('student_id')
                        ->constrained('training_periods')->nullOnDelete();
                }
            });

            // Drop old unique and add new scoped by period
            try {
                Schema::table('section_students', function (Blueprint $table) {
                    $table->dropUnique('section_students_section_id_student_id_unique');
                });
            } catch (\Exception $e) {
                // Index might not exist, continue
            }

            Schema::table('section_students', function (Blueprint $table) {
                $table->unique(['section_id', 'student_id', 'training_period_id'], 'section_students_unique_in_period')
                    ->whereNotNull('training_period_id')
                    ->whereNull('archived_at');
            });
        }

        // Student portfolios - add training_period_id
        if (Schema::hasTable('student_portfolios')) {
            Schema::table('student_portfolios', function (Blueprint $table) {
                if (!Schema::hasColumn('student_portfolios', 'training_period_id')) {
                    $table->foreignId('training_period_id')->nullable()->after('user_id')
                        ->constrained('training_periods')->nullOnDelete();
                }
            });

            // Allow multiple portfolios per user (one per period)
            Schema::table('student_portfolios', function (Blueprint $table) {
                if (!Schema::hasIndex('student_portfolios', 'student_portfolios_user_training_period_unique')) {
                    $table->unique(['user_id', 'training_period_id'], 'student_portfolios_user_training_period_unique')
                        ->whereNotNull('training_period_id')
                        ->whereNull('archived_at');
                }
            });
        }

        // Training assignments - already has training_period_id, ensure index
        if (Schema::hasTable('training_assignments')) {
            Schema::table('training_assignments', function (Blueprint $table) {
                if (!Schema::hasIndex('training_assignments', 'ta_period_enrollment_idx')) {
                    $table->index(['training_period_id', 'enrollment_id'], 'ta_period_enrollment_idx');
                }
            });
        }
    }

    public function down(): void
    {
        // Revert sections
        if (Schema::hasTable('sections')) {
            try {
                Schema::table('sections', function (Blueprint $table) {
                    $table->dropUnique('sections_unique_in_period');
                });
            } catch (\Exception $e) {}

            if (Schema::hasColumn('sections', 'training_period_id')) {
                Schema::table('sections', function (Blueprint $table) {
                    $table->dropForeign(['training_period_id']);
                    $table->dropColumn('training_period_id');
                });
            }
        }

        // Revert enrollments
        if (Schema::hasTable('enrollments')) {
            try {
                Schema::table('enrollments', function (Blueprint $table) {
                    $table->dropUnique('enrollments_unique_in_period');
                });
            } catch (\Exception $e) {}

            if (Schema::hasColumn('enrollments', 'training_period_id')) {
                Schema::table('enrollments', function (Blueprint $table) {
                    $table->dropForeign(['training_period_id']);
                    $table->dropColumn('training_period_id');
                });
            }
        }

        // Revert section_students
        if (Schema::hasTable('section_students')) {
            try {
                Schema::table('section_students', function (Blueprint $table) {
                    $table->dropUnique('section_students_unique_in_period');
                });
            } catch (\Exception $e) {}

            if (Schema::hasColumn('section_students', 'training_period_id')) {
                Schema::table('section_students', function (Blueprint $table) {
                    $table->dropForeign(['training_period_id']);
                    $table->dropColumn('training_period_id');
                });
            }
        }

        // Revert student_portfolios
        if (Schema::hasTable('student_portfolios')) {
            try {
                Schema::table('student_portfolios', function (Blueprint $table) {
                    $table->dropUnique('student_portfolios_user_training_period_unique');
                });
            } catch (\Exception $e) {}

            if (Schema::hasColumn('student_portfolios', 'training_period_id')) {
                Schema::table('student_portfolios', function (Blueprint $table) {
                    $table->dropForeign(['training_period_id']);
                    $table->dropColumn('training_period_id');
                });
            }
        }
    }
};
