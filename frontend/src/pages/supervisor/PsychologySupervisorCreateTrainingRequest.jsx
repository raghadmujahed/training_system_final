import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  apiClient,
  createTrainingRequest,
  unwrapSupervisorList,
} from "../../services/api";
import { useTrainingSites, useTrainingPeriods } from "../../hooks/useSharedData";
import EmptyState from "../../components/common/EmptyState";


export default function PsychologySupervisorCreateTrainingRequest() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [students, setStudents] = useState([]);
  const { data: sites } = useTrainingSites({ per_page: 300 });
  const { data: periods } = useTrainingPeriods({ per_page: 50 });

  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [trackMode, setTrackMode] = useState("school");
  const [siteId, setSiteId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [directorate, setDirectorate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (periods.length > 0 && !periodId) {
      setPeriodId(String(periods[0].id));
    }
  }, [periods, periodId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const stRes = await apiClient.get("/supervisor/students", { params: { per_page: 200 } });
        if (cancelled) return;
        setStudents(unwrapSupervisorList(stRes.data));
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || "فشل تحميل بيانات الطلاب");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
      <LoadingSpinner size="page" text="جاري التحميل..." />
    );
  }

  return (
    <div>
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="flex-1">
            <h1 className="hero-title">إنشاء طلب تدريب — علم النفس</h1>
            <p className="hero-subtitle">
              يُنشأ الطلب باسمك كمشرف أكاديمي للقسم؛ بعد الاعتماد المبدئي يمكن تجميعه وإرساله للجهة الرسمية (مديرية التربية أو وزارة الصحة حسب نوع الجهة).
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p className="m-0">{error}</p>
        </div>
      )}
      {success && (
        <div className="alert-custom alert-success mb-3">
          <p className="m-0">{success}</p>
          <Link to="/supervisor/psychology/training-requests" className="inline-block mt-2 font-bold">
            الانتقال إلى طلبات التدريب والدفعات →
          </Link>
        </div>
      )}

      <div className="section-card">
        <form onSubmit={handleSubmit} className="grid gap-4 max-w-[560px]">
          <label>
            <span className="block font-bold mb-[6px]">الطالب</span>
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
            <span className="block font-bold mb-[6px]">مسار التدريب</span>
            <div className="flex gap-4">
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
            <span className="block font-bold mb-[6px]">جهة التدريب</span>
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
              <span className="block font-bold mb-[6px]">المديرية</span>
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
            <span className="block font-bold mb-[6px]">فترة التدريب</span>
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

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="block font-bold mb-[6px]">بداية التدريب</span>
              <input className="form-control-custom" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label>
              <span className="block font-bold mb-[6px]">نهاية التدريب</span>
              <input className="form-control-custom" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </label>
          </div>

          <button type="submit" className="btn-primary-custom inline-flex items-center gap-2" disabled={saving}>
            {saving ? <LoadingSpinner size="button" /> : <ArrowRight size={18} />}
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
