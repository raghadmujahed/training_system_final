<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite: recreate table without the unique constraint
            Schema::create('portfolio_entries_new', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_portfolio_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->string('code')->nullable();
                $table->string('category')->nullable();
                $table->text('content')->nullable();
                $table->string('file_path')->nullable();
                $table->string('review_status')->nullable();
                $table->text('reviewer_note')->nullable();
                $table->unsignedBigInteger('reviewed_by')->nullable();
                $table->datetime('reviewed_at')->nullable();
                $table->datetime('archived_at')->nullable()->index();
                $table->string('archived_period')->nullable();
                $table->integer('academic_rating')->nullable();
                $table->timestamps();
            });

            DB::statement('INSERT INTO portfolio_entries_new SELECT * FROM portfolio_entries');
            Schema::drop('portfolio_entries');
            DB::statement('ALTER TABLE portfolio_entries_new RENAME TO portfolio_entries');
        } else {
            // MySQL: Check if constraints exist before dropping them
            $connection = Schema::getConnection();
            $tableName = 'portfolio_entries';
            
            // Get all foreign keys and unique indexes for this table
            $foreignKeys = $connection->select("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL", [$tableName]);
            $indexes = $connection->select("SHOW INDEX FROM {$tableName} WHERE Non_unique = 0 AND Key_name != 'PRIMARY'");
            
            Schema::table($tableName, function (Blueprint $table) use ($foreignKeys, $indexes) {
                // Drop foreign key if it exists
                foreach ($foreignKeys as $fk) {
                    if ($fk->CONSTRAINT_NAME === 'portfolio_entries_student_portfolio_id_foreign') {
                        $table->dropForeign(['student_portfolio_id']);
                        break;
                    }
                }
                
                // Drop unique index if it exists
                foreach ($indexes as $index) {
                    if ($index->Key_name === 'portfolio_entries_student_portfolio_id_title_unique') {
                        $table->dropUnique('portfolio_entries_student_portfolio_id_title_unique');
                        break;
                    }
                }
                
                // Re-add the foreign key constraint (column already exists)
                $table->foreign('student_portfolio_id')->references('id')->on('student_portfolios')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::table('portfolio_entries', function (Blueprint $table) {
            $table->unique(['student_portfolio_id', 'title']);
        });
    }
};
