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
        Schema::table('student_evaluations', function (Blueprint $table) {
            // Add new rating fields from evaluation image
            $table->tinyInteger('supervisor')->nullable()->after('training_request_student_id');
            $table->tinyInteger('cooperation_with_staff')->nullable()->after('attendance');
            $table->tinyInteger('professionalism')->nullable();
            $table->tinyInteger('dealing_with_students')->nullable();
            $table->tinyInteger('manners')->nullable();
            $table->tinyInteger('participation_in_activities')->nullable();
            $table->tinyInteger('school')->nullable();
            $table->tinyInteger('comfort')->nullable();
            $table->tinyInteger('professional_ethics')->nullable();
            
            // Add general notes
            $table->text('general_notes')->nullable();
            
            // Drop old fields that are no longer needed
            $table->dropColumn([
                'punctuality',
                'commitment',
                'initiative',
                'cooperation',
                'communication',
                'professional_conduct',
                'knowledge_application',
                'skills_development',
                'overall_performance',
                'strengths',
                'weaknesses',
                'recommendations',
                'additional_notes',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_evaluations', function (Blueprint $table) {
            // Restore old fields
            $table->tinyInteger('punctuality')->nullable();
            $table->tinyInteger('commitment')->nullable();
            $table->tinyInteger('initiative')->nullable();
            $table->tinyInteger('cooperation')->nullable();
            $table->tinyInteger('communication')->nullable();
            $table->tinyInteger('professional_conduct')->nullable();
            $table->tinyInteger('knowledge_application')->nullable();
            $table->tinyInteger('skills_development')->nullable();
            $table->tinyInteger('overall_performance')->nullable();
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('recommendations')->nullable();
            $table->text('additional_notes')->nullable();
            
            // Drop new fields
            $table->dropColumn([
                'supervisor',
                'cooperation_with_staff',
                'professionalism',
                'dealing_with_students',
                'manners',
                'participation_in_activities',
                'school',
                'comfort',
                'professional_ethics',
                'general_notes',
            ]);
        });
    }
};
