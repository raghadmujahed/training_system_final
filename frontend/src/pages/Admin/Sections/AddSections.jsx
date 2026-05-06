import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSection, getUsers } from "../../../services/api";
import { useCourses } from "../../../hooks/useSharedData";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";

export default function AddSections() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { data: courses } = useCourses();
  const [supervisors, setSupervisors] = useState([]);
  const [results, setResults] = useState(null);
  const [file, setFile] = useState(null);

  // بيانات الشعبة اليدوية
  const [manualSection, setManualSection] = useState({
    name: "",
    academic_year: new Date().getFullYear(),
    course_name: "",
    semester: "first",
    academic_supervisor_name: "",
  });
  const [errors, setErrors] = useState({});

  // تحميل قائمة المشرفين (المساقات محملة مسبقاً عبر useCourses)
  useEffect(() => {
    getUsers({ role_id: 7 })
      .then((res) => setSupervisors(res.data || []))
      .catch((err) => console.error("خطأ تحميل المشرفين:", err));
  }, []);

  // دالة لإيجاد course_id من الاسم
  const findCourseId = (courseName) => {
    const course = courses.find(c => c.name === courseName);
    return course ? course.id : null;
  };

  // دالة لإيجاد supervisor_id من الاسم
  const findSupervisorId = (supervisorName) => {
    const sup = supervisors.find(s => s.name === supervisorName);
    return sup ? sup.id : null;
  };

  // إضافة شعبة يدوية
  const handleManualAdd = async (e) => {
    e.preventDefault();
    setErrors({});

    // التحقق من صحة المساق
    const courseId = findCourseId(manualSection.course_name);
    if (!courseId) {
      setErrors({ course_name: "المساق غير موجود، اختر من القائمة المقترحة" });
      return;
    }

    const supervisorId = manualSection.academic_supervisor_name
      ? findSupervisorId(manualSection.academic_supervisor_name)
      : null;
    if (manualSection.academic_supervisor_name && !supervisorId) {
      setErrors({ academic_supervisor_name: "المشرف غير موجود" });
      return;
    }

    setLoading(true);
    try {
      await createSection({
        name: manualSection.name,
        academic_year: manualSection.academic_year,
        semester: manualSection.semester,
        course_id: courseId,
        academic_supervisor_id: supervisorId,
      });
      toast.success("تمت إضافة الشعبة بنجاح");
      setManualSection({
        name: "",
        academic_year: new Date().getFullYear(),
        course_name: "",
        semester: "first",
        academic_supervisor_name: "",
      });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) setErrors(serverErrors);
      else toast.apiError(err, "فشل إضافة الشعبة");
    } finally {
      setLoading(false);
    }
  };

  const handleManualChange = (e) => {
    setManualSection({ ...manualSection, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  // رفع ملف Excel
  const handleFileChange = (e) => setFile(e.target.files[0]);

  const processExcel = async () => {
    if (!file) { toast.warning("اختر ملف Excel أولاً"); return; }
    setBulkLoading(true);
    setResults(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const sections = rows.map(row => ({
          name: row["اسم الشعبة"] || row["name"] || "",
          academic_year: row["السنة الأكاديمية"] || row["academic_year"] || new Date().getFullYear(),
          course_name: row["المساق"] || row["course_name"] || "",
          semester: row["الفصل"] === "الثاني" ? "second" : "first",
          academic_supervisor_name: row["المشرف الأكاديمي"] || row["supervisor_name"] || "",
        })).filter(s => s.name && s.course_name);

        if (sections.length === 0) throw new Error("لا توجد بيانات صالحة (تأكد من وجود اسم الشعبة والمساق)");

        const successList = [], errorList = [];
        for (const sec of sections) {
          try {
            const courseId = findCourseId(sec.course_name);
            if (!courseId) {
              errorList.push({ name: sec.name, error: `المساق "${sec.course_name}" غير موجود` });
              continue;
            }
            const supervisorId = sec.academic_supervisor_name ? findSupervisorId(sec.academic_supervisor_name) : null;
            if (sec.academic_supervisor_name && !supervisorId) {
              errorList.push({ name: sec.name, error: `المشرف "${sec.academic_supervisor_name}" غير موجود` });
              continue;
            }
            await createSection({
              name: sec.name,
              academic_year: sec.academic_year,
              semester: sec.semester,
              course_id: courseId,
              academic_supervisor_id: supervisorId,
            });
            successList.push(sec.name);
          } catch (err) {
            errorList.push({ name: sec.name, error: err.response?.data?.message || err.message });
          }
        }
        setResults({ success: successList, errors: errorList });
        if (successList.length) toast.success(`تمت إضافة ${successList.length} شعبة بنجاح`);
      } catch (err) {
        toast.apiError(err, "خطأ في معالجة الملف");
      } finally {
        setBulkLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="add-sections-page">
      <div className="page-header">
        <h1>إضافة شعب (يدوي / ملف Excel)</h1>
        <button onClick={() => navigate("/admin/sections")} className="btn-secondary">رجوع</button>
      </div>

      {/* إضافة يدوية */}
      <fieldset style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
        <legend style={{ fontWeight: "bold" }}>إضافة شعبة يدوي</legend>
        <div className="form-row">
          <div className="form-group">
            <label>اسم الشعبة *</label>
            <input type="text" name="name" value={manualSection.name} onChange={handleManualChange} required />
            {errors.name && <span className="error">{errors.name[0]}</span>}
          </div>
          <div className="form-group">
            <label>السنة الأكاديمية *</label>
            <input type="number" name="academic_year" value={manualSection.academic_year} onChange={handleManualChange} required />
            {errors.academic_year && <span className="error">{errors.academic_year[0]}</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>المساق * (اكتب اسم المساق)</label>
            <input type="text" list="courses-list" name="course_name" value={manualSection.course_name} onChange={handleManualChange} required />
            <datalist id="courses-list">
              {courses.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
            {errors.course_name && <span className="error">{errors.course_name}</span>}
          </div>
          <div className="form-group">
            <label>الفصل *</label>
            <select name="semester" value={manualSection.semester} onChange={handleManualChange}>
              <option value="first">الفصل الأول</option>
              <option value="second">الفصل الثاني</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>المشرف الأكاديمي (اختياري)</label>
          <input type="text" list="supervisors-list" name="academic_supervisor_name" value={manualSection.academic_supervisor_name} onChange={handleManualChange} />
          <datalist id="supervisors-list">
            {supervisors.map(s => <option key={s.id} value={s.name} />)}
          </datalist>
          {errors.academic_supervisor_name && <span className="error">{errors.academic_supervisor_name}</span>}
        </div>
        <button onClick={handleManualAdd} disabled={loading} className="btn-primary">
          {loading ? "جاري الإضافة..." : "إضافة شعبة"}
        </button>
      </fieldset>

      {/* رفع Excel */}
      <fieldset style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
        <legend style={{ fontWeight: "bold" }}>رفع ملف Excel (عدة شعب)</legend>
        <p>الأعمدة المطلوبة: <strong>اسم الشعبة، المساق</strong> (يجب أن يكون موجوداً مسبقاً)، السنة الأكاديمية (اختياري)، الفصل (الأول/الثاني)، المشرف الأكاديمي (اختياري - يجب أن يكون موجوداً مسبقاً)</p>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
        <button onClick={processExcel} disabled={bulkLoading} style={{ marginTop: "0.5rem" }} className="btn-secondary">
          {bulkLoading ? "جاري الرفع..." : "رفع وإضافة"}
        </button>
        {results && (
          <div style={{ marginTop: "1rem" }}>
            <div className="success" style={{ color: "green" }}>✅ نجح: {results.success.length} شعبة</div>
            {results.errors.length > 0 && (
              <div className="error" style={{ color: "red" }}>
                ❌ فشل: {results.errors.map(e => `${e.name} (${e.error})`).join("; ")}
              </div>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}
