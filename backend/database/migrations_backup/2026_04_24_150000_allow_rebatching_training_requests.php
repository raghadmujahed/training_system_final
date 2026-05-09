<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('training_request_batch_items')) {
            return;
        }

        if (DB::getDriverName() === 'sqlite') {
            Schema::create('training_request_batch_items_new', function (Blueprint $table) {
                $table->id();
                $table->foreignId('batch_id')->constrained('training_request_batches')->cascadeOnDelete();
                $table->foreignId('training_request_id')->constrained('training_requests')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['batch_id', 'training_request_id']);
                $table->index('training_request_id');
            });

            DB::table('training_request_batch_items')->orderBy('id')->get()->each(function ($row) {
                DB::table('training_request_batch_items_new')->insert([
                    'id' => $row->id,
                    'batch_id' => $row->batch_id,
                    'training_request_id' => $row->training_request_id,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);
            });

            Schema::drop('training_request_batch_items');
            Schema::rename('training_request_batch_items_new', 'training_request_batch_items');

            return;
        }

        Schema::table('training_request_batch_items', function (Blueprint $table) {
            // Drop the foreign key constraint first
            $table->dropForeign(['batch_id']);
            // Then drop the composite unique index
            $table->dropUnique(['batch_id', 'training_request_id']);
            // Add back the foreign key constraint
            $table->foreign('batch_id')->references('id')->on('training_request_batches')->onDelete('cascade');
            // The training_request_id index already exists from the previous migration
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('training_request_batch_items')) {
            return;
        }

        if (DB::getDriverName() === 'sqlite') {
            Schema::create('training_request_batch_items_old', function (Blueprint $table) {
                $table->id();
                $table->foreignId('batch_id')->constrained('training_request_batches')->cascadeOnDelete();
                $table->foreignId('training_request_id')->constrained('training_requests')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['batch_id', 'training_request_id']);
                $table->unique(['training_request_id']);
            });

            DB::table('training_request_batch_items')->orderBy('id')->get()->each(function ($row) {
                DB::table('training_request_batch_items_old')->insert([
                    'id' => $row->id,
                    'batch_id' => $row->batch_id,
                    'training_request_id' => $row->training_request_id,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);
            });

            Schema::drop('training_request_batch_items');
            Schema::rename('training_request_batch_items_old', 'training_request_batch_items');

            return;
        }

        Schema::table('training_request_batch_items', function (Blueprint $table) {
            $table->dropIndex(['training_request_id']);
            $table->unique(['training_request_id']);
        });
    }
};
