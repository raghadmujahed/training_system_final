<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;
use App\Models\Course;
use App\Models\Section;
use App\Models\Enrollment;
use App\Models\TrainingSite;
use App\Models\TrainingPeriod;
use App\Models\TrainingRequest;
use App\Models\TrainingRequestStudent;
use App\Enums\UserStatus;
use App\Enums\CourseType;
use App\Enums\Semester;
use App\Enums\SiteType;
use App\Enums\GoverningBody;
use App\Enums\Directorate;
use App\Enums\TrainingRequestStudentStatus;

class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        // إنشاء الأقسام
        $educationDept = Department::create(['name' => 'كلية التربية']);
        $psychologyDept = Department::create(['name' => 'قسم علم النفس']);

        // إنشاء الأدوار
        $adminRole = Role::create(['name' => 'admin']);
        $coordinatorRole = Role::create(['name' => 'coordinator']);
        $academicSupervisorRole = Role::create(['name' => 'academic_supervisor']);
        $teacherRole = Role::create(['name' => 'teacher']);
        $studentRole = Role::create(['name' => 'student']);
        $schoolManagerRole = Role::create(['name' => 'school_manager']);
        $educationDirectorateRole = Role::create(['name' => 'education_directorate']);

        // إنشاء مستخدمين
        $admin = User::create([
            'university_id' => 'ADMIN001',
            'name' => 'مدير النظام',
            'email' => 'admin@hebron.edu',
            'password' => bcrypt('password'),
            'status' => UserStatus::ACTIVE->value,
            'role_id' => $adminRole->id,
            'phone' => '0590000000',
        ]);

        $coordinator = User::create([
            'university_id' => 'COORD001',
            'name' => 'منسق التدريب',
            'email' => 'coordinator@hebron.edu',
            'password' => bcrypt('password'),
            'status' => UserStatus::ACTIVE->value,
            'role_id' => $coordinatorRole->id,
            'department_id' => $educationDept->id,
            'phone' => '0590000001',
        ]);

        $supervisor = User::create([
            'university_id' => 'SUP001',
            'name' => 'د. علي المشرف',
            'email' => 'supervisor@hebron.edu',
            'password' => bcrypt('password'),
            'status' => UserStatus::ACTIVE->value,
            'role_id' => $academicSupervisorRole->id,
            'department_id' => $educationDept->id,
            'phone' => '0590000003',
        ]);

        $teacher = User::create([
            'university_id' => 'TCH001',
            'name' => 'محمد المعلم',
            'email' => 'teacher@hebron.edu.ps',
            'password' => bcrypt('password'),
            'status' => UserStatus::ACTIVE->value,
            'role_id' => $teacherRole->id,
            'phone' => '0591000101',
        ]);

        $student = User::create([
            'university_id' => '20201234',
            'name' => 'أحمد الطالب',
            'email' => 'student@students.hebron.edu',
            'password' => bcrypt('password'),
            'status' => UserStatus::ACTIVE->value,
            'role_id' => $studentRole->id,
            'department_id' => $educationDept->id,
            'major' => 'رياضيات',
            'phone' => '0591000000',
        ]);

        $schoolManager = User::create([
            'university_id' => 'SCHMGR001',
            'name' => 'خالد مدير المدرسة',
            'email' => 'schoolmanager@hebron.edu.ps',
            'password' => bcrypt('password'),
            'status' => UserStatus::ACTIVE->value,
            'role_id' => $schoolManagerRole->id,
            'phone' => '0222222222',
        ]);

        $directorateUser = User::create([
            'university_id' => 'DIR001',
            'name' => 'موظف المديرية',
            'email' => 'directorate@hebron.edu',
            'password' => bcrypt('password'),
            'status' => UserStatus::ACTIVE->value,
            'role_id' => $educationDirectorateRole->id,
            'directorate' => 'وسط',
            'phone' => '0222222223',
        ]);

        // إنشاء مساقات وشعب
        $course = Course::create([
            'code' => 'EDU401',
            'name' => 'التربية العملية 1',
            'description' => 'تدريب ميداني في المدارس',
            'credit_hours' => 3,
            'type' => CourseType::PRACTICAL->value,
        ]);

        $section = Section::create([
            'name' => 'شعبة A',
            'academic_year' => '2025',
            'academic_supervisor_id' => $supervisor->id,
            'semester' => Semester::FIRST->value,
            'course_id' => $course->id,
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'section_id' => $section->id,
            'academic_year' => '2025',
            'semester' => Semester::FIRST->value,
            'status' => 'active',
        ]);

        // إنشاء موقع تدريب
        $trainingSite = TrainingSite::create([
            'name' => 'مدرسة ذكور الخليل الأساسية',
            'location' => 'الخليل - شارع القدس',
            'phone' => '022222222',
            'description' => 'مدرسة حكومية',
            'is_active' => true,
            'directorate' => Directorate::CENTRAL->value,
            'capacity' => 10,
            'site_type' => SiteType::SCHOOL->value,
            'governing_body' => GoverningBody::DIRECTORATE_OF_EDUCATION->value,
            'school_type' => 'public',
            'gender_classification' => 'boys',
            'school_level' => 'lower',
        ]);

        // إنشاء فترة تدريب نشطة
        TrainingPeriod::create([
            'name' => 'الفصل الأول 2025',
            'start_date' => '2025-09-01',
            'end_date' => '2025-12-31',
            'is_active' => true,
        ]);

        // إنشاء كتاب تدريبي وطلب طالب
        $trainingRequest = TrainingRequest::create([
            'letter_number' => '2025/001',
            'letter_date' => '2025-09-01',
            'book_status' => 'draft',
            'status' => 'pending',
            'requested_at' => now(),
            'training_site_id' => $trainingSite->id,
            'training_period_id' => 1,
        ]);

        TrainingRequestStudent::create([
            'training_request_id' => $trainingRequest->id,
            'user_id' => $student->id,
            'course_id' => $course->id,
            'start_date' => '2025-09-15',
            'end_date' => '2025-12-15',
            'status' => TrainingRequestStudentStatus::PENDING->value,
        ]);

        $this->command->info('تم إدخال بيانات الاختبار بنجاح.');
    }
}