import { useState } from "react";
import {
  useStudentDailyReports,
  useDailyReport,
} from "../../../hooks/useFieldSupervisorApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  Calendar,
  Paperclip,
  Check,
  RotateCcw,
} from "lucide-react";

/**
 * تبويب التقارير اليومية مع دعم النماذج الديناميكية
 */
export default function DailyReportsTab({ studentId }) {
  const { reports, loading, error, refresh } = useStudentDailyReports(studentId);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAction, setReviewAction] = useState(null); // 'confirm' or 'return'
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const { confirm, returnForEdit } = useDailyReport(selectedReportId);

  const handleReview = async () => {
    if (!selectedReportId || !reviewAction) return;

    setProcessing(true);
    try {
      if (reviewAction === "confirm") {
        await confirm(reviewComment);
      } else {
        await returnForEdit(reviewComment);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setShowReviewDialog(false);
      setReviewComment("");
      refresh();
    } catch {
      // Error handled
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <DailyReportsSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const pendingReports = reports.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  );

  return (
    <div className="space-y-6">
      {/* التقارير قيد المراجعة */}
      {pendingReports.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              تقارير بحاجة للمراجعة ({pendingReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{report.template_name}</p>
                      <p className="text-sm text-gray-500">
                        <Calendar className="w-3 h-3 inline ml-1" />
                        {report.date}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedReportId(report.id);
                      setShowReviewDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    مراجعة
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* جميع التقارير */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            سجل التقارير اليومية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                تمت العملية بنجاح
              </AlertDescription>
            </Alert>
          )}

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا يوجد تقارير مسجلة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        report.status === "confirmed"
                          ? "bg-green-100"
                          : report.status === "returned"
                          ? "bg-red-100"
                          : report.status === "submitted"
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      }`}
                    >
                      {report.status === "confirmed" ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : report.status === "returned" ? (
                        <RotateCcw className="w-6 h-6 text-red-600" />
                      ) : report.status === "submitted" ? (
                        <Clock className="w-6 h-6 text-blue-600" />
                      ) : (
                        <FileText className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{report.template_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">{report.date}</span>
                        <Badge
                          className={
                            report.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : report.status === "returned"
                              ? "bg-red-100 text-red-800"
                              : report.status === "submitted"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {report.status_label}
                        </Badge>
                        {report.has_attachments && (
                          <Paperclip className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={report.can_review ? "default" : "outline"}
                    onClick={() => {
                      setSelectedReportId(report.id);
                      setShowReviewDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    عرض
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة المراجعة */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>مراجعة التقرير اليومي</DialogTitle>
          </DialogHeader>

          <ReportReview
            reportId={selectedReportId}
            onConfirm={() => {
              setReviewAction("confirm");
              handleReview();
            }}
            onReturn={() => {
              setReviewAction("return");
              handleReview();
            }}
            comment={reviewComment}
            setComment={setReviewComment}
            processing={processing}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * مكون مراجعة التقرير مع النموذج الديناميكي
 */
function ReportReview({ reportId, onConfirm, onReturn, comment, setComment, processing }) {
  const { report, loading } = useDailyReport(reportId);

  if (loading || !report) {
    return <Skeleton className="h-64 w-full" />;
  }

  const template = report.template || {};
  const fields = template.fields || [];
  const content = report.content || {};

  const canReview = report.can_confirm || report.can_return;

  return (
    <div className="space-y-6">
      {/* معلومات التقرير */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">التاريخ:</span>
          <span>{report.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`bg-${report.status_color}-100 text-${report.status_color}-800`}>
            {report.status_label}
          </Badge>
          {report.reviewed_at && (
            <span className="text-sm text-gray-500">
              تمت المراجعة: {report.reviewed_at}
            </span>
          )}
        </div>
      </div>

      {/* محتوى التقرير - النموذج الديناميكي */}
      <div className="space-y-4">
        <h3 className="font-medium">محتوى التقرير:</h3>
        {fields.map((field) => (
          <div key={field.name} className="border-b pb-3">
            <Label className="font-medium text-gray-700">{field.label}</Label>
            <div className="mt-1 text-gray-900 bg-gray-50 p-2 rounded">
              {content[field.name] || "—"}
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <div className="text-gray-500 text-center py-4">
            لا يوجد محتوى مفصل
          </div>
        )}
      </div>

      {/* المرفقات */}
      {report.attachments?.length > 0 && (
        <div>
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            المرفقات
          </h3>
          <div className="space-y-2">
            {report.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded"
              >
                <Paperclip className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{attachment.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ملاحظات سابقة */}
      {report.supervisor_comment && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            ملاحظات المشرف
          </h4>
          <p className="text-yellow-700">{report.supervisor_comment}</p>
        </div>
      )}

      {/* نموذج المراجعة */}
      {canReview && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <Label htmlFor="review-comment">ملاحظات المراجعة</Label>
            <Textarea
              id="review-comment"
              name="review_comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="أضف ملاحظاتك هنا..."
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onConfirm}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 ml-1" />
              {processing ? "جاري الحفظ..." : "تأكيد التقرير"}
            </Button>
            <Button
              onClick={onReturn}
              disabled={processing || !comment.trim()}
              variant="destructive"
            >
              <XCircle className="w-4 h-4 ml-1" />
              إعادة للتعديل
            </Button>
          </div>
          {!comment.trim() && (
            <p className="text-sm text-red-500">
              يجب إضافة ملاحظة قبل إعادة التقرير للتعديل
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Loading
// ═══════════════════════════════════════════════════════════════════════════
function DailyReportsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
