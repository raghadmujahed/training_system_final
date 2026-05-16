import { useEffect, useState } from "react";
import {
  getSchoolTeachers,
  getTeacherAssignmentHistory,
  getAvailableTeachers,
  assignTeacherToSchool,
  endTeacherAssignment,
} from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { Users, UserPlus, Calendar, X, AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";

export default function SchoolTeachers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Form states
  const [addForm, setAddForm] = useState({
    teacher_id: "",
    start_date: "",
    academic_year: new Date().getFullYear().toString(),
    notes: "",
  });

  const [endForm, setEndForm] = useState({
    end_date: "",
    reason: "",
    notes: "",
  });

  useEffect(() => {
    fetchTeachers();
    fetchAssignmentHistory();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getSchoolTeachers();
      const list = Array.isArray(response?.data) ? response.data : [];
      setTeachers(list);
      if (list.length === 0 && response?.message) {
        setError(response.message);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "تعذر تحميل معلمي المدرسة، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentHistory = async () => {
    try {
      const response = await getTeacherAssignmentHistory();
      setAssignmentHistory(response.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAvailableTeachers = async () => {
    try {
      const response = await getAvailableTeachers();
      setAvailableTeachers(response.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTeacher = async () => {
    setError("");
    setSuccess("");

    if (!addForm.teacher_id || !addForm.start_date) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      const response = await assignTeacherToSchool(addForm);
      setSuccess(response.message || "تمت إضافة المعلم إلى مدرستك بنجاح.");
      setShowAddModal(false);
      setAddForm({
        teacher_id: "",
        start_date: "",
        academic_year: new Date().getFullYear().toString(),
        notes: "",
      });
      fetchTeachers();
      fetchAssignmentHistory();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ أثناء إضافة المعلم");
    }
  };

  const handleEndAssignment = async () => {
    setError("");
    setSuccess("");

    if (!endForm.end_date) {
      setError("يرجى تحديد تاريخ الانتهاء");
      return;
    }

    try {
      const response = await endTeacherAssignment(selectedTeacher.id, endForm);
      setSuccess(response.message || "تم إنهاء تعيين المعلم بنجاح.");
      setShowEndModal(false);
      setEndForm({ end_date: "", reason: "", notes: "" });
      setSelectedTeacher(null);
      fetchTeachers();
      fetchAssignmentHistory();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ أثناء إنهاء التعيين");
    }
  };

  const openAddModal = () => {
    fetchAvailableTeachers();
    setShowAddModal(true);
  };

  const openEndModal = (teacher) => {
    setSelectedTeacher(teacher);
    setShowEndModal(true);
  };

  const openHistoryModal = () => {
    setShowHistoryModal(true);
  };

  if (loading) {
    return <LoadingSpinner size="page" text="جاري تحميل معلمي المدرسة..." />;
  }

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="content-header-icon">
          <Users size={26} />
        </div>
        <div className="content-header-content">
          <h1 className="page-title">معلمو المدرسة</h1>
          <p className="page-subtitle">إدارة معلمي مدرستك</p>
        </div>
      </div>

      {error && (
        <div className="section-card mb-4 p-4 border-r-4 border-r-[#EF4444] bg-[#FEF2F2]">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-[#EF4444]" />
            <p className="text-[#EF4444]">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="section-card mb-4 p-4 border-r-4 border-r-[#10B981] bg-[#F0FDF4]">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-[#10B981]" />
            <p className="text-[#10B981]">{success}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="section-card mb-6 p-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-[#142a42] text-white rounded-lg hover:bg-[#1e3a5a] transition-colors flex items-center gap-2"
          >
            <UserPlus size={18} />
            إضافة معلم للمدرسة
          </button>
          <button
            onClick={openHistoryModal}
            className="px-4 py-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors flex items-center gap-2"
          >
            <FileText size={18} />
            عرض السجل
          </button>
        </div>
      </div>

      {/* Current Teachers Table */}
      <div className="section-card">
        <div className="p-5">
          <h3 className="text-lg font-bold text-[#1e293b] mb-4">المعلمون الحاليون</h3>
          
          {teachers.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-[#94a3b8] mb-4" />
              <p className="text-[#64748b]">لا يوجد معلمون مضافون لهذه المدرسة حالياً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    <th className="p-3 text-right font-semibold text-[#1e293b]">اسم المعلم</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">البريد الإلكتروني</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">الرقم الجامعي</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">تاريخ البدء</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">السنة الأكاديمية</th>
                    <th className="p-3 text-right font-semibold text-[#1e293b]">الحالة</th>
                    <th className="p-3 text-center font-semibold text-[#1e293b]">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b border-[#e2e8f0]">
                      <td className="p-3 font-medium">{teacher.name}</td>
                      <td className="p-3">{teacher.email}</td>
                      <td className="p-3">{teacher.university_id}</td>
                      <td className="p-3">{teacher.start_date}</td>
                      <td className="p-3">{teacher.academic_year}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-[#D1FAE5] text-[#065F46]">
                          نشط
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEndModal(teacher)}
                            className="px-3 py-1 text-sm bg-[#FEE2E2] text-[#991B1B] rounded hover:bg-[#FECACA] transition-colors"
                          >
                            إنهاء التعيين
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#1e293b]">إضافة معلم للمدرسة</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#64748b] hover:text-[#1e293b]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  المعلم *
                </label>
                <select
                  value={addForm.teacher_id}
                  onChange={(e) => setAddForm({ ...addForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="">اختر المعلم</option>
                  {availableTeachers.length === 0 ? (
                    <option value="" disabled>
                      لا يوجد معلمون متاحون بدون مدرسة حالياً
                    </option>
                  ) : (
                    availableTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} - {teacher.university_id}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  تاريخ البدء *
                </label>
                <input
                  type="date"
                  value={addForm.start_date}
                  onChange={(e) => setAddForm({ ...addForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  السنة الأكاديمية
                </label>
                <input
                  type="text"
                  value={addForm.academic_year}
                  onChange={(e) => setAddForm({ ...addForm, academic_year: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddTeacher}
                disabled={availableTeachers.length === 0}
                className="px-4 py-2 bg-[#142a42] text-white rounded-lg hover:bg-[#1e3a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Assignment Modal */}
      {showEndModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#1e293b]">إنهاء تعيين المعلم</h3>
              <button
                onClick={() => setShowEndModal(false)}
                className="text-[#64748b] hover:text-[#1e293b]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-[#64748b]">
                المعلم: <span className="font-medium text-[#1e293b]">{selectedTeacher.name}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  تاريخ الانتهاء *
                </label>
                <input
                  type="date"
                  value={endForm.end_date}
                  onChange={(e) => setEndForm({ ...endForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  السبب
                </label>
                <select
                  value={endForm.reason}
                  onChange={(e) => setEndForm({ ...endForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="">اختر السبب</option>
                  <option value="نقل إلى مدرسة أخرى">نقل إلى مدرسة أخرى</option>
                  <option value="لم يعد يعمل في المدرسة">لم يعد يعمل في المدرسة</option>
                  <option value="خطأ في التعيين">خطأ في التعيين</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={endForm.notes}
                  onChange={(e) => setEndForm({ ...endForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEndModal(false)}
                className="px-4 py-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleEndAssignment}
                className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                تأكيد إنهاء التعيين
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#1e293b]">سجل تعيينات المعلمين</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[#64748b] hover:text-[#1e293b]"
              >
                <X size={20} />
              </button>
            </div>

            {assignmentHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-[#94a3b8] mb-4" />
                <p className="text-[#64748b]">لا يوجد سجل تعيينات حالياً</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className="p-3 text-right font-semibold text-[#1e293b]">اسم المعلم</th>
                      <th className="p-3 text-right font-semibold text-[#1e293b]">تاريخ البدء</th>
                      <th className="p-3 text-right font-semibold text-[#1e293b]">تاريخ الانتهاء</th>
                      <th className="p-3 text-right font-semibold text-[#1e293b]">السنة الأكاديمية</th>
                      <th className="p-3 text-right font-semibold text-[#1e293b]">الحالة</th>
                      <th className="p-3 text-right font-semibold text-[#1e293b]">السبب</th>
                      <th className="p-3 text-right font-semibold text-[#1e293b]">ملاحظات</th>
                      <th className="p-3 text-right font-semibold text-[#1e293b]">تاريخ الإضافة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentHistory.map((assignment) => (
                      <tr key={assignment.id} className="border-b border-[#e2e8f0]">
                        <td className="p-3 font-medium">{assignment.teacher?.name}</td>
                        <td className="p-3">{assignment.start_date}</td>
                        <td className="p-3">{assignment.end_date || "—"}</td>
                        <td className="p-3">{assignment.academic_year}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              assignment.status === "active"
                                ? "bg-[#D1FAE5] text-[#065F46]"
                                : "bg-[#FEE2E2] text-[#991B1B]"
                            }`}
                          >
                            {assignment.status === "active" ? "نشط" : "منتهي"}
                          </span>
                        </td>
                        <td className="p-3">{assignment.reason || "—"}</td>
                        <td className="p-3">{assignment.notes || "—"}</td>
                        <td className="p-3">{assignment.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
