<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\FieldSupervisorProfile;
use App\Models\TrainingAssignment;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder لإنشاء مشرف ميداني تجريبي مع بيانات اختبار
 */
class FieldSupervisorSeeder extends Seeder
{
    public function run(): void
    {
        // التأكد من وجود دور المشرف الميداني
        $role = Role::firstOrCreate(['name' => 'field_supervisor']);

        // ═══════════════════════════════════════════════════════════
        // إنشاء 3 مشرفين ميدانيين (لكل نوع فرعي)
        // ═══════════════════════════════════════════════════════════

        $supervisors = [
            [
                'name' => 'أحمد محمد - معلم مرشد',
                'email' => 'mentor.teacher@example.com',
                'university_id' => 'MENTOR001',
                'type' => 'mentor_teacher',
                'workplace' => 'مدرسة الأمل الثانوية',
                'department' => 'قسم أصول التربية',
            ],
            [
                'name' => 'أ. لينا محسن',
                'email' => 'lina.mohsen@hebron.edu',
                'university_id' => 'COUNSEL001',
                'type' => 'school_counselor',
                'workplace' => 'مدرسة النور الأساسية',
                'department' => 'قسم علم النفس',
            ],
            [
                'name' => 'محمد علي - أخصائي نفسي',
                'email' => 'psychologist@example.com',
                'university_id' => 'PSYCH001',
                'type' => 'psychologist',
                'workplace' => 'مركز الصحة النفسية - الخليل',
                'department' => 'قسم علم النفس',
            ],
        ];

        $usoolDeptId = \App\Models\Department::where('name', 'usool_tarbiah')->value('id');
        $psychDeptId = \App\Models\Department::where('name', 'psychology')->value('id');

        $deptMap = [
            'mentor_teacher' => $usoolDeptId,
            'school_counselor' => $psychDeptId,
            'psychologist' => $psychDeptId,
        ];

        foreach ($supervisors as $supervisorData) {
            // حل المستخدم الحالي: البريد الجديد، أو (للمرشدة) الحساب القديم / نفس الرقم الجامعي
            // لتفادي duplicate university_id عند تغيير البريد من school.counselor@example.com
            $user = User::query()->where('email', $supervisorData['email'])->first();
            if (!$user && $supervisorData['type'] === 'school_counselor') {
                $user = User::query()
                    ->where('email', 'school.counselor@example.com')
                    ->orWhere('university_id', $supervisorData['university_id'])
                    ->first();
            }

            $attributes = [
                'name' => $supervisorData['name'],
                'email' => $supervisorData['email'],
                'university_id' => $supervisorData['university_id'],
                'password' => Hash::make('password123'),
                'role_id' => $role->id,
                'department_id' => $deptMap[$supervisorData['type']] ?? null,
                'phone' => '0599000000',
                'status' => 'active',
            ];

            if ($user) {
                $user->update($attributes);
                $user = $user->fresh();
            } else {
                $user = User::query()->create($attributes);
            }

            // إنشاء ملف المشرف الميداني
            FieldSupervisorProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'supervisor_type' => $supervisorData['type'],
                    'workplace_name' => $supervisorData['workplace'],
                    'workplace_type' => $supervisorData['type'] === 'psychologist' ? 'مركز صحي' : 'مدرسة',
                    'department' => $supervisorData['department'],
                    'phone' => '0599000000',
                    'is_active' => true,
                ]
            );

            $this->command->info("✅ تم إنشاء المشرف الميداني: {$supervisorData['name']} ({$supervisorData['type']})");
        }

        // ═══════════════════════════════════════════════════════════
        // ربط المشرفين بالطلاب (إذا وجدت تعيينات)
        // ═══════════════════════════════════════════════════════════

        $mentorTeacher = User::where('email', 'mentor.teacher@example.com')->first();
        $counselor = User::where('email', 'lina.mohsen@hebron.edu')->first()
            ?? User::where('email', 'school.counselor@example.com')->first();
        $psychologist = User::where('email', 'psychologist@example.com')->first();

        // تحديث بعض التعيينات لتكون مرتبطة بالمشرفين الميدانيين
        if ($mentorTeacher) {
            TrainingAssignment::inRandomOrder()->limit(3)->update([
                'teacher_id' => $mentorTeacher->id,
            ]);
        }

        if ($counselor) {
            TrainingAssignment::inRandomOrder()->limit(3)->whereNull('teacher_id')->update([
                'teacher_id' => $counselor->id,
            ]);
        }

        if ($psychologist) {
            TrainingAssignment::inRandomOrder()->limit(3)->whereNull('teacher_id')->update([
                'teacher_id' => $psychologist->id,
            ]);
        }

        // تعيين Demo (stu02) مرتبط بـ «أ. لينا محسن» — وإلا لن تظهر له طلبة في واجهة المشرف الميداني
        // (DemoDataSeeder يضع teacher_id كمعلم عادي، وليس كمشرف ميداني)
        $demoStudent = User::where('email', 'stu02@hebron.edu')->first();
        if ($counselor && $demoStudent) {
            $n = TrainingAssignment::query()
                ->whereHas('enrollment', static fn ($q) => $q->where('user_id', $demoStudent->id))
                ->whereIn('status', ['assigned', 'ongoing'])
                ->update(['teacher_id' => $counselor->id]);
            if ($n > 0) {
                $this->command->info("✅ رُبطت {$n} تعيين(ات) تجريبية بالمشرف الميداني: {$counselor->name}");
            }
        }

        $this->command->info('✅ تم ربط المشرفين الميدانيين بالطلاب');
    }
}
