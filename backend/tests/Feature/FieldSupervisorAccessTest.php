<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
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

class FieldSupervisorAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_field_supervisor_routes_require_authentication(): void
    {
        $ctx = $this->createFieldSupervisorContext();

        $this->getJson('/api/field-supervisor/dashboard')->assertStatus(401);
        $this->getJson('/api/field-supervisor/students')->assertStatus(401);
        $this->getJson('/api/field-supervisor/students/' . $ctx['studentA']->id)->assertStatus(401);
    }

    public function test_students_list_returns_only_linked_students_for_current_field_supervisor(): void
    {
        $ctx = $this->createFieldSupervisorContext();
        Sanctum::actingAs($ctx['supervisorA']);

        $response = $this->getJson('/api/field-supervisor/students');

        $response->assertOk();
        $studentIds = collect($response->json())->pluck('id')->all();

        $this->assertContains($ctx['studentA']->id, $studentIds);
        $this->assertNotContains($ctx['studentB']->id, $studentIds);
    }

    public function test_field_supervisor_can_open_linked_student_file(): void
    {
        $ctx = $this->createFieldSupervisorContext();
        Sanctum::actingAs($ctx['supervisorA']);

        $response = $this->getJson('/api/field-supervisor/students/' . $ctx['studentA']->id);

        $response
            ->assertOk()
            ->assertJsonPath('student.id', $ctx['studentA']->id)
            ->assertJsonPath('student.training_site', 'School A');
    }

    public function test_field_supervisor_cannot_open_unlinked_student_file(): void
    {
        $ctx = $this->createFieldSupervisorContext();
        Sanctum::actingAs($ctx['supervisorA']);

        $response = $this->getJson('/api/field-supervisor/students/' . $ctx['studentB']->id);

        $response->assertStatus(403);
    }

    private function createFieldSupervisorContext(): array
    {
        $fieldSupervisorRole = Role::create(['name' => 'field_supervisor']);
        $studentRole = Role::create(['name' => 'student']);

        $department = Department::create(['name' => 'education']);

        $supervisorA = User::create([
            'name' => 'Field Supervisor A',
            'email' => 'fs.a@example.com',
            'role_id' => $fieldSupervisorRole->id,
            'department_id' => $department->id,
            'university_id' => 'FS-A-001',
            'password' => bcrypt('password'),
        ]);

        $supervisorB = User::create([
            'name' => 'Field Supervisor B',
            'email' => 'fs.b@example.com',
            'role_id' => $fieldSupervisorRole->id,
            'department_id' => $department->id,
            'university_id' => 'FS-B-001',
            'password' => bcrypt('password'),
        ]);

        $studentA = User::create([
            'name' => 'Student A',
            'email' => 'student.a@example.com',
            'role_id' => $studentRole->id,
            'department_id' => $department->id,
            'university_id' => 'STD-A-001',
            'password' => bcrypt('password'),
        ]);

        $studentB = User::create([
            'name' => 'Student B',
            'email' => 'student.b@example.com',
            'role_id' => $studentRole->id,
            'department_id' => $department->id,
            'university_id' => 'STD-B-001',
            'password' => bcrypt('password'),
        ]);

        $course = Course::create([
            'code' => 'EDU-310',
            'name' => 'Field Training',
            'credit_hours' => 3,
            'training_hours' => 120,
            'type' => 'practical',
        ]);

        $period = TrainingPeriod::create([
            'name' => '2026-Spring',
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
            'is_active' => true,
        ]);

        $site = TrainingSite::create([
            'name' => 'School A',
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
            'name' => 'Section 1',
            'academic_year' => (int) now()->format('Y'),
            'semester' => 'second',
            'course_id' => $course->id,
        ]);

        $enrollmentA = Enrollment::create([
            'user_id' => $studentA->id,
            'section_id' => $section->id,
            'academic_year' => (int) now()->format('Y'),
            'semester' => 'second',
            'status' => 'active',
        ]);

        $enrollmentB = Enrollment::create([
            'user_id' => $studentB->id,
            'section_id' => $section->id,
            'academic_year' => (int) now()->format('Y'),
            'semester' => 'second',
            'status' => 'active',
        ]);

        TrainingAssignment::create([
            'enrollment_id' => $enrollmentA->id,
            'training_request_id' => $trainingRequest->id,
            'training_site_id' => $site->id,
            'training_period_id' => $period->id,
            'teacher_id' => $supervisorA->id,
            'status' => 'ongoing',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);

        TrainingAssignment::create([
            'enrollment_id' => $enrollmentB->id,
            'training_request_id' => $trainingRequest->id,
            'training_site_id' => $site->id,
            'training_period_id' => $period->id,
            'teacher_id' => $supervisorB->id,
            'status' => 'ongoing',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);

        return compact('supervisorA', 'supervisorB', 'studentA', 'studentB');
    }
}
