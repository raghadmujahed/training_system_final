<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationTemplate extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description', 'form_type', 'target_role', 'department_key'];

    private static array $targetRoleLabels = [
        'teacher' => 'نموذج المعلم المرشد',
        'academic_supervisor' => 'نموذج المشرف الأكاديمي',
        'psychologist' => 'نموذج الأخصائي النفسي',
        'school_manager' => 'نموذج مدير المدرسة',
        'principal' => 'نموذج مدير المدرسة',
    ];
    private static array $departmentLabels = [
        'psychology' => 'قسم علم النفس',
        'usool_tarbiah' => 'قسم أصول التربية',
    ];

    public function getTargetRoleLabelAttribute(): string
    {
        return static::$targetRoleLabels[$this->target_role] ?? 'نموذج عام';
    }

    public function getDepartmentLabelAttribute(): string
    {
        return static::$departmentLabels[$this->department_key] ?? 'عام';
    }

    public function items()
    {
        return $this->hasMany(EvaluationItem::class, 'template_id');
    }

    public function evaluations()
    {
        return $this->hasMany(Evaluation::class);
    }
}