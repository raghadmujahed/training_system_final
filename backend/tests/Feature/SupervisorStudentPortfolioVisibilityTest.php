<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\PortfolioEntry;
use App\Models\Role;
use App\Models\Section;
use App\Models\StudentPortfolio;
use App\Models\TrainingAssignment;
use App\Models\TrainingPeriod;
use App\Models\TrainingRequest;
use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupervisorStudentPortfolioVisibilityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * عندما يشير ملف إنجاز الطالب إلى تعيين أقدم ومسار المشرف يعيد أحدث تعيين لنفس التسجيل،
     * يجب أن تظهر المدخلات للمشرف (لا قائمة فارغة).
     */
    public function test_supervisor_sees_portfolio_entries_when_portfolio_linked_to_older_assignment_same_enrollment(): void
    {
        $role = Role::create(['name' => 'academic_supervisor']);
        $studentRole = Role::create(['name' => 'student']);
        $department = Department::create(['name' => 'psychology']);

        $supervisor = User::create([
            'name' => 'Supervisor',
            'email' => 'sup-portfolio@example.com',
            'role_id' => $role->id,
            'department_id' => $department->id,
            'university_id' => 'SUP-PF-1',
            'password' => bcrypt('password'),
        ]);

        $student = User::create([
            'name' => 'Student',
            'email' => 'std-portfolio@example.com',
            'role_id' => $studentRole->id,
            'department_id' => $department->id,
            'university_id' => 'STD-PF-1',
            'password' => bcrypt('password'),
        ]);

        $course = Course::create([
            'code' => 'PSYC410',
            'name' => 'Training',
            'credit_hours' => 3,
            'type' => 'practical',
        ]);

        $period = TrainingPeriod::create([
            'name' => '2026-Spring',
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
            'is_active' => true,
        ]);

        $site = TrainingSite::create([
            'name' => 'Clinic A',
            'location' => 'Bethlehem',
            'is_active' => true,
            'directorate' => 'وسط',
            'capacity' => 10,
            'site_type' => 'clinic',
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
            'name' => 'Psych Section',
            'academic_year' => (int) now()->format('Y'),
            'academic_supervisor_id' => $supervisor->id,
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

        $assignmentOlder = TrainingAssignment::create([
            'enrollment_id' => $enrollment->id,
            'training_request_id' => $trainingRequest->id,
            'training_request_student_id' => null,
            'training_site_id' => $site->id,
            'training_period_id' => $period->id,
            'teacher_id' => null,
            'academic_supervisor_id' => $supervisor->id,
            'coordinator_id' => null,
            'status' => 'assigned',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);

        $assignmentNewer = TrainingAssignment::create([
            'enrollment_id' => $enrollment->id,
            'training_request_id' => $trainingRequest->id,
            'training_request_student_id' => null,
            'training_site_id' => $site->id,
            'training_period_id' => $period->id,
            'teacher_id' => null,
            'academic_supervisor_id' => $supervisor->id,
            'coordinator_id' => null,
            'status' => 'ongoing',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);

        $this->assertGreaterThan($assignmentOlder->id, $assignmentNewer->id);

        $portfolio = StudentPortfolio::create([
            'user_id' => $student->id,
            'training_assignment_id' => $assignmentOlder->id,
        ]);

        PortfolioEntry::create([
            'student_portfolio_id' => $portfolio->id,
            'title' => 'وثيقة تجريبية',
            'code' => 'DOC1',
            'category' => 'general',
            'content' => null,
            'file_path' => 'portfolio/test.pdf',
            'review_status' => 'pending',
        ]);

        Sanctum::actingAs($supervisor);

        $response = $this->getJson("/api/supervisor/students/{$student->id}/portfolio");

        $response->assertOk()->assertJsonPath('success', true);
        $sections = $response->json('data.sections');
        $this->assertIsArray($sections);
        $this->assertCount(1, $sections);
        $this->assertSame('وثيقة تجريبية', $sections[0]['title'] ?? null);

        $portfolio->refresh();
        $this->assertSame($assignmentNewer->id, (int) $portfolio->training_assignment_id);
    }
}
