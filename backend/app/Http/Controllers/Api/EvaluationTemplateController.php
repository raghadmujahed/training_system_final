<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEvaluationTemplateRequest;
use App\Http\Requests\UpdateEvaluationTemplateRequest;
use App\Http\Requests\StoreEvaluationItemRequest;
use App\Http\Requests\UpdateEvaluationItemRequest;
use App\Http\Resources\EvaluationTemplateResource;
use App\Models\EvaluationTemplate;
use App\Models\EvaluationItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class EvaluationTemplateController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(EvaluationTemplate::class, 'evaluation_template');
    }

    public function index(Request $request)
    {
        $query = EvaluationTemplate::with('items');
        if ($request->has('form_type')) $query->where('form_type', $request->form_type);
        if (Schema::hasColumn('evaluation_templates', 'department_key') && $request->has('department_key')) {
            $query->where('department_key', $request->department_key);
        }

        // فلترة حسب الدور المستهدف
        if ($request->has('target_role')) {
            $query->where('target_role', $request->target_role);
        }

        // إذا لم يحدد target_role وكان المستخدم مقيمًا، نعرض قوالب دوره + القوالب العامة
        if (!$request->has('target_role') && $request->has('for_my_role')) {
            $role = $request->user()->role?->name;
            $query->where(function ($q) use ($role) {
                $q->where('target_role', $role)
                  ->orWhereNull('target_role');
            });
        }

        $templates = $query->paginate($request->per_page ?? 15);
        return EvaluationTemplateResource::collection($templates);
    }

    public function store(StoreEvaluationTemplateRequest $request)
    {
        $payload = $request->validated();
        if (! Schema::hasColumn('evaluation_templates', 'department_key')) {
            unset($payload['department_key']);
        }
        $template = EvaluationTemplate::create($payload);
        return new EvaluationTemplateResource($template);
    }

    public function show(EvaluationTemplate $evaluationTemplate)
    {
        return new EvaluationTemplateResource($evaluationTemplate->load('items'));
    }

    public function update(UpdateEvaluationTemplateRequest $request, EvaluationTemplate $evaluationTemplate)
    {
        $payload = $request->validated();
        if (! Schema::hasColumn('evaluation_templates', 'department_key')) {
            unset($payload['department_key']);
        }
        $evaluationTemplate->fill($payload);
        if (!$evaluationTemplate->isDirty()) {
            return response()->json(['status' => 'no_changes', 'message' => 'لم تقم بتغيير أي بيانات']);
        }
        $evaluationTemplate->save();
        return new EvaluationTemplateResource($evaluationTemplate);
    }

    public function destroy(EvaluationTemplate $evaluationTemplate)
    {
        $evaluationTemplate->delete();
        return response()->json(['message' => 'تم حذف القالب']);
    }

    // إدارة بنود القالب
    public function addItem(StoreEvaluationItemRequest $request, EvaluationTemplate $evaluationTemplate)
    {
        $item = $evaluationTemplate->items()->create($request->validated());
        return response()->json($item, 201);
    }

    public function updateItem(UpdateEvaluationItemRequest $request, EvaluationItem $item)
    {
        $item->fill($request->validated());
        if (!$item->isDirty()) {
            return response()->json(['status' => 'no_changes', 'message' => 'لم تقم بتغيير أي بيانات']);
        }
        $item->save();
        return response()->json($item);
    }

    public function deleteItem(EvaluationItem $item)
    {
        $item->delete();
        return response()->json(['message' => 'تم حذف البند']);
    }
}