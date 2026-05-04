import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getSchoolManagerMentorRequests,
  getSchoolManagerTeachers,
  itemsFromPagedResponse,
  schoolManagerApproveRequest,
} from "../../services/api";
import { siteLabels } from "../../utils/roles";
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
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to load mentor assignment data:", error);
      const errMsg = getApiErrorMessage(error, error?.message || "خطأ غير معروف");
      const errStatus = error?.response?.status;
      setErrorMessage(`تعذر تحميل بيانات التعيين. ${errStatus ? `(HTTP ${errStatus}) ` : ""}${errMsg}`);
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
    setSavedMessage("");
  };

  const handleFieldSupervisorChange = (studentRowId, fsIdVal) => {
    setRows((prev) =>
      prev.map((row) =>
        row.studentRowId === studentRowId ? { ...row, fieldSupervisorId: fsIdVal } : row
      )
    );
    setSavedMessage("");
  };

  const handleNotesChange = (studentRowId, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.studentRowId === studentRowId ? { ...row, notes: value } : row
      )
    );
    setSavedMessage("");
  };

  const handleRequestApprove = async (requestId) => {
    const requestRows = rowsByRequest[requestId] || [];
    if (!requestRows.length) return;

    const hasUnassigned = requestRows.some((row) => !row.mentorId);
    if (hasUnassigned) {
      setErrorMessage(`يجب تعيين ${labels.mentorLabel} لكل طالب قبل اعتماد الطلب.`);
      return;
    }

    try {
      setSavingRequestId(requestId);
      setSavedMessage("");
      setErrorMessage("");
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
      setSavedMessage("تم اعتماد الطلب وتعيين المشرف الميداني بنجاح.");
      await fetchData();
    } catch (error) {
      console.error("Failed to approve request:", error);
      setErrorMessage(getApiErrorMessage(error, "تعذر اعتماد الطلب."));
    } finally {
      setSavingRequestId(null);
    }
  };

  const handleRequestReject = async (requestId) => {
    const reason = window.prompt("اكتب سبب الرفض:");
    if (!reason?.trim()) return;

    try {
      setSavingRequestId(requestId);
      setSavedMessage("");
      setErrorMessage("");
      await schoolManagerApproveRequest(requestId, {
        status: "rejected",
        rejection_reason: reason.trim(),
      });
      setSavedMessage("تم رفض الطلب وتسجيل السبب.");
      await fetchData();
    } catch (error) {
      console.error("Failed to reject request:", error);
      setErrorMessage(getApiErrorMessage(error, "تعذر رفض الطلب."));
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "3rem", color: "var(--text-soft)" }}>
        <Loader2 size={28} className="spin" />
        {"جاري تحميل طلبات التدريب..."}
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%)" }}>
            <ClipboardList size={44} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">{labels.requestTitle}</h1>
            <p className="hero-subtitle">
              {"راجع بيانات كل طالب، عيّن "}{labels.mentorLabel}{"، ثم اعتمد الطلب أو ارفضه مع توضيح السبب"}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { title: "إجمالي الطلبات", value: requests.length, icon: FileText, color: "#3b82f6", bg: "#dbeafe" },
          { title: "طلبات معلقة", value: pendingCount, icon: Clock, color: "#f59e0b", bg: "#fef3c7" },
          { title: "إجمالي الطلبة", value: totalStudents, icon: Users, color: "#8b5cf6", bg: "#ede9fe" },
          { title: "تم تعيين مشرف ميداني", value: assignedCount, icon: CheckCircle2, color: "#10b981", bg: "#d1fae5" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ background: "#fff", borderRadius: "16px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "14px", background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{card.title}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Messages */}
      {savedMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#d1fae5", color: "#059669", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <CheckCircle2 size={18} /> {savedMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.75rem 1rem", background: "#fee2e2", color: "#dc2626", borderRadius: 12, fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {/* Empty State */}
      {requests.length === 0 ? (
        <div className="section-card" style={{ padding: "3rem", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
          <ClipboardList size={56} style={{ marginBottom: "1rem", opacity: 0.3, color: "#94a3b8" }} />
          <h3 style={{ margin: "0 0 0.5rem", color: "#64748b", fontSize: "1.1rem" }}>{"لا توجد طلبات حاليًا"}</h3>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
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
            ...(siteType === "school" ? ["حساب المشرف في المنصة (اختياري)"] : []),
            "ملاحظات",
          ];
          const emptyColSpan = siteType === "school" ? 7 : 6;

          const isHighlighted = highlightedId === req.id;
          return (
            <div
              key={req.id}
              ref={(el) => { if (el) cardRefs.current[req.id] = el; }}
              className="section-card mb-4"
              style={{
                padding: "1.5rem",
                borderRadius: "16px",
                border: isHighlighted ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                boxShadow: isHighlighted ? "0 0 0 4px rgba(245, 158, 11, 0.2)" : undefined,
                transition: "all 0.4s ease",
              }}
            >
              {/* Request Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "10px", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>
                      {"طلب تدريب #"}{req.id}{req.letter_number ? ` — ${req.letter_number}` : ""}
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>
                      {site?.name && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Building2 size={13} /> {site.name}
                        </span>
                      )}
                      {site?.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <MapPin size={13} /> {site.location}
                        </span>
                      )}
                      {site?.directorate && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <School size={13} /> {site.directorate}
                        </span>
                      )}
                      {period?.name && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Clock size={13} /> {period.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600, background: "#fef3c7", color: "#d97706" }}>
                    <Clock size={14} /> {req.book_status_label || req.book_status}
                  </span>
                  <button type="button" onClick={() => handleRequestApprove(req.id)} disabled={isSaving}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.5rem 1rem", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}
                  >
                    {isSaving ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                    {labels.approveBtn}
                  </button>
                  <button type="button" onClick={() => handleRequestReject(req.id)} disabled={isSaving}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.5rem 1rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer" }}
                  >
                    <XCircle size={14} /> {"رفض الطلب"}
                  </button>
                </div>
              </div>

              {/* Students Table */}
              <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {tableHeadCells.map((h) => (
                        <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reqRows.length === 0 ? (
                      <tr>
                        <td colSpan={emptyColSpan} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                          {"لا يوجد طلاب مرتبطون بهذا الطلب"}
                        </td>
                      </tr>
                    ) : (
                      reqRows.map((student, idx) => {
                        const mentorRole = student.mentorId
                          ? teachers.find((t) => String(t.id) === String(student.mentorId))?.role?.name
                          : null;
                        const showPlatformFs =
                          siteType === "school" &&
                          mentorRole &&
                          ["teacher", "adviser"].includes(mentorRole);

                        return (
                        <tr key={student.studentRowId} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ width: 32, height: 32, borderRadius: "8px", background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <User size={14} />
                              </div>
                              <span style={{ fontWeight: 600 }}>{student.studentName}</span>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                            {student.universityId}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#64748b" }}>
                              <GraduationCap size={13} /> {student.specialization}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.25rem 0.625rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: "#dbeafe", color: "#2563eb" }}>
                              {student.status}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", minWidth: 200 }}>
                            <select value={student.mentorId} onChange={(e) => handleMentorChange(student.studentRowId, e.target.value)}
                              style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: student.mentorId ? "1px solid #10b981" : "1px solid #e2e8f0", fontSize: "0.8rem", background: student.mentorId ? "#f0fdf4" : "#f8fafc", outline: "none" }}
                            >
                              <option value="">{labels.mentorSelect}</option>
                              {teachers.map((mentor) => (
                                <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
                              ))}
                            </select>
                          </td>
                          {siteType === "school" ? (
                            <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", minWidth: 200 }}>
                              {showPlatformFs ? (
                                <select
                                  value={student.fieldSupervisorId}
                                  onChange={(e) =>
                                    handleFieldSupervisorChange(student.studentRowId, e.target.value)
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "0.375rem 0.5rem",
                                    borderRadius: 6,
                                    border: student.fieldSupervisorId ? "1px solid #6366f1" : "1px solid #e2e8f0",
                                    fontSize: "0.8rem",
                                    background: student.fieldSupervisorId ? "#eef2ff" : "#f8fafc",
                                    outline: "none",
                                  }}
                                >
                                  <option value="">{"— اختياري —"}</option>
                                  {platformFieldSupervisors.map((fs) => (
                                    <option key={fs.id} value={fs.id}>
                                      {fs.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{"—"}</span>
                              )}
                            </td>
                          ) : null}
                          <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", minWidth: 180 }}>
                            <textarea value={student.notes} onChange={(e) => handleNotesChange(student.studentRowId, e.target.value)}
                              placeholder={"ملاحظات (اختياري)"} rows={2}
                              style={{ width: "100%", padding: "0.375rem 0.5rem", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.8rem", background: "#f8fafc", resize: "vertical", outline: "none" }}
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
