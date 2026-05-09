import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getSchoolManagerMentorRequests,
  getSchoolManagerTeachers,
  itemsFromPagedResponse,
  schoolManagerApproveRequest,
} from "../../services/api";
import { siteLabels } from "../../utils/roles";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  User,
  GraduationCap,
  Building2,
  MapPin,
  School,
  AlertCircle,
  Save,
  X,
  FileText,
  Users,
} from "lucide-react";

const teacherId = (user) =>
  user?.id ?? user?.data?.id ?? null;

const personName = (user) =>
  user?.name ?? user?.data?.name ?? "";

const normalizeRowsFromRequest = (request) =>
  (request.students || []).map((student) => {
    const mentor = student.assigned_teacher || student.assignedTeacher;
    const mid = teacherId(mentor);
    return {
      requestId: request.id,
      studentRowId: student.id,
      studentName: personName(student.user) || "طالب غير معروف",
      universityId: student.user?.university_id || student.user?.data?.university_id || "—",
      specialization:
        student.course?.name || student.course?.data?.name || "—",
      status: student.status_label || student.status || "قيد المراجعة",
      mentorId: mid ? String(mid) : "",
      fieldSupervisorId: "",
      notes: student.notes || "",
    };
  });

const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;
  const validationErrors = responseData?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    const firstError = Object.values(validationErrors).flat().find(Boolean);
    if (firstError) return firstError;
  }

  return responseData?.message || fallbackMessage;
};

