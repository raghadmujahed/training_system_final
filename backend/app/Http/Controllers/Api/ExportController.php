<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ExportController extends Controller
{
    /**
     * Export all users (or filtered users) as CSV.
     * Only accessible by admin role.
     */
    public function exportUsers(Request $request): Response
    {
        $user = $request->user();

        if ($user->role?->name !== 'admin') {
            return response()->json([
                'message' => 'لا تملك صلاحية تصدير المستخدمين.',
            ], 403);
        }

        $query = User::with(['role', 'department'])
            ->orderBy('created_at', 'desc');

        // Optional filters (same keys as UsersList frontend)
        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('university_id', 'like', "%{$search}%");
            });
        }

        $users = $query->get();

        $roleLabels = [
            'admin'                    => 'مدير النظام',
            'student'                  => 'طالب',
            'teacher'                  => 'المعلم المرشد',
            'field_supervisor'         => 'مشرف ميداني',
            'school_manager'           => 'مدير مدرسة',
            'psychology_center_manager'=> 'مدير مركز نفسي',
            'adviser'                  => 'المرشد التربوي',
            'psychologist'             => 'أخصائي نفسي',
            'academic_supervisor'      => 'مشرف أكاديمي',
            'training_coordinator'     => 'منسق تدريب',
            'coordinator'              => 'منسق تدريب',
            'education_directorate'    => 'مديرية تربية',
            'health_directorate'       => 'وزارة الصحة',
            'head_of_department'       => 'رئيس قسم',
        ];

        $statusLabels = [
            'active'    => 'نشط',
            'inactive'  => 'غير نشط',
            'suspended' => 'موقوف',
        ];

        $headers = ['ID', 'المعرف الجامعي', 'الاسم', 'البريد الإلكتروني', 'الهاتف', 'الدور', 'القسم', 'الحالة', 'تاريخ الإنشاء'];

        $rows = $users->map(function ($u) use ($roleLabels, $statusLabels) {
            return [
                $u->id,
                $u->university_id ?? '',
                $u->name ?? '',
                $u->email ?? '',
                $u->phone ?? '',
                $roleLabels[$u->role?->name] ?? ($u->role?->name ?? ''),
                $u->department?->name ?? '',
                $statusLabels[$u->status] ?? ($u->status ?? ''),
                $u->created_at?->format('Y-m-d H:i') ?? '',
            ];
        })->toArray();

        return $this->buildCsvResponse($headers, $rows, 'users_export_' . now()->format('Y-m-d') . '.csv');
    }

    /**
     * Export all training requests (or filtered) as CSV.
     * Only accessible by admin role.
     */
    public function exportTrainingRequests(Request $request): Response
    {
        $user = $request->user();

        if ($user->role?->name !== 'admin') {
            return response()->json([
                'message' => 'لا تملك صلاحية تصدير طلبات التدريب.',
            ], 403);
        }

        $query = TrainingRequest::with([
            'requestedBy.role',
            'requestedBy.department',
            'trainingSite',
            'trainingPeriod',
        ])->orderBy('created_at', 'desc');

        // Optional filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->filled('department_id')) {
            $query->whereHas('requestedBy', function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }
        if ($request->filled('year')) {
            $query->whereYear('created_at', $request->year);
        }

        $requests = $query->get();

        $statusLabels = [
            'draft'             => 'مسودة',
            'pending'           => 'قيد المراجعة',
            'approved'          => 'موافق عليه',
            'rejected'          => 'مرفوض',
            'completed'         => 'مكتمل',
            'sent_to_school'    => 'أُرسل للمدرسة',
            'school_approved'   => 'وافقت المدرسة',
            'needs_edit'        => 'يحتاج تعديل',
        ];

        $headers = [
            'ID',
            'اسم الطالب',
            'المعرف الجامعي',
            'البريد الإلكتروني',
            'القسم',
            'جهة التدريب',
            'الجهة المشرفة (directorate)',
            'الحالة',
            'الفترة التدريبية',
            'رقم الخطاب',
            'تاريخ الخطاب',
            'تاريخ الإنشاء',
            'تاريخ آخر تحديث',
        ];

        $rows = $requests->map(function ($r) use ($statusLabels) {
            return [
                $r->id,
                $r->requestedBy?->name ?? '',
                $r->requestedBy?->university_id ?? '',
                $r->requestedBy?->email ?? '',
                $r->requestedBy?->department?->name ?? '',
                $r->trainingSite?->name ?? '',
                $r->directorate ?? $r->governing_body ?? '',
                $statusLabels[$r->status] ?? ($r->status ?? ''),
                $r->trainingPeriod?->name ?? '',
                $r->letter_number ?? '',
                $r->letter_date?->format('Y-m-d') ?? '',
                $r->created_at?->format('Y-m-d H:i') ?? '',
                $r->updated_at?->format('Y-m-d H:i') ?? '',
            ];
        })->toArray();

        return $this->buildCsvResponse($headers, $rows, 'training_requests_export_' . now()->format('Y-m-d') . '.csv');
    }

    /**
     * Build a streamed CSV response with UTF-8 BOM so Arabic opens correctly in Excel.
     */
    private function buildCsvResponse(array $headers, array $rows, string $filename): Response
    {
        $output = fopen('php://temp', 'r+');

        // UTF-8 BOM — required for Excel to correctly display Arabic
        fwrite($output, "\xEF\xBB\xBF");

        fputcsv($output, $headers);
        foreach ($rows as $row) {
            fputcsv($output, $row);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            'Pragma'              => 'no-cache',
            'Expires'             => '0',
        ]);
    }
}
