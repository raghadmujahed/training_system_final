import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { createSection, getUsers } from "../../../services/api";
import { useCourses } from "../../../hooks/useSharedData";
import useAppToast from "../../../hooks/useAppToast";

export default function ImportSections() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sectionsData, setSectionsData] = useState([]);
  const { data: courses } = useCourses();
  const [supervisors, setSupervisors] = useState([]);
  const [step, setStep] = useState(1); // 1: رفع ملف, 2: معاينة وتأكيد
  const [results, setResults] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // جلب المشرفين عند الحاجة فقط (المساقات محملة مسبقاً عبر useCourses)
    try {
      const supervisorsRes = await getUsers({ role_id: 7 });
      setSupervisors(supervisorsRes.data || []);
    } catch (err) {
      console.error("خطأ في تحميل المشرفين", err);
      toast.error("حدث خطأ أثناء تحميل البيانات الأساسية");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const mapped = rows.map((row) => ({
        name: row["اسم الشعبة"] || row["name"] || "",
        course_name: row["المساق"] || row["course_name"] || "",
        academic_year: row["السنة الأكاديمية"] || row["academic_year"] || new Date().getFullYear(),
        semester: row["الفصل"] === "الثاني" ? "second" : "first",
        academic_supervisor_name: row["المشرف الأكاديمي"] || row["supervisor_name"] || "",
      }));
      setSectionsData(mapped.filter(s => s.name && s.course_name));
      setStep(2);
    };
    reader.readAsArrayBuffer(file);
  };

  const findCourseId = (courseName) => {
    const course = courses.find(c => c.name === courseName);
    return course ? course.id : null;
  };

  const findSupervisorId = (supervisorName) => {
    const sup = supervisors.find(s => s.name === supervisorName);
    return sup ? sup.id : null;
  };

  const handleImport = async () => {
    setLoading(true);
    let successCount = 0;
    let errors = [];

    for (const sec of sectionsData) {
      const courseId = findCourseId(sec.course_name);
      if (!courseId) {
        errors.push(`الشعبة "${sec.name}": لم يتم العثور على المساق "${sec.course_name}"`);
        continue;
      }
      const supervisorId = findSupervisorId(sec.academic_supervisor_name);
      if (sec.academic_supervisor_name && !supervisorId) {
        errors.push(`الشعبة "${sec.name}": لم يتم العثور على المشرف "${sec.academic_supervisor_name}"`);
        continue;
      }

      try {
        await createSection({
          name: sec.name,
          academic_year: sec.academic_year,
          semester: sec.semester,
          course_id: courseId,
          academic_supervisor_id: supervisorId || null,
        });
        successCount++;
      } catch (err) {
        errors.push(`الشعبة "${sec.name}": ${err.response?.data?.message || err.message}`);
      }
    }

    setResults({ successCount, errors });
    setLoading(false);
  };

  const reset = () => {
    setStep(1);
    setSectionsData([]);
    setResults(null);
  };

  if (results) {
    return (
      <div>
        <h2>نتيجة الاستيراد</h2>
        <p>تم إضافة {results.successCount} شعبة بنجاح.</p>
        {results.errors.length > 0 && (
          <div style={{ color: "red" }}>
            <h4>الأخطاء:</h4>
            <ul>
              {results.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}
        <button onClick={reset} className="btn-primary">استيراد ملف آخر</button>
        <button onClick={() => navigate("/admin/sections")} className="btn-secondary">العودة إلى القائمة</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>استيراد شعب من ملف Excel</h1>
        <button onClick={() => navigate("/admin/sections")} className="btn-secondary">رجوع</button>
      </div>

      {step === 1 && (
        <div>
          <p>يرجى رفع ملف Excel يحتوي على الأعمدة التالية (يمكن تسمية الأعمدة بالعربية أو الإنجليزية):</p>
          <ul>
            <li><strong>اسم الشعبة</strong> (name) - إجباري</li>
            <li><strong>المساق</strong> (course_name) - إجباري، يجب أن يكون موجوداً مسبقاً</li>
            <li><strong>السنة الأكاديمية</strong> (academic_year) - اختياري، افتراضي السنة الحالية</li>
            <li><strong>الفصل</strong> (semester) - إما "الأول" أو "الثاني"، افتراضي "الأول"</li>
            <li><strong>المشرف الأكاديمي</strong> (supervisor_name) - اختياري، يجب أن يكون موجوداً مسبقاً</li>
          </ul>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
      )}

      {step === 2 && (
        <div>
          <h3>معاينة البيانات ({sectionsData.length} شعبة)</h3>
          <table className="data-table">
            <thead>
              <tr><th>اسم الشعبة</th><th>المساق</th><th>السنة</th><th>الفصل</th><th>المشرف</th></tr>
            </thead>
            <tbody>
              {sectionsData.map((s, i) => (
                <tr key={i}>
                  <td>{s.name}</td>
                  <td>{s.course_name}</td>
                  <td>{s.academic_year}</td>
                  <td>{s.semester === "first" ? "الأول" : "الثاني"}</td>
                  <td>{s.academic_supervisor_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-actions">
            <button onClick={handleImport} disabled={loading} className="btn-primary">
              {loading ? "جاري الاستيراد..." : "تأكيد الاستيراد"}
            </button>
            <button onClick={() => setStep(1)} className="btn-secondary">تغيير الملف</button>
          </div>
        </div>
      )}
    </div>
  );
}