export default function MentorAssignment({ siteType = "school" }) {
  const labels = siteLabels(siteType);
  const [requests, setRequests] = useState([]);
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [savingRequestId, setSavingRequestId] = useState(null);

  // Highlight + scroll to a specific request when navigated from a notification
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const cardRefs = useRef({});
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    if (!highlightId || loading || requests.length === 0) return;
    const idNum = Number(highlightId);
    const card = cardRefs.current[idNum];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(idNum);
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      const next = new URLSearchParams(searchParams);
      next.delete("highlight");
      setSearchParams(next, { replace: true });
      return () => clearTimeout(timer);
    }
  }, [highlightId, loading, requests, searchParams, setSearchParams]);

  const rowsByRequest = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      if (!map[row.requestId]) map[row.requestId] = [];
      map[row.requestId].push(row);
    });
    return map;
  }, [rows]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestsRes, teachersRes] = await Promise.all([
        getSchoolManagerMentorRequests({ per_page: 100 }),
        getSchoolManagerTeachers(),
      ]);

      const list = itemsFromPagedResponse(requestsRes);
      setRequests(list);

      const teacherList = itemsFromPagedResponse(teachersRes);
      setTeachers(teacherList);

      setRows(list.flatMap(normalizeRowsFromRequest));
    } catch (error) {
      console.error("Failed to load mentor assignment data:", error);
      const errMsg = getApiErrorMessage(error, error?.message || "خطأ غير معروف");
      toast.error("تعذر تحميل بيانات التعيين: " + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMentorChange = (studentRowId, mentorIdVal) => {
    setRows((prev) =>
      prev.map((row) =>
        row.studentRowId === studentRowId
          ? { ...row, mentorId: mentorIdVal, fieldSupervisorId: "" }
          : row
      )
    );
  };

  const handleFieldSupervisorChange = (studentRowId, fsIdVal) => {
    setRows((prev) =>
      prev.map((row) =>
        row.studentRowId === studentRowId ? { ...row, fieldSupervisorId: fsIdVal } : row
      )
    );
  };

  const handleNotesChange = (studentRowId, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.studentRowId === studentRowId ? { ...row, notes: value } : row
      )
    );
  };

  const handleRequestApprove = async (requestId) => {
    const requestRows = rowsByRequest[requestId] || [];
    if (!requestRows.length) return;

    const hasUnassigned = requestRows.some((row) => !row.mentorId);
    if (hasUnassigned) {
      toast.warning(`يجب تعيين ${labels.mentorLabel} لكل طالب قبل اعتماد الطلب.`);
      return;
    }

    try {
      setSavingRequestId(requestId);
      await schoolManagerApproveRequest(requestId, {
        status: "approved",
        students: requestRows.map((row) => {
          const payload = {
            id: row.studentRowId,
            assigned_teacher_id: Number(row.mentorId),
          };
          if (siteType === "school" && row.fieldSupervisorId) {
            payload.field_supervisor_id = Number(row.fieldSupervisorId);
          }
          return payload;
        }),
      });
      toast.success("تم اعتماد الطلب وتعيين المشرف الميداني بنجاح.");
      await fetchData();
    } catch (error) {
      console.error("Failed to approve request:", error);
      toast.apiError(error, "تعذر اعتماد الطلب.");
    } finally {
      setSavingRequestId(null);
    }
  };

  const handleRequestReject = async (requestId) => {
    const reason = window.prompt("اكتب سبب الرفض:");
    if (!reason?.trim()) return;

    try {
      setSavingRequestId(requestId);
      await schoolManagerApproveRequest(requestId, {
        status: "rejected",
        rejection_reason: reason.trim(),
      });
      toast.success("تم رفض الطلب وتسجيل السبب.");
      await fetchData();
    } catch (error) {
      console.error("Failed to reject request:", error);
      toast.apiError(error, "تعذر رفض الطلب.");
    } finally {
      setSavingRequestId(null);
    }
  };

  const pendingCount = requests.filter(r => r.book_status === "sent_to_school").length;
  const totalStudents = rows.length;
  const assignedCount = rows.filter(r => r.mentorId).length;

  const platformFieldSupervisors = useMemo(
    () => (teachers || []).filter((u) => u.role?.name === "field_supervisor"),
    [teachers]
  );

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل طلبات التدريب..." />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon bg-gradient-to-br from-[#1e3a5f] to-[#2d5f8a]">
            <ClipboardList size={44} />
          </div>
          <div className="flex-1">
            <h1 className="hero-title">{labels.requestTitle}</h1>
            <p className="hero-subtitle">
              {"راجع بيانات كل طالب، عيّن "}{labels.mentorLabel}{"، ثم اعتمد الطلب أو ارفضه مع توضيح السبب"}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
        {[
          { title: "إجمالي الطلبات", value: requests.length, icon: FileText, color: "#3b82f6", bg: "#dbeafe" },
          { title: "طلبات معلقة", value: pendingCount, icon: Clock, color: "#f59e0b", bg: "#fef3c7" },
          { title: "إجمالي الطلبة", value: totalStudents, icon: Users, color: "#8b5cf6", bg: "#ede9fe" },
          { title: "تم تعيين مشرف ميداني", value: assignedCount, icon: CheckCircle2, color: "#10b981", bg: "#d1fae5" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 border border-[#e2e8f0] flex items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                <Icon size={24} />
              </div>
              <div>
                <div className="text-[0.8rem] text-[#94a3b8]">{card.title}</div>
                <div className="text-[1.5rem] font-extrabold text-[#1e293b]">{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>


      {/* Empty State */}
      {requests.length === 0 ? (
        <div className="section-card p-12 rounded-2xl border border-[#e2e8f0] text-center">
          <ClipboardList size={56} className="mb-4 opacity-30 text-[#94a3b8]" />
          <h3 className="m-0 mb-2 text-[#64748b] text-[1.1rem]">{"لا توجد طلبات حاليًا"}</h3>
          <p className="m-0 text-[#94a3b8] text-[0.9rem]">
            {"عند وصول كتاب من الجهة الرسمية سيظهر الطلب هنا"}
          </p>
        </div>
      ) : (
        /* Request Cards */
        requests.map((req) => {
          const site = req.training_site || req.trainingSite;
          const period = req.training_period || req.trainingPeriod;
          const reqRows = rowsByRequest[req.id] || [];
          const isSaving = savingRequestId === req.id;
          const tableHeadCells = [
            "الطالب",
            "الرقم الجامعي",
            "المساق",
            "حالة السجل",
            labels.mentorCol,
            "ملاحظات",
          ];
          const emptyColSpan = 6;

          const isHighlighted = highlightedId === req.id;
          return (
            <div
              key={req.id}
              ref={(el) => { if (el) cardRefs.current[req.id] = el; }}
              className="section-card mb-4 p-6 rounded-2xl transition-all duration-400 ease"
              style={{
                border: isHighlighted ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                boxShadow: isHighlighted ? "0 0 0 4px rgba(245, 158, 11, 0.2)" : undefined,
              }}
            >
              {/* Request Header */}
              <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-[#e2e8f0] flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h4 className="m-0 mb-1 text-[1.1rem] font-bold">
                      {"طلب تدريب #"}{req.id}{req.letter_number ? ` — ${req.letter_number}` : ""}
                    </h4>
                    <div className="flex flex-wrap gap-3 text-[0.8rem] text-[#64748b]">
                      {site?.name && (
                        <span className="flex items-center gap-1">
                          <Building2 size={13} /> {site.name}
                        </span>
                      )}
                      {site?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} /> {site.location}
                        </span>
                      )}
                      {site?.directorate && (
                        <span className="flex items-center gap-1">
                          <School size={13} /> {site.directorate}
                        </span>
                      )}
                      {period?.name && (
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {period.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-[0.375rem] py-[0.375rem] px-3 rounded-full text-[0.8rem] font-semibold bg-[#fef3c7] text-[#d97706]">
                    <Clock size={14} /> {req.book_status_label || req.book_status}
                  </span>
                  <button type="button" onClick={() => handleRequestApprove(req.id)} disabled={isSaving}
                    className="inline-flex items-center gap-1 py-2 px-4 text-white border-none rounded-lg text-[0.85rem] font-semibold"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}
                  >
                    {isSaving ? <LoadingSpinner size="button" /> : <CheckCircle2 size={14} />}
                    {labels.approveBtn}
                  </button>
                  <button type="button" onClick={() => handleRequestReject(req.id)} disabled={isSaving}
                    className="inline-flex items-center gap-1 py-2 px-4 bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] rounded-lg text-[0.85rem] font-semibold"
                    style={{ cursor: isSaving ? "not-allowed" : "pointer" }}
                  >
                    <XCircle size={14} /> {"رفض الطلب"}
                  </button>
                </div>
              </div>

              {/* Students Table */}
              <div className="rounded-xl overflow-hidden border border-[#e2e8f0]">
                <table className="w-full border-collapse text-[0.85rem]">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      {tableHeadCells.map((h) => (
                        <th key={h} className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reqRows.length === 0 ? (
                      <tr>
                        <td colSpan={emptyColSpan} className="p-8 text-center text-[#94a3b8]">
                          {"لا يوجد طلاب مرتبطون بهذا الطلب"}
                        </td>
                      </tr>
                    ) : (
                      reqRows.map((student, idx) => {
                        return (
                        <tr key={student.studentRowId} className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                          <td className="py-3 px-4 border-b border-[#e2e8f0]">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] text-[#2563eb]">
                                <User size={14} />
                              </div>
                              <span className="font-semibold">{student.studentName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-b border-[#e2e8f0] text-[#64748b]">
                            {student.universityId}
                          </td>
                          <td className="py-3 px-4 border-b border-[#e2e8f0]">
                            <span className="inline-flex items-center gap-1 text-[#64748b]">
                              <GraduationCap size={13} /> {student.specialization}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-b border-[#e2e8f0]">
                            <span className="inline-flex items-center gap-[0.375rem] py-1 px-[0.625rem] rounded-full text-[0.75rem] font-semibold bg-[#dbeafe] text-[#2563eb]">
                              {student.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-b border-[#e2e8f0] min-w-[200px]">
                            <select value={student.mentorId} onChange={(e) => handleMentorChange(student.studentRowId, e.target.value)}
                              className="w-full py-[0.375rem] px-2 rounded-md text-[0.8rem] outline-none"
                              style={{ border: student.mentorId ? "1px solid #10b981" : "1px solid #e2e8f0", background: student.mentorId ? "#f0fdf4" : "#f8fafc" }}
                            >
                              <option value="">{labels.mentorSelect}</option>
                              {teachers.map((mentor) => (
                                <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 border-b border-[#e2e8f0] min-w-[180px]">
                            <textarea value={student.notes} onChange={(e) => handleNotesChange(student.studentRowId, e.target.value)}
                              placeholder={"ملاحظات (اختياري)"} rows={2}
                              className="w-full py-[0.375rem] px-2 rounded-md border border-[#e2e8f0] text-[0.8rem] bg-[#f8fafc] resize-y outline-none"
                            />
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
