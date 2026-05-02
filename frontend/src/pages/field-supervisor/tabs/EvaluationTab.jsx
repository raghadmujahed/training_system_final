import { useState } from "react";
import {
  useStudentEvaluation,
  useEvaluationTemplates,
} from "../../../hooks/useFieldSupervisorApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  Save,
  Send,
  CheckCircle,
  AlertTriangle,
  FileText,
  AlertCircle,
  Check,
} from "lucide-react";

/**
 * تبويب التقييم الميداني مع دعم النماذج الديناميكية
 */
export default function EvaluationTab({ studentId, labels }) {
  const { data, loading, error, refresh, saveDraft, submit } = useStudentEvaluation(studentId);
  const { templates } = useEvaluationTemplates();

  const [scores, setScores] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  const template = data?.template || {};
  const evaluation = data?.evaluation || {};
  const criteria = template.criteria || [];
  const isEditable = evaluation?.is_editable !== false && !evaluation?.is_final;
  const totalScore = evaluation?.total_score || 0;
  const grade = evaluation?.grade_label;

  // تحديث الدرجة
  const handleScoreChange = (criterionId, value) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: parseInt(value) || 0,
    }));
  };

  // حساب الدرجة الإجمالية
  const calculateTotal = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  };

  const currentTotal = calculateTotal();
  const maxScore = template.total_score || 100;
  const progressPercentage = (currentTotal / maxScore) * 100;

  // حفظ مسودة
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await saveDraft({
        scores,
        general_notes: generalNotes,
        strengths,
        areas_for_improvement: areasForImprovement,
        template_id: template.id,
      });
      setSuccess("draft");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      // Error handled
    } finally {
      setSaving(false);
    }
  };

  // إرسال التقييم النهائي
  const handleSubmit = async () => {
    // التحقق من إكمال جميع البنود
    const missingCriteria = criteria.filter((c) => !scores[c.id] && scores[c.id] !== 0);
    if (missingCriteria.length > 0) {
      alert("الرجاء تقييم جميع البنود قبل الإرسال");
      return;
    }

    if (!confirm("هل أنت متأكد من إرسال التقييم النهائي؟ لا يمكن التعديل بعد الإرسال.")) {
      return;
    }

    setSubmitting(true);
    try {
      await submit({
        scores,
        general_notes: generalNotes,
        strengths,
        areas_for_improvement: areasForImprovement,
        template_id: template.id,
      });
      setSuccess("submitted");
      setTimeout(() => setSuccess(null), 3000);
      refresh();
    } catch {
      // Error handled
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <EvaluationSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // إذا كان التقييم مكتمل (نهائي)
  if (evaluation?.is_final) {
    return (
      <EvaluationResult
        evaluation={evaluation}
        template={template}
        criteria={criteria}
        labels={labels}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* حالة النجاح */}
      {success === "draft" && (
        <Alert className="bg-blue-50 border-blue-200">
          <Check className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            تم حفظ المسودة بنجاح
          </AlertDescription>
        </Alert>
      )}
      {success === "submitted" && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            تم إرسال التقييم النهائي بنجاح
          </AlertDescription>
        </Alert>
      )}

      {/* معلومات التقييم */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            {labels.evaluation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
            <div>
              <p className="text-sm text-gray-600">حالة التقييم</p>
              <Badge
                className={
                  evaluation?.status === "draft"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {evaluation?.status_label || "لم يبدأ"}
              </Badge>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-600">الدرجة المتوقعة</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentTotal} / {maxScore}
              </p>
            </div>
          </div>

          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* نموذج التقييم */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">بنود التقييم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {criteria.length === 0 ? (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                لا يوجد قالب تقييم مفعل. يرجى التواصل مع الإدارة.
              </AlertDescription>
            </Alert>
          ) : (
            criteria.map((criterion) => (
              <div key={criterion.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium text-gray-900">
                    {criterion.label}
                    {criterion.weight && (
                      <span className="text-sm text-gray-500 mr-2">
                        ({criterion.weight}%)
                      </span>
                    )}
                  </Label>
                  <span className="text-lg font-bold text-blue-600">
                    {scores[criterion.id] || 0}
                  </span>
                </div>

                {criterion.description && (
                  <p className="text-sm text-gray-500 mb-3">{criterion.description}</p>
                )}

                {/* مقياس التقييم */}
                <div className="flex gap-2">
                  {(criterion.scale || [1, 2, 3, 4, 5]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleScoreChange(criterion.id, value)}
                      disabled={!isEditable}
                      className={`
                        w-10 h-10 rounded-lg font-medium transition-colors
                        ${
                          scores[criterion.id] === value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                        ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ملاحظات إضافية */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">ملاحظات عامة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="eval-strengths">نقاط القوة</Label>
            <Textarea
              id="eval-strengths"
              name="strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="اشرح نقاط القوة في أداء الطالب..."
              disabled={!isEditable}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="eval-improvements">مجالات التحسين</Label>
            <Textarea
              id="eval-improvements"
              name="areas_for_improvement"
              value={areasForImprovement}
              onChange={(e) => setAreasForImprovement(e.target.value)}
              placeholder="اشرح مجالات تحسين الأداء..."
              disabled={!isEditable}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="eval-notes">ملاحظات عامة</Label>
            <Textarea
              id="eval-notes"
              name="general_notes"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="أضف أي ملاحظات إضافية..."
              disabled={!isEditable}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* أزرار الإجراءات */}
      {isEditable && (
        <div className="flex gap-3">
          <Button
            onClick={handleSaveDraft}
            disabled={saving || criteria.length === 0}
            variant="outline"
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "جاري الحفظ..." : "حفظ مسودة"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || criteria.length === 0}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4" />
            {submitting ? "جاري الإرسال..." : "إرسال التقييم النهائي"}
          </Button>
        </div>
      )}

      {!isEditable && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            لا يمكن تعديل التقييم بعد إرساله نهائياً
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * عرض نتيجة التقييم المكتمل (read-only)
 */
function EvaluationResult({ evaluation, template, criteria, labels }) {
  const scores = evaluation.scores || {};
  const totalScore = evaluation.total_score || 0;
  const maxScore = template.total_score || 100;
  const percentage = (totalScore / maxScore) * 100;

  const getGradeColor = () => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* النتيجة النهائية */}
      <Card className="border-green-200">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              تم إرسال التقييم النهائي
            </h2>
            <p className="text-gray-600 mb-4">
              تم إرسال التقييم الميداني بنجاح ولا يمكن التعديل
            </p>

            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">الدرجة الإجمالية</p>
                <p className={`text-4xl font-bold ${getGradeColor()}`}>
                  {totalScore}
                </p>
                <p className="text-sm text-gray-500">من {maxScore}</p>
              </div>
              <div className="h-16 w-px bg-gray-300" />
              <div className="text-center">
                <p className="text-sm text-gray-500">التقدير</p>
                <p className={`text-2xl font-bold ${getGradeColor()}`}>
                  {evaluation.grade_label || evaluation.grade}
                </p>
              </div>
            </div>
          </div>

          <Progress value={percentage} className="h-2 mt-4" />
        </CardContent>
      </Card>

      {/* تفاصيل البنود */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">تفاصيل تقييم البنود</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{criterion.label}</p>
                  {criterion.weight && (
                    <p className="text-sm text-gray-500">({criterion.weight}%)</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-600">
                    {scores[criterion.id] || 0}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600">
                    {criterion.max_score || 5}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* الملاحظات */}
      {(evaluation.strengths || evaluation.areas_for_improvement || evaluation.general_notes) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ملاحظات التقييم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evaluation.strengths && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">نقاط القوة</h4>
                <p className="text-green-700">{evaluation.strengths}</p>
              </div>
            )}
            {evaluation.areas_for_improvement && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-1">
                  مجالات التحسين
                </h4>
                <p className="text-yellow-700">{evaluation.areas_for_improvement}</p>
              </div>
            )}
            {evaluation.general_notes && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-1">ملاحظات عامة</h4>
                <p className="text-gray-700">{evaluation.general_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Loading
// ═══════════════════════════════════════════════════════════════════════════
function EvaluationSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
