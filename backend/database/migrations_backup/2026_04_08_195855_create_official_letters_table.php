<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('official_letters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_request_id')->constrained()->onDelete('cascade');
            $table->string('letter_number')->unique();
            $table->date('letter_date');
            $table->enum('type', ['to_directorate', 'to_school']);
            $table->text('content');
            $table->string('file_path')->nullable(); // PDF
            $table->foreignId('sent_by')->constrained('users');
            $table->timestamp('sent_at');
            $table->foreignId('received_by')->nullable()->constrained('users');
            $table->timestamp('received_at')->nullable();
             $table->enum('status', [
                'draft',
                'sent_to_directorate',
                'directorate_approved',
                'sent_to_school',
                'school_received',
                'completed',
                'rejected'
            ])->default('draft');
            
            $table->unsignedBigInteger('training_site_id')->nullable();
            $table->text('rejection_reason')->nullable();
            
            $table->foreign('training_site_id')
                  ->references('id')
                  ->on('training_sites')
                  ->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('official_letters');
    }
};