<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * This migration adds missing indexes for better query performance.
     * Safe for production - only adds indexes, doesn't modify or drop existing data.
     */
    public function up(): void
    {
        // Helper function to check if index exists
        $indexExists = function ($tableName, $indexName) {
            $connection = Schema::getConnection();
            $database = $connection->getDatabaseName();
            $result = $connection->select(
                "SELECT COUNT(*) as count FROM information_schema.statistics 
                 WHERE table_schema = ? AND table_name = ? AND index_name = ?",
                [$database, $tableName, $indexName]
            );
            return $result[0]->count > 0;
        };

        // Add composite index on student_portfolios [user_id, training_assignment_id]
        if (Schema::hasTable('student_portfolios')) {
            if (!$indexExists('student_portfolios', 'student_portfolios_user_id_training_assignment_id_index')) {
                Schema::table('student_portfolios', function (Blueprint $table) {
                    $table->index(['user_id', 'training_assignment_id']);
                });
            }
        }

        // Add index on notes.created_at
        if (Schema::hasTable('notes')) {
            if (!$indexExists('notes', 'notes_created_at_index')) {
                Schema::table('notes', function (Blueprint $table) {
                    $table->index('created_at');
                });
            }
        }

        // Add composite index on notes [training_assignment_id, user_id]
        if (Schema::hasTable('notes')) {
            if (!$indexExists('notes', 'notes_training_assignment_id_user_id_index')) {
                Schema::table('notes', function (Blueprint $table) {
                    $table->index(['training_assignment_id', 'user_id']);
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove composite index from student_portfolios
        if (Schema::hasTable('student_portfolios')) {
            Schema::table('student_portfolios', function (Blueprint $table) {
                $table->dropIndex(['user_id', 'training_assignment_id']);
            });
        }

        // Remove index from notes.created_at
        if (Schema::hasTable('notes')) {
            Schema::table('notes', function (Blueprint $table) {
                $table->dropIndex('created_at');
            });
        }

        // Remove composite index from notes
        if (Schema::hasTable('notes')) {
            Schema::table('notes', function (Blueprint $table) {
                $table->dropIndex(['training_assignment_id', 'user_id']);
            });
        }
    }
};
