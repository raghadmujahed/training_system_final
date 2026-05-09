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
       Schema::create('evaluation_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('template_id')
    ->constrained('evaluation_templates')
    ->cascadeOnDelete();    
    $table->string('title');
    $table->enum('field_type', [
                'score',          // درجة رقمية (للتقييمات)
                'text',           // نص قصير
                'textarea',       // نص طويل
                'radio',          // اختيار واحد
                'checkbox',       // اختيار متعدد
                'date',           // تاريخ
                'file'            // رفع ملف
            ])->default('score');
            
            $table->json('options')->nullable(); // لتخزين خيارات radio/checkbox
            $table->boolean('is_required')->default(true);
    $table->integer('max_score')->default(10);

    $table->index('template_id');

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_items');
    }
};
