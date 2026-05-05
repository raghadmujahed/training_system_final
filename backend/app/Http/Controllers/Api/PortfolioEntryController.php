<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePortfolioEntryRequest;
use App\Http\Requests\UpdatePortfolioEntryRequest;
use App\Http\Resources\PortfolioEntryResource;
use App\Models\PortfolioEntry;
use App\Models\StudentPortfolio;
use App\Models\Notification;
use App\Models\TrainingAssignment;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PortfolioEntryController extends Controller
{
    public function __construct()
    {
        // تطبيق سياسة الصلاحيات على جميع دوال الـ Resource
        $this->authorizeResource(PortfolioEntry::class, 'entry');
    }

    /**
     * عرض جميع مدخلات ملف الإنجاز (يمكن تصفيتها حسب student_portfolio_id)
     */
    public function index(Request $request)
    {
        $query = PortfolioEntry::with('studentPortfolio');
        
        if ($request->has('student_portfolio_id')) {
            $query->where('student_portfolio_id', $request->student_portfolio_id);
        }
        
        $entries = $query->latest()->paginate($request->per_page ?? 15);
        return PortfolioEntryResource::collection($entries);
    }

    /**
     * إضافة مدخل جديد إلى ملف الإنجاز
     */
    public function store(StorePortfolioEntryRequest $request)
    {
        $data = $request->validated();

        $portfolio = StudentPortfolio::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $portfolio) {
            $assignmentId = $request->user()->currentTrainingAssignment()?->id;
            try {
                $portfolio = StudentPortfolio::create([
                    'user_id' => $request->user()->id,
                    'training_assignment_id' => $assignmentId,
                ]);
            } catch (QueryException $exception) {
                if ($assignmentId === null) {
                    return response()->json([
                        'message' => 'لا يمكن إضافة مدخل قبل وجود تعيين تدريبي للطالب.',
                    ], 422);
                }

                throw $exception;
            }
        }

        $data['student_portfolio_id'] = $portfolio->id;

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('portfolio', 'public');
        }

        $entry = PortfolioEntry::create($data);

        // إشعار المشرف الأكاديمي عند إضافة مدخل جديد في ملف الإنجاز
        $this->notifyAcademicSupervisor($portfolio, $entry, 'created');

        return new PortfolioEntryResource($entry);
    }

    /**
     * عرض مدخل معين
     */
    public function show(PortfolioEntry $entry)
    {
        return new PortfolioEntryResource($entry->load('studentPortfolio'));
    }

    /**
     * تحديث مدخل موجود
     */
    public function update(UpdatePortfolioEntryRequest $request, PortfolioEntry $entry)
    {
        $data = $request->validated();
        
        // حذف الملف المرفق إذا طُلب
        if ($request->boolean('remove_file') && $entry->file_path) {
            Storage::disk('public')->delete($entry->file_path);
            $data['file_path'] = null;
        }
        
        // رفع ملف جديد إذا وُجد
        if ($request->hasFile('file')) {
            // حذف الملف القديم إن وجد
            if ($entry->file_path) {
                Storage::disk('public')->delete($entry->file_path);
            }
            $data['file_path'] = $request->file('file')->store('portfolio', 'public');
        }
        
        $entry->update($data);

        // إشعار المشرف الأكاديمي عند تحديث مدخل في ملف الإنجاز
        $this->notifyAcademicSupervisor($entry->studentPortfolio, $entry, 'updated');

        return new PortfolioEntryResource($entry);
    }

    /**
     * حذف مدخل
     */
    public function destroy(PortfolioEntry $entry)
    {
        // حذف الملف المرتبط من التخزين
        if ($entry->file_path) {
            Storage::disk('public')->delete($entry->file_path);
        }
        $entry->delete();
        return response()->json(['message' => 'تم حذف المدخل بنجاح.']);
    }

    /**
     * إشعار المشرف الأكاديمي عند تحديث ملف الإنجاز
     */
    private function notifyAcademicSupervisor(StudentPortfolio $portfolio, PortfolioEntry $entry, string $action): void
    {
        // الحصول على المشرف الأكاديمي من خلال تعيين التدريب
        $academicSupervisor = null;
        
        if ($portfolio->trainingAssignment) {
            $academicSupervisor = $portfolio->trainingAssignment->academicSupervisor;
        } else {
            // محاولة الحصول على المشرف الأكاديمي من خلال قسم الطالب إذا لم يوجد تعيين تدريب
            $student = $portfolio->user;
            if ($student && $student->department_id) {
                $academicSupervisor = \App\Models\User::whereHas('role', function ($q) {
                    $q->where('name', 'academic_supervisor');
                })->where('department_id', $student->department_id)->first();
            }
        }

        if (!$academicSupervisor) {
            return; // لا يوجد مشرف أكاديمي للإشعار
        }

        $student = $portfolio->user;
        $actionText = $action === 'created' ? 'إضافة' : 'تحديث';
        $message = "تم {$actionText} مدخل جديد في ملف إنجاز الطالب: {$student->name} - {$entry->title}";

        Notification::create([
            'user_id' => $academicSupervisor->id,
            'type' => 'portfolio_update',
            'message' => $message,
            'notifiable_type' => PortfolioEntry::class,
            'notifiable_id' => $entry->id,
            'data' => [
                'student_id' => $student->id,
                'student_name' => $student->name,
                'portfolio_entry_id' => $entry->id,
                'entry_title' => $entry->title,
                'action' => $action,
            ],
        ]);
    }
}