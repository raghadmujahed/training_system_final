<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\Section;
use App\Models\TrainingAssignment;
use App\Models\TrainingPeriod;
use App\Models\TrainingRequest;
use App\Models\TrainingSite;
use App\Models\User;
use Illuminate\Database\Seeder;

class PsychStudentsInSchoolSeeder extends Seeder
{
    public function run(): void
    {
        $manager = User::where('email', 'schoolmanager.1@hebron.edu')
            ->with('trainingSite')
            ->first();

        if (! $manager || ! $manager->trainingSite) {
            $this->command->warn('PsychStudentsInSchoolSeeder: مدير المدرسة أو الموقع غير موجود');
            return;
        }

        $site = $manager->trainingSite;
        $period = TrainingPeriod::where('is_active', true)->first()
            ?? TrainingPeriod::latest()->first();

        if (! $period) {
            $this->command->warn('PsychStudentsInSchoolSeeder: لا يوجد فترة تدريب');
            return;
        }

        $psychDeptId = Department::where('name', 'psychology')->value('id');
        $psychStudents = User::whereHas('role', fn($q) => $q->where('name', 'student'))
            ->where('department_id', $psychDeptId)
            ->get();

        if ($psychStudents->isEmpty()) {
            $this->command->warn('PsychStudentsInSchoolSeeder: لا يوجد طلاب علم نفس');
            return;
        }

        $course = Course::where('name', 'like', '%نفس%')->first()
            ?? Course::first();

        if (! $course) {
            $this->command->warn('PsychStudentsInSchoolSeeder: لا يوجد مادة');
            return;
        }

        $coordinator = User::whereHas('role', fn($q) => $q->where('name', 'training_coordinator'))
            ->first();
        $supervisor = User::whereHas('role', fn($q) => $q->where('name', 'academic_supervisor'))
            ->first();
        $teacher = User::whereHas('role', fn($q) => $q->where('name', 'teacher'))
            ->where('training_site_id', $site->id)
            ->first()
            ?? User::whereHas('role', fn($q) => $q->where('name', 'teacher'))->first();

        $adminId = User::whereHas('role', fn($q) => $q->where('name', 'admin'))->value('id')
            ?? User::first()?->id;

        $supervisorId = $supervisor?->id ?? $adminId;

        // ابحث أو أنشئ طلب تدريب مرتبط بالموقع
        $trainingRequest = TrainingRequest::where('training_site_id', $site->id)->first()
            ?? TrainingRequest::create([
                'training_site_id' => $site->id,
                'training_period_id' => $period->id,
                'letter_number' => 'PSY-SCH-' . $site->id . '-2025',
                'letter_date' => now()->toDateString(),
                'governing_body' => 'directorate_of_education',
                'book_status' => 'approved',
                'status' => 'approved',
                'submitted_by' => $coordinator?->id ?? $adminId,
            ]);

        foreach ($psychStudents as $student) {
            $section = Section::firstOrCreate(
                ['course_id' => $course->id, 'name' => 'PSY-SCH-' . $student->id],
                [
                    'academic_year' => 2025,
                    'semester' => 'first',
                    'academic_supervisor_id' => $supervisorId,
                    'capacity' => 30,
                    'created_by' => $adminId,
                ]
            );

            $enrollment = Enrollment::firstOrCreate(
                ['user_id' => $student->id, 'section_id' => $section->id, 'academic_year' => 2025, 'semester' => 'first'],
                ['status' => 'active']
            );

            TrainingAssignment::firstOrCreate(
                ['enrollment_id' => $enrollment->id, 'training_site_id' => $site->id],
                [
                    'training_request_id' => $trainingRequest->id,
                    'training_period_id' => $period->id,
                    'teacher_id' => $teacher?->id,
                    'academic_supervisor_id' => $supervisor?->id,
                    'coordinator_id' => $coordinator?->id,
                    'status' => 'ongoing',
                    'start_date' => $period->start_date,
                    'end_date' => $period->end_date,
                ]
            );

            $this->command->info("✓ {$student->name} → {$site->name}");
        }
    }
}
