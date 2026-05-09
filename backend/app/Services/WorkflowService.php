<?php

namespace App\Services;

use App\Models\WorkflowTemplate;
use App\Models\WorkflowInstance;
use App\Models\WorkflowApproval;
use App\Models\TrainingAssignment;
use App\Models\Enrollment;
use App\Models\TrainingPeriod;
use Illuminate\Support\Facades\DB;

class WorkflowService
{
    /**
     * بدء سير عمل لنموذج معين
     */
    public function start($model, $templateId)
    {
        $template = WorkflowTemplate::findOrFail($templateId);
        
        return DB::transaction(function () use ($model, $template) {
            // إنشاء نسخة من سير العمل
            $instance = WorkflowInstance::create([
                'workflow_template_id' => $template->id,
                'model_type' => get_class($model),
                'model_id' => $model->id,
                'initiated_by' => auth()->id(),
                'status' => 'in_progress',
            ]);

            // إنشاء سجلات الموافقات لكل خطوة
            $firstStepId = null;
            foreach ($template->steps as $step) {
                $approval = WorkflowApproval::create([
                    'workflow_instance_id' => $instance->id,
                    'workflow_step_id' => $step->id,
                    'status' => 'pending',
                ]);
                if ($step->sequence === 1) {
                    $firstStepId = $step->id;
                }
            }

            $instance->update(['current_step_id' => $firstStepId]);
            return $instance;
        });
    }

    /**
     * الموافقة على خطوة معينة
     */
    public function approve($instance, $stepId, $userId, $comments = null)
    {
        $approval = WorkflowApproval::where('workflow_instance_id', $instance->id)
            ->where('workflow_step_id', $stepId)
            ->firstOrFail();

        if ($approval->status !== 'pending') {
            throw new \Exception('هذه الخطوة تمت معالجتها مسبقاً.');
        }

        return DB::transaction(function () use ($approval, $userId, $comments, $instance) {
            $approval->update([
                'status' => 'approved',
                'approved_by' => $userId,
                'approved_at' => now(),
                'comments' => $comments,
            ]);

            // تحديث الخطوة الحالية إلى التالية
            $currentStep = $instance->template->steps->where('id', $stepId)->first();
            $nextStep = $instance->template->steps->where('sequence', $currentStep->sequence + 1)->first();

            if ($nextStep) {
                $instance->update(['current_step_id' => $nextStep->id]);
            } else {
                // اكتمل سير العمل
                $instance->update(['status' => 'approved']);
                $this->finalizeTrainingRequest($instance->model);
            }

            return $approval;
        });
    }

    /**
     * رفض خطوة معينة (ينهي سير العمل ويرفض الطلب)
     */
    public function reject($instance, $stepId, $userId, $comments)
    {
        $approval = WorkflowApproval::where('workflow_instance_id', $instance->id)
            ->where('workflow_step_id', $stepId)
            ->firstOrFail();

        return DB::transaction(function () use ($approval, $userId, $comments, $instance) {
            $approval->update([
                'status' => 'rejected',
                'approved_by' => $userId,
                'approved_at' => now(),
                'comments' => $comments,
            ]);

            $instance->update(['status' => 'rejected']);
            $instance->model->update(['status' => 'rejected']);

            return $approval;
        });
    }

    /**
     * إنشاء training_assignment بعد اكتمال الموافقات
     */
    private function finalizeTrainingRequest($trainingRequest)
    {
        $enrollment = Enrollment::where('user_id', $trainingRequest->user_id)
            ->where('status', 'active')
            ->first();

        if (!$enrollment) {
            throw new \Exception('لا يوجد تسجيل نشط لهذا الطالب');
        }

        $period = TrainingPeriod::where('is_active', true)->first();

        TrainingAssignment::create([
            'enrollment_id' => $enrollment->id,
            'training_request_id' => $trainingRequest->id,
            'training_site_id' => $trainingRequest->training_site_id,
            'training_period_id' => $period->id,
            'teacher_id' => $trainingRequest->assigned_teacher_id, // يعينه مدير المدرسة
            'academic_supervisor_id' => null,
            'coordinator_id' => $trainingRequest->sent_to_directorate_by,
            'status' => 'assigned',
            'start_date' => $trainingRequest->start_date,
            'end_date' => $trainingRequest->end_date,
        ]);
    }
}