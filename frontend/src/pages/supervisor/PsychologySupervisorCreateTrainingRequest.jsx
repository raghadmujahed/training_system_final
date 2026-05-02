import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import {
  apiClient,
  createTrainingRequest,
  getTrainingPeriods,
  getTrainingSites,
  unwrapSupervisorList,
  itemsFromPagedResponse,
} from "../../services/api";
import EmptyState from "../../components/common/EmptyState";

function unwrapPagedTrainingSites(res) {
  const raw = itemsFromPagedResponse(res?.data ?? res);
  return Array.isArray(raw) ? raw : [];
}

export default function PsychologySupervisorCreateTrainingRequest() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [students, setStudents] = useState([]);
  const [sites, setSites] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [trackMode, setTrackMode] = useState("school");
  const [siteId, setSiteId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [directorate, setDirectorate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [stRes, sitesRes, perRes] = await Promise.all([
          apiClient.get("/supervisor/students", { params: { per_page: 200 } }),
          getTrainingSites({ per_page: 300 }),
          getTrainingPeriods({ per_page: 50 }),
        ]);
        if (cancelled) return;
        setStudents(unwrapSupervisorList(stRes.data));
        setSites(unwrapPagedTrainingSites(sitesRes));
        const periodRows = itemsFromPagedResponse(perRes) || [];
        setPeriods(periodRows);
        const per0 = periodRows[0];
        if (per0?.id) setPeriodId(String(per0.id));
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || "فشل تحميل البيانات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStudent = useMemo(
    () => students.find((s) => String(s.student_id ?? s.id) === String(studentId)),
    [students, studentId]
  );

  useEffect(() => {
    if (selectedStudent?.course_id) {
      setCourseId(String(selectedStudent.course_id));
    } else {
      setCourseId("");
    }
  }, [selectedStudent]);

  const filteredSites = useMemo(() => {
    if (trackMode === "school") {
      return sites.filter((s) => String(s.site_type).toLowerCase() === "school");
    }
    return sites.filter((s) => ["health_center", "clinic", "center"].includes(String(s.site_type).toLowerCase()));
  }, [sites, trackMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!studentId || !courseId || !siteId || !periodId || !startDate || !endDate) {
      setError("أكمل جميع الحقول المطلوبة.");
      return;
    }
    if (trackMode === "school" && !directorate.trim()) {
      setError("اختر أو أدخل المديرية لمسار المدارس.");
      return;
    }
    setSaving(true);
    try {
      await createTrainingRequest({
        training_site_id: Number(siteId),
        training_period_id: Number(periodId),
        directorate: trackMode === "school" ? directorate.trim() : null,
        students: [
          {
            user_id: Number(studentId),
            course_id: Number(courseId),
            start_date: startDate,
            end_date: endDate,
            notes: "تم الإنشاء من واجهة المشرف الأكاديمي — علم النفس",
          },
        ],
      });
      setSuccess("تم إنشاء طلب التدريب وهو جاهز للتجميع والإرسال الرسمي.");
      setSiteId("");
    } catch (err) {
      setError(err?.response?.data?.message || "فشل إنشاء الطلب");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 80 }}>
        <Loader2 className="spin" size={40} />
        <p style={{ marginTop: 12, color: "var(--text-faint)" }}>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div style={{ flex: 1 }}>
            <h1 className="hero-title">إنشاء طلب تدريب — علم النفس</h1>
            <p className="hero-subtitle">
              يُنشأ الطلب باسمك كمشرف أكاديمي للقسم؛ بعد الاعتماد المبدئي يمكن تجميعه وإرساله للجهة الرسمية (مديرية التربية أو وزارة الصحة حسب نوع الجهة).
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="alert-custom alert-success mb-3">
          <p style={{ margin: 0 }}>{success}</p>
          <Link to="/supervisor/psychology/training-requests" style={{ display: "inline-block", marginTop: 8, fontWeight: 700 }}>
            الانتقال إلى طلبات التدريب والدفعات →
          </Link>
        </div>
      )}

      <div className="section-card">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, maxWidth: 560 }}>
          <label>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>الطالب</span>
            <select
              className="form-control-custom"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              <option value="">— اختر طالباً تحت إشرافك —</option>
              {students.map((s) => (
                <option key={s.student_id ?? s.id} value={s.student_id ?? s.id}>
                  {s.name} — {s.university_id}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>مسار التدريب</span>
            <div style={{ display: "flex", gap: 16 }}>
              <label>
                <input
                  type="radio"
                  name="track"
                  checked={trackMode === "school"}
                  onChange={() => {
                    setTrackMode("school");
                    setSiteId("");
                  }}
                />{" "}
                مدارس (psychology_school)
              </label>
              <label>
                <input
                  type="radio"
                  name="track"
                  checked={trackMode === "clinic"}
                  onChange={() => {
                    setTrackMode("clinic");
                    setSiteId("");
                  }}
                />{" "}
                مراكز / مصحات (psychology_clinic)
              </label>
            </div>
          </div>

          <label>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>جهة التدريب</span>
            <select
              className="form-control-custom"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              required
            >
              <option value="">— اختر موقعاً متوافقاً مع المسار —</option>
              {filteredSites.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.site_type})
                </option>
              ))}
            </select>
          </label>

          {trackMode === "school" && (
            <label>
              <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>المديرية</span>
              <select className="form-control-custom" value={directorate} onChange={(e) => setDirectorate(e.target.value)} required>
                <option value="">— اختر —</option>
                {["وسط", "شمال", "جنوب", "يطا"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>فترة التدريب</span>
            <select
              className="form-control-custom"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              required
            >
              <option value="">— فترة —</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `فترة #${p.id}`}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>بداية التدريب</span>
              <input className="form-control-custom" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label>
              <span style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>نهاية التدريب</span>
              <input className="form-control-custom" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </label>
          </div>

          <button type="submit" className="btn-primary-custom" disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {saving ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
            حفظ وإنشاء الطلب
          </button>
        </form>
      </div>

      {students.length === 0 && (
        <EmptyState title="لا طلبة ضمن إشرافك" description="تأكد من ربط الشعب بك كمشرف أكاديمي." />
      )}
    </div>
  );
}
