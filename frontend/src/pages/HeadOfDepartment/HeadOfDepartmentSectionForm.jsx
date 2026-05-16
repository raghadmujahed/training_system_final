import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSection, createSection, updateSection, getUsers, getActiveTrainingPeriod } from "../../services/api";
import { useCourses } from "../../hooks/useSharedData";
import useAppToast from "../../hooks/useAppToast";
import { apiCache } from "../../services/apiCache";
import { hasFormChanged } from "../../utils/formChanged";

export default function HeadOfDepartmentSectionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useAppToast();
  const [loading, setLoading] = useState(false);
  const { data: courses } = useCourses();

  const [supervisors, setSupervisors] = useState([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [activePeriod, setActivePeriod] = useState(null);
  const originalRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    academic_year: new Date().getFullYear(),
    academic_supervisor_id: "",
    semester: "first",
    course_id: "",
    capacity: 30,
  });
  const [errors, setErrors] = useState({});

  // ── Fetch active training period (create mode only) ───────────────────
  useEffect(() => {
    if (id) return;
    getActiveTrainingPeriod()
      .then((res) => {
        // API returns { data: { id, name, academic_year, semester, is_active, status, ... } }
        // getActiveTrainingPeriod() does res.data (axios), so res here = { data: {...} }
        const period = res?.data ?? res;
        const isValid = period && period.id && (period.is_active !== false);
        if (isValid) {
          setActivePeriod(period);
          setForm((prev) => ({
            ...prev,
            academic_year: period.academic_year || prev.academic_year,
            semester: period.semester || prev.semester,
          }));
        }
      })
      .catch(() => {});
  }, [id]);

  // ── Load section data for edit ────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    getSection(id)
      .then((sectionData) => {
        const loaded = {
          name: sectionData.name,
          academic_year: sectionData.academic_year,
          academic_supervisor_id: sectionData.academic_supervisor_id || "",
          semester: sectionData.semester,
          course_id: sectionData.course_id,
          capacity: sectionData.capacity || 30,
        };
        originalRef.current = loaded;
        setForm(loaded);
      })
      .catch(() => {});
  }, [id]);

  // ── Load supervisors filtered by course department ────────────────────
  useEffect(() => {
    if (!form.course_id) {
      setSupervisors([]);
      return;
    }
    const selectedCourse = courses.find((c) => String(c.id) === String(form.course_id));
    const deptId = selectedCourse?.department_id;
    if (!deptId) {
      setSupervisors([]);
      return;
    }
    setSupervisorsLoading(true);
    getUsers({ role: "academic_supervisor", department_id: deptId, per_page: 200 })
      .then((res) => setSupervisors(res.data || []))
      .catch(() => setSupervisors([]))
      .finally(() => setSupervisorsLoading(false));
  }, [form.course_id, courses]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "course_id") {
      setForm((prev) => ({
        ...prev,
        course_id: value,
        academic_supervisor_id: "",
        department_id: courses.find((c) => String(c.id) === String(value))?.department_id || "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.name || !form.name.trim()) {
      newErrors.name = "اسم الشعبة مطلوب";
    }
    if (!form.course_id) {
      newErrors.course_id = "المساق مطلوب";
    }
    if (!form.academic_year || Number(form.academic_year) < 2000) {
      newErrors.academic_year = "السنة الأكاديمية مطلوبة";
    }
    if (!form.semester) {
      newErrors.semester = "الفصل الدراسي مطلوب";
    }
    if (!form.academic_supervisor_id) {
      newErrors.academic_supervisor_id = "يجب تعيين مشرف أكاديمي للشعبة قبل إنشائها";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!validateForm()) {
      toast.error("يرجى تصحيح الأخطاء في النموذج");
      return;
    }

    if (id && !hasFormChanged(originalRef.current, form)) {
      toast.info("لم تقم بتغيير أي بيانات");
      return;
    }

    setLoading(true);
    try {
      // Never send null/undefined/empty for academic_supervisor_id
      const submitData = {
        ...form,
        academic_supervisor_id: Number(form.academic_supervisor_id),
      };

      if (id) {
        await updateSection(id, submitData);
        toast.success("تم تحديث الشعبة بنجاح");
      } else {
        await createSection(submitData);
        toast.success("تم إضافة الشعبة بنجاح");
      }
      apiCache.invalidate("sections:list");
      navigate("/head-department/reports");
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 422 && data?.errors) {
        setErrors(data.errors);
        const periodErr = data.errors?.training_period?.[0];
        toast.error(periodErr || data.message || "يرجى التحقق من البيانات المدخلة");
      } else if (status === 403) {
        toast.error(data?.message || "لا تملك صلاحية تنفيذ هذه العملية");
      } else {
        toast.error(data?.message || "حدث خطأ أثناء حفظ الشعبة");
      }
    } finally {
      setLoading(false);
    }
  };

  const errStr = (key) => {
    const e = errors[key];
    if (!e) return null;
    return Array.isArray(e) ? e[0] : e;
  };

  return (
    <div className="section-form">
      <div className="page-header">
        <h1>{id ? "تعديل شعبة" : "إضافة شعبة جديدة"}</h1>
        <button onClick={() => navigate("/head-department/reports")} className="btn-secondary">
          رجوع
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form">

        {/* Active training period banner */}
        {!id && (
          activePeriod ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
              <strong>الفترة التدريبية النشطة:</strong> {activePeriod.name}&nbsp;|&nbsp;
              السنة: {activePeriod.academic_year}&nbsp;|&nbsp;
              الفصل: {activePeriod.semester === "first" ? "الفصل الأول" : activePeriod.semester === "second" ? "الفصل الثاني" : "الفصل الصيفي"}
              <span className="block text-xs text-blue-600 mt-1">سيتم ربط الشعبة تلقائياً بهذه الفترة.</span>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-sm text-yellow-800">
              ⚠️ لا توجد فترة تدريبية نشطة حالياً. يرجى تفعيل فترة تدريبية قبل إضافة شعبة.
            </div>
          )
        )}

        {errStr("training_period") && (
          <div className="text-red-500 text-sm mb-3 p-2 bg-red-50 rounded border border-red-200">
            {errStr("training_period")}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hod-sf-name">اسم الشعبة *</label>
            <input
              id="hod-sf-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={errStr("name") ? "border-red-500" : ""}
              required
            />
            {errStr("name") && <span className="text-red-500 text-sm mt-1">{errStr("name")}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hod-sf-capacity">السعة *</label>
            <input
              id="hod-sf-capacity"
              type="number"
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              min="1"
              className={errStr("capacity") ? "border-red-500" : ""}
              required
            />
            {errStr("capacity") && <span className="text-red-500 text-sm mt-1">{errStr("capacity")}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hod-sf-academic-year">
              السنة الأكاديمية *{!id && <span className="text-text-soft text-xs"> (من الفترة النشطة)</span>}
            </label>
            <input
              id="hod-sf-academic-year"
              type="number"
              name="academic_year"
              value={form.academic_year}
              onChange={handleChange}
              className={`${errStr("academic_year") ? "border-red-500" : ""} ${!id && activePeriod ? "bg-gray-50" : ""}`}
              readOnly={!id && !!activePeriod}
              required
            />
            {errStr("academic_year") && <span className="text-red-500 text-sm mt-1">{errStr("academic_year")}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hod-sf-semester">
              الفصل الدراسي *{!id && <span className="text-text-soft text-xs"> (من الفترة النشطة)</span>}
            </label>
            {!id && activePeriod ? (
              <input
                id="hod-sf-semester"
                type="text"
                value={form.semester === "first" ? "الفصل الأول" : form.semester === "second" ? "الفصل الثاني" : "الفصل الصيفي"}
                readOnly
                className="bg-gray-50"
              />
            ) : (
              <select
                id="hod-sf-semester"
                name="semester"
                value={form.semester}
                onChange={handleChange}
                className={errStr("semester") ? "border-red-500" : ""}
              >
                <option value="first">الفصل الأول</option>
                <option value="second">الفصل الثاني</option>
                <option value="summer">الفصل الصيفي</option>
              </select>
            )}
            {errStr("semester") && <span className="text-red-500 text-sm mt-1">{errStr("semester")}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hod-sf-course-id">المساق *</label>
            <select
              id="hod-sf-course-id"
              name="course_id"
              value={form.course_id}
              onChange={handleChange}
              className={errStr("course_id") ? "border-red-500" : ""}
              required
            >
              <option value="">اختر المساق</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
            {errStr("course_id") && <span className="text-red-500 text-sm mt-1">{errStr("course_id")}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hod-sf-supervisor">
              المشرف الأكاديمي <span className="text-red-500">*</span>
            </label>

            {!form.course_id ? (
              <>
                <select disabled className="bg-gray-100">
                  <option value="">اختر المساق أولاً</option>
                </select>
                <p className="text-text-soft text-[0.9rem] my-1">اختر المساق أولاً لعرض المشرفين التابعين لقسمه</p>
              </>
            ) : supervisorsLoading ? (
              <select disabled className="bg-gray-100">
                <option value="">جاري التحميل...</option>
              </select>
            ) : supervisors.length === 0 ? (
              <>
                <select disabled className="bg-gray-100 border-red-300">
                  <option value="">لا يوجد مشرفون أكاديميون</option>
                </select>
                <p className="text-red-600 text-sm mt-1 font-medium">
                  لا يوجد مشرفون أكاديميون متاحون لهذا القسم، لا يمكن إنشاء شعبة بدون مشرف
                </p>
              </>
            ) : (
              <select
                id="hod-sf-supervisor"
                name="academic_supervisor_id"
                value={form.academic_supervisor_id}
                onChange={handleChange}
                className={errStr("academic_supervisor_id") ? "border-red-500" : ""}
                required
              >
                <option value="">اختر المشرف الأكاديمي</option>
                {supervisors.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            )}

            {errStr("academic_supervisor_id") && (
              <div className="text-red-500 text-sm mt-1">{errStr("academic_supervisor_id")}</div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || (!form.course_id ? false : supervisors.length === 0 && !id)}
          >
            {loading ? "جاري الحفظ..." : id ? "تحديث" : "إضافة"}
          </button>
          <button type="button" onClick={() => navigate("/head-department/reports")} className="btn-secondary">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
