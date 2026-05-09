<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_templates', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('title_ar');
            $table->string('title_en')->nullable();
            $table->text('description')->nullable();
            $table->string('form_type')->default('general');
            $table->string('owner_type');
            $table->string('primary_actor_role')->nullable();
            $table->json('visible_to_roles')->nullable();
            $table->json('review_chain')->nullable();
            $table->json('department_scope')->nullable();
            $table->json('training_track_scope')->nullable();
            $table->json('site_type_scope')->nullable();
            $table->json('course_scope')->nullable();
            $table->string('frequency_type')->default('custom');
            $table->string('due_rule_type')->default('no_due_date');
            $table->integer('due_offset')->nullable();
            $table->json('custom_due_config')->nullable();
            $table->boolean('requires_signature')->default(false);
            $table->json('signature_roles')->nullable();
            $table->boolean('requires_review')->default(false);
            $table->json('review_roles')->nullable();
            $table->boolean('can_be_returned')->default(true);
            $table->boolean('lock_after_submit')->default(false);
            $table->boolean('lock_after_approval')->default(true);
            $table->boolean('mandatory')->default(false);
            $table->boolean('contributes_to_portfolio')->default(false);
            $table->boolean('contributes_to_evaluation')->default(false);
            $table->decimal('grading_weight_optional', 6, 2)->nullable();
            $table->boolean('supports_attachments')->default(false);
            $table->json('allowed_file_types')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_archived')->default(false);
            $table->integer('version')->default(1);
            $table->json('schema_json')->nullable();
            $table->json('ui_config_json')->nullable();
            $table->json('workflow_config_json')->nullable();
            $table->timestamps();

            $table->index(['owner_type', 'is_active']);
            $table->index(['form_type', 'is_active']);
            $table->index(['is_archived', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_templates');
    }
};
