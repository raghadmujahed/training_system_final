import { useState } from "react";
import { useStudentAttendance } from "../../../hooks/useFieldSupervisorApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Info,
  Save,
  Check,
} from "lucide-react";

/**
 * تبويب الحضور والغياب
 */
export default function AttendanceTab({ studentId }) {
  const { data, loading, error, refresh, recordAttendance } = useStudentAttendance(studentId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "present",
    check_in: "",
    check_out: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (loading) {
    return <AttendanceSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    try {
      await recordAttendance(formData);
      setSuccess(true);
      setShowForm(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const todayStatus = data?.today_status || "not_recorded";
  const canRecordToday = data?.can_record_today !== false;
  const calendar = data?.calendar || [];
  const records = data?.records || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* حالة اليوم */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            حالة حضور اليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                تم تسجيل الحضور بنجاح
              </AlertDescription>
            </Alert>
          )}

          {todayStatus === "not_recorded" ? (
            <div className="text-center py-6">
              <Info className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">لم يتم تسجيل حضور اليوم بعد</p>
              {canRecordToday && (
                <Button onClick={() => setShowForm(!showForm)}>
                  {showForm ? "إلغاء" : "تسجيل حضور اليوم"}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {todayStatus === "present" && (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">حاضر</p>
                      <p className="text-sm text-gray-500">تم تسجيل الحضور اليوم</p>
                    </div>
                  </>
                )}
                {todayStatus === "absent" && (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="font-medium text-gray-900">غائب</p>
                      <p className="text-sm text-gray-500">تم تسجيل الغياب اليوم</p>
                    </div>
                  </>
                )}
                {todayStatus === "late" && (
                  <>
                    <Clock className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="font-medium text-gray-900">متأخر</p>
                      <p className="text-sm text-gray-500">تم تسجيل التأخر اليوم</p>
                    </div>
                  </>
                )}
              </div>
              <Badge variant="outline" className="text-sm">
                تم التسجيل
              </Badge>
            </div>
          )}

          {/* نموذج التسجيل */}
          {showForm && canRecordToday && (
            <form onSubmit={handleSubmit} className="mt-6 border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="attendance-date">التاريخ</Label>
                  <Input
                    id="attendance-date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendance-status">الحالة</Label>
                  <Select
                    id="attendance-status"
                    name="status"
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">حاضر</SelectItem>
                      <SelectItem value="absent">غائب</SelectItem>
                      <SelectItem value="late">متأخر</SelectItem>
                      <SelectItem value="excused">مُعذر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.status !== "absent" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="check-in">وقت الدخول</Label>
                      <Input
                        id="check-in"
                        name="check_in"
                        type="time"
                        value={formData.check_in}
                        onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="check-out">وقت الخروج</Label>
                      <Input
                        id="check-out"
                        name="check_out"
                        type="time"
                        value={formData.check_out}
                        onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="attendance-notes">ملاحظات</Label>
                  <Input
                    id="attendance-notes"
                    name="notes"
                    placeholder="ملاحظات إضافية..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={submitting} className="gap-2">
                  <Save className="w-4 h-4" />
                  {submitting ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* تقويم الحضور */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">تقويم الحضور الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            {calendar.map((day) => (
              <div
                key={day.date}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-lg text-sm
                  ${day.is_today ? "ring-2 ring-blue-500" : ""}
                  ${day.status === "present" ? "bg-green-100 text-green-800" : ""}
                  ${day.status === "absent" ? "bg-red-100 text-red-800" : ""}
                  ${day.status === "late" ? "bg-yellow-100 text-yellow-800" : ""}
                  ${day.is_weekend ? "bg-gray-50" : "bg-white border"}
                  ${!day.status && !day.is_weekend ? "bg-white border" : ""}
                `}
              >
                <span className="font-medium">{day.day}</span>
                {day.status && (
                  <span className="text-xs mt-1">
                    {day.status === "present" && "✓"}
                    {day.status === "absent" && "✗"}
                    {day.status === "late" && "⌚"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* مفتاح الألوان */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100" />
              <span>حاضر</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100" />
              <span>غائب</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100" />
              <span>متأخر</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-50" />
              <span>عطلة</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* سجل الحضور */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">سجل الحضور</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا يوجد سجل حضور مسجل</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">التاريخ</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">الحالة</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">الدخول</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">الخروج</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">ملاحظات</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">{record.date}</td>
                      <td className="py-3 px-2">
                        <Badge
                          className={
                            record.status === "present"
                              ? "bg-green-100 text-green-800"
                              : record.status === "absent"
                              ? "bg-red-100 text-red-800"
                              : record.status === "late"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {record.status === "present" && "حاضر"}
                          {record.status === "absent" && "غائب"}
                          {record.status === "late" && "متأخر"}
                          {record.status === "excused" && "مُعذر"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm">{record.check_in || "—"}</td>
                      <td className="py-3 px-2 text-sm">{record.check_out || "—"}</td>
                      <td className="py-3 px-2 text-sm text-gray-600">{record.notes || "—"}</td>
                      <td className="py-3 px-2">
                        {record.is_locked ? (
                          <Badge variant="outline" className="text-xs">
                            مُغلق
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            قابل للتعديل
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Loading
// ═══════════════════════════════════════════════════════════════════════════
function AttendanceSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
