<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
     public function up(): void
    {
        Schema::create('portfolio_entries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_portfolio_id')
                ->constrained('student_portfolios')
                ->onDelete('cascade');

            $table->string('title');
            $table->text('content')->nullable();
            $table->string('file_path')->nullable();
            $table->unique(['student_portfolio_id', 'title']);
            $table->timestamps();
        });

        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('portfolio_entries');
    }
};
