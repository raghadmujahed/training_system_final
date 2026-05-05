<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Course;
use App\Models\DailyReport;
use App\Models\DailyReportTemplate;
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

class FieldSupervisorAttendanceAndReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_field_supervisor_can_record_attendance_for_linked_student_only(): void
    {
        $ctx = $this->createFieldSupervisorContext();
        Sanctum::actingAs($ctx['supervisorA']);

        $ok = $this->postJson('/api/field-supervisor/attendance', [
            'student_id' => $ctx['studentA']->id,
            'date' => now()->toDateString(),
            'status' => 'present',
            'check_in' => '08:00',
            'check_out' => '13:00',
            'notes' => 'On time.',
        ]);

        $ok->assertOk();
        $this->assertDatabaseHas('attendances', [
            'user_id' => $ctx['studentA']->id,
            'training_assignment_id' => $ctx['assignmentA']->id,
            'status' => 'present',
            'notes' => 'On time.',
        ]);

        $forbidden = $this->postJson('/api/field-supervisor/attendance', [
            'student_id' => $ctx['studentB']->id,
            'date' => now()->toDateString(),
            'status' => 'present',
        ]);

        $forbidden->assertStatus(403);
    }

    public function test_supervisor_patch_attendance_saves_notes_and_signoff_and_blocks_other_supervisor(): void
    {
        $ctx = $this->createFieldSupervisorContext();
        $attendance = Attendance::create([
            'training_assignment_id' => $ctx['assignmentA']->id,
            'user_id' => $ctx['studentA']->id,
            'date' => now()->toDateString(),
            'status' => 'late',
            'check_in' => '08:30:00',
            'check_out' => '13:00:00',
        ]);

        Sanctum::actingAs($ctx['supervisorA']);
        $ok = $this->patchJson('/api/field-supervisor/attendance/' . $attendance->id . '/supervisor', [
            'field_supervisor_notes' => 'Needs punctuality improvement.',
            'sign_off' => true,
        ]);
        $ok->assertOk();

        $attendance->refresh();
        $this->assertSame('Needs punctuality improvement.', $attendance->field_supervisor_notes);
        $this->assertSame($ctx['supervisorA']->id, $attendance->approved_by);
        $this->assertNotNull($attendance->approved_at);

        Sanctum::actingAs($ctx['supervisorB']);
        $forbidden = $this->patchJson('/api/field-supervisor/attendance/' . $attendance->id . '/supervisor', [
            'field_supervisor_notes' => 'Should never be saved.',
            'sign_off' => true,
        ]);
        $forbidden->assertStatus(403);
    }

    public function test_confirm_and_return_daily_report_work_for_owner_only(): void
    {
        $ctx = $this->createFieldSupervisorContext();
        $template = DailyReportTemplate::create([
            'name' => 'Mentor Daily Report',
            'code' => 'mentor_daily_report',
            'applies_to' => 'mentor_teacher',
            'fields' => [['name' => 'body', 'type' => 'text', 'required' => true]],
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $reportA = DailyReport::create([
            'student_id' => $ctx['studentA']->id,
            'field_supervisor_id' => $ctx['supervisorA']->id,
            'training_assignment_id' => $ctx['assignmentA']->id,
            'template_id' => $template->id,
            'report_date' => now()->toDateString(),
            'content' => ['body' => 'Daily work'],
            'status' => DailyReport::STATUS_SUBMITTED,
        ]);

        $reportB = DailyReport::create([
            'student_id' => $ctx['studentB']->id,
            'field_supervisor_id' => $ctx['supervisorB']->id,
            'training_assignment_id' => $ctx['assignmentB']->id,
            'template_id' => $template->id,
            'report_date' => now()->toDateString(),
            'content' => ['body' => 'Other daily work'],
            'status' => DailyReport::STATUS_SUBMITTED,
        ]);

        Sanctum::actingAs($ctx['supervisorA']);
        $confirm = $this->postJson('/api/field-supervisor/daily-reports/' . $reportA->id . '/confirm', [
            'comment' => 'Well done.',
        ]);
        $confirm->assertOk();
        $this->assertDatabaseHas('daily_reports', [
            'id' => $reportA->id,
            'status' => DailyReport::STATUS_CONFIRMED,
            'supervisor_comment' => 'Well done.',
        ]);

        $forbidden = $this->postJson('/api/field-supervisor/daily-reports/' . $reportB->id . '/return', [
            'comment' => 'Fix the form.',
        ]);
        $forbidden->assertStatus(404);
    }

    public function test_psychologist_can_index_attendances_for_assignments_where_they_are_teacher(): void
    {
        $psychRole = Role::create(['name' => 'psychologist']);
        $studentRole = Role::create(['name' => 'student']);
        $department = Department::create(['name' => 'psych']);

        $psych = User::create([
            'name' => 'Institution Psych',
            'email' => 'psych.att.list@example.com',
            'role_id' => $psychRole->id,
            'department_id' => $department->id,
            'university_id' => 'PSY-LIST',
            'password' => bcrypt('password'),
        ]);
        $student = User::create([
            'name' => 'Trainee',
            'email' => 'trainee.att.list@example.com',
            'role_id' => $studentRole->id,
            'department_id' => $department->id,
            'university_id' => 'TRN-LIST',
            'password' => bcrypt('password'),
        ]);

        $course = Course::create([
            'code' => 'PSY-101',
            'name' => 'Clinical',
            'credit_hours' => 3,
            'training_hours' => 120,
            'type' => 'practical',
        ]);
        $period = TrainingPeriod::create([
            'name' => '2026-P',
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'is_active' => true,
        ]);
        $site = TrainingSite::create([
            'name' => 'Clinic',
            'location' => 'Ramallah',
            'is_active' => true,
            'directorate' => 'وسط',
            'capacity' => 10,
            'site_type' => 'psychology_center',
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
            'name' => 'Sec',
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
            'teacher_id' => $psych->id,
            'status' => 'ongoing',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);
        $attendance = Attendance::create([
            'training_assignment_id' => $assignment->id,
            'user_id' => $student->id,
            'date' => now()->toDateString(),
            'status' => 'present',
            'check_in' => '08:00:00',
            'check_out' => '14:00:00',
        ]);

        Sanctum::actingAs($psych);
        $res = $this->getJson('/api/attendances?per_page=200');
        $res->assertOk();
        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($attendance->id, $data[0]['id']);
    }

    private function createFieldSupervisorContext(): array
    {
        $fieldSupervisorRole = Role::create(['name' => 'field_supervisor']);
        $studentRole = Role::create(['name' => 'student']);
        $department = Department::create(['name' => 'education']);

        $supervisorA = User::create([
            'name' => 'Field Supervisor A',
            'email' => 'fs.a.reports@example.com',
            'role_id' => $fieldSupervisorRole->id,
            'department_id' => $department->id,
            'university_id' => 'FS-A-REP',
            'password' => bcrypt('password'),
        ]);
        $supervisorB = User::create([
            'name' => 'Field Supervisor B',
            'email' => 'fs.b.reports@example.com',
            'role_id' => $fieldSupervisorRole->id,
            'department_id' => $department->id,
            'university_id' => 'FS-B-REP',
            'password' => bcrypt('password'),
        ]);

        $studentA = User::create([
            'name' => 'Student A',
            'email' => 'student.a.reports@example.com',
            'role_id' => $studentRole->id,
            'department_id' => $department->id,
            'university_id' => 'STD-A-REP',
            'password' => bcrypt('password'),
        ]);
        $studentB = User::create([
            'name' => 'Student B',
            'email' => 'student.b.reports@example.com',
            'role_id' => $studentRole->id,
            'department_id' => $department->id,
            'university_id' => 'STD-B-REP',
            'password' => bcrypt('password'),
        ]);

        $course = Course::create([
            'code' => 'EDU-311',
            'name' => 'Field Training II',
            'credit_hours' => 3,
            'training_hours' => 120,
            'type' => 'practical',
        ]);
        $period = TrainingPeriod::create([
            'name' => '2026-Summer',
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'is_active' => true,
        ]);
        $site = TrainingSite::create([
            'name' => 'School Reports',
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
            'name' => 'Section Reports',
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

        $assignmentA = TrainingAssignment::create([
            'enrollment_id' => $enrollmentA->id,
            'training_request_id' => $trainingRequest->id,
            'training_site_id' => $site->id,
            'training_period_id' => $period->id,
            'teacher_id' => $supervisorA->id,
            'status' => 'ongoing',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);
        $assignmentB = TrainingAssignment::create([
            'enrollment_id' => $enrollmentB->id,
            'training_request_id' => $trainingRequest->id,
            'training_site_id' => $site->id,
            'training_period_id' => $period->id,
            'teacher_id' => $supervisorB->id,
            'status' => 'ongoing',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);

        return compact('supervisorA', 'supervisorB', 'studentA', 'studentB', 'assignmentA', 'assignmentB');
    }
}
