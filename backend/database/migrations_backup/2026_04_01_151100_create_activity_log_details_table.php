<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('activity_log_details', function (Blueprint $table) {
            $table->id();

            $table->foreignId('activity_log_id')
                ->constrained('activity_logs')
                ->cascadeOnDelete();

            $table->string('field');

            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();

            $table->index('activity_log_id');


            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_log_details');
    }
};