<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\FieldEvaluation;
use App\Models\FieldEvaluationTemplate;
use App\Models\FormInstance;
use App\Models\FormTemplate;
use App\Models\Role;
use App\Models\Section;
use App\Models\TrainingAssignment;
use App\Models\TrainingPeriod;
use App\Models\TrainingRequest;
use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FieldSupervisorEvaluationAndFormsTest extends TestCase
{
    use RefreshDatabase;

    public function test_field_evaluation_draft_then_submit_and_lock_after_final(): void
    {
        $ctx = $this->createFieldSupervisorContext();
        $template = FieldEvaluationTemplate::create([
            'name' => 'Mentor Evaluation Template',
            'code' => 'mentor_evaluation_v1',
            'applies_to' => 'mentor_teacher',
            'criteria' => [
                ['id' => 'commitment', 'label' => 'Commitment', 'weight' => 50, 'scale' => [1, 2, 3, 4, 5]],
                ['id' => 'skills', 'label' => 'Skills', 'weight' => 50, 'scale' => [1, 2, 3, 4, 5]],
            ],
            'total_score' => 100,
            'score_ranges' => [
                'excellent' => ['min' => 90, 'label' => 'Excellent'],
                'very_good' => ['min' => 80, 'label' => 'Very Good'],
                'good' => ['min' => 70, 'label' => 'Good'],
                'pass' => ['min' => 60, 'label' => 'Pass'],
            ],
            'allow_draft' => true,
            'is_active' => true,
        ]);

        Sanctum::actingAs($ctx['supervisor']);
        $draft = $this->postJson('/api/field-supervisor/students/' . $ctx['student']->id . '/evaluation-draft', [
            'template_id' => $template->id,
            'scores' => [
                'commitment' => 5,
                'skills' => 4,
            ],
            'general_notes' => 'Good draft.',
            'strengths' => 'Strong communication',
            'areas_for_improvement' => 'Needs more planning',
            'supervisor_name' => 'Field Supervisor',
            'evaluation_date' => now()->toDateString(),
        ]);
        $draft->assertOk();
        $draft->assertJsonPath('evaluation.status', FieldEvaluation::STATUS_DRAFT);

        $submit = $this->postJson('/api/field-supervisor/students/' . $ctx['student']->id . '/evaluation-submit', [
            'template_id' => $template->id,
            'scores' => [
                'commitment' => 5,
                'skills' => 5,
            ],
            'general_notes' => 'Final submission.',
            'strengths' => 'Reliable',
            'areas_for_improvement' => 'None',
            'supervisor_name' => 'Field Supervisor',
            'evaluation_date' => now()->toDateString(),
        ]);
        $submit->assertOk();

        $evaluation = FieldEvaluation::where('student_id', $ctx['student']->id)->firstOrFail();
        $this->assertTrue((bool) $evaluation->is_final);
        $this->assertSame(FieldEvaluation::STATUS_SUBMITTED, $evaluation->status);
        $this->assertNotNull($evaluation->submitted_at);

        $locked = $this->postJson('/api/field-supervisor/students/' . $ctx['student']->id . '/evaluation-draft', [
            'template_id' => $template->id,
            'scores' => ['commitment' => 1],
        ]);
        $locked->assertStatus(422);
    }

    public function test_forms_workboard_returns_only_items_for_current_reviewer_with_valid_links(): void
    {
        $ctx = $this->createFieldSupervisorContext();
        $other = $ctx['otherSupervisor'];

        $template = FormTemplate::create([
            'code' => 'fs-review-form',
            'title_ar' => 'نموذج مراجعة ميداني',
            'form_type' => 'review',
            'owner_type' => 'student',
            'primary_actor_role' => 'student',
            'requires_review' => true,
            'can_be_returned' => true,
            'supports_attachments' => false,
            'is_active' => true,
            'is_archived' => false,
            'schema_json' => ['fields' => [['name' => 'summary', 'type' => 'text']]],
        ]);

        FormInstance::create([
            'form_template_id' => $template->id,
            'training_assignment_id' => $ctx['assignment']->id,
            'owner_user_id' => $ctx['student']->id,
            'subject_user_id' => $ctx['student']->id,
            'owner_type' => 'student',
            'status' => FormInstance::STATUS_PENDING_REVIEW,
            'payload' => ['summary' => 'Needs approval'],
            'current_reviewer_id' => $ctx['supervisor']->id,
        ]);

        FormInstance::create([
            'form_template_id' => $template->id,
            'training_assignment_id' => $ctx['assignment']->id,
            'owner_user_id' => $ctx['student']->id,
            'subject_user_id' => $ctx['student']->id,
            'owner_type' => 'student',
            'status' => FormInstance::STATUS_PENDING_REVIEW,
            'payload' => ['summary' => 'For other reviewer'],
            'current_reviewer_id' => $other->id,
        ]);

        Sanctum::actingAs($ctx['supervisor']);
        $response = $this->getJson('/api/field-supervisor/forms-workboard');

        $response->assertOk();
        $forms = collect($response->json('review.e_form_instances'));
        $this->assertCount(1, $forms);
        $this->assertNotNull($forms->first()['id']);
        $this->assertStringStartsWith('/field-supervisor/form-instances/', $forms->first()['link']);
    }

    private function createFieldSupervisorContext(): array
    {
        $fieldSupervisorRole = Role::create(['name' => 'field_supervisor']);
        $studentRole = Role::create(['name' => 'student']);
        $department = Department::create(['name' => 'education']);

        $supervisor = User::create([
            'name' => 'Field Supervisor Main',
            'email' => 'fs.eval.main@example.com',
            'role_id' => $fieldSupervisorRole->id,
            'department_id' => $department->id,
            'university_id' => 'FS-EVAL-001',
            'password' => bcrypt('password'),
        ]);
        $otherSupervisor = User::create([
            'name' => 'Field Supervisor Other',
            'email' => 'fs.eval.other@example.com',
            'role_id' => $fieldSupervisorRole->id,
            'department_id' => $department->id,
            'university_id' => 'FS-EVAL-002',
            'password' => bcrypt('password'),
        ]);
        $student = User::create([
            'name' => 'Student Eval',
            'email' => 'student.eval@example.com',
            'role_id' => $studentRole->id,
            'department_id' => $department->id,
            'university_id' => 'STD-EVAL-001',
            'password' => bcrypt('password'),
        ]);

        $course = Course::create([
            'code' => 'EDU-312',
            'name' => 'Field Training III',
            'credit_hours' => 3,
            'training_hours' => 120,
            'type' => 'practical',
        ]);
        $period = TrainingPeriod::create([
            'name' => '2026-Fall',
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'is_active' => true,
        ]);
        $site = TrainingSite::create([
            'name' => 'School Eval',
            'location' => 'Hebron',
            'is_active' => true,
            'directorate' => 'وسط',
            'capacity' => 20,
            'site_type' => 'school',
            'governing_body' => 'directorate_of_education',
            'school_type' => 'public',
        ]);
        $trainingRequest = TrainingRequest::create([
            'training_site_id' => $site->id,
            'training_period_id' => $period->id,
            'status' => 'approved',
            'requested_at' => now(),
        ]);
        $section = Section::create([
            'name' => 'Section Eval',
            'academic_year' => (int) now()->format('Y'),
            'semester' => 'second',
            'course_id' => $course->id,
        ]);
        $enrollment = Enrollment::create([
            'user_id' => $student->id,
            'section_id' => $section->id,
            'academic_year' => (int) now()->format('Y'),
            'semester' => 'second',
            'status' => 'active',
        ]);
        $assignment = TrainingAssignment::create([
            'enrollment_id' => $enrollment->id,
            'training_request_id' => $trainingRequest->id,
            'training_site_id' => $site->id,
            'training_period_id' => $period->id,
            'teacher_id' => $supervisor->id,
            'status' => 'ongoing',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);

        return compact('supervisor', 'otherSupervisor', 'student', 'assignment');
    }
}
