import { useEffect, useState } from "react";
import { getEnrollments, deleteEnrollment, getUsers, getSections, createEnrollment } from "../../../services/api";
import * as XLSX from "xlsx";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function EnrollmentsList() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  // بيانات التسجيل الفردي
  const [singleEnroll, setSingleEnroll] = useState({ studentEmail: "", sectionId: "" });
  const [sections, setSections] = useState([]);
  const [singleLoading, setSingleLoading] = useState(false);

  useEffect(() => {
    fetchEnrollments();
    fetchSections();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const data = await getEnrollments();
      setEnrollments(data.data || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const sectionsRes = await getSections();
      setSections(sectionsRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا التسجيل؟")) {
      await deleteEnrollment(id);
      fetchEnrollments();
    }
  };

  // إضافة تسجيل فردي
  const handleSingleEnroll = async (e) => {
    e.preventDefault();
    if (!singleEnroll.studentEmail || !singleEnroll.sectionId) {
      alert("يرجى اختيار طالب وشعبة");
      return;
    }
    setSingleLoading(true);
    try {
      // البحث عن الطالب
      const userRes = await getUsers({ email: singleEnroll.studentEmail });
      let userId;
      if (userRes.data && userRes.data.length > 0) {
        userId = userRes.data[0].id;
      } else {
        alert("الطالب غير موجود، يرجى إضافته أولاً");
        setSingleLoading(false);
        return;
      }
      
      // إنشاء تسجيل جديد باستخدام createEnrollment
      const section = sections.find(s => s.id === parseInt(singleEnroll.sectionId));
      await createEnrollment({
        user_id: userId,
        section_id: singleEnroll.sectionId,
        academic_year: section?.academic_year || new Date().getFullYear(),
        semester: "first",
        status: "active"
      });
      
      alert("تم التسجيل بنجاح");
      setSingleEnroll({ studentEmail: "", sectionId: "" });
      setShowModal(false);
      fetchEnrollments();
    } catch (err) {
      alert("فشل التسجيل: " + (err.response?.data?.message || err.message));
    } finally {
      setSingleLoading(false);
    }
  };

  // رفع ملف Excel
  const handleBulkUpload = async () => {
    if (!bulkFile) return alert("اختر ملف Excel أولاً");
    setBulkLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        // نتوقع أعمدة: student_email, section_name أو section_id
        const successList = [];
        const errorList = [];

        for (const row of rows) {
          const studentEmail = row["student_email"] || row["البريد الإلكتروني"] || row["email"];
          const sectionIdentifier = row["section_name"] || row["section_id"] || row["اسم الشعبة"];
          if (!studentEmail || !sectionIdentifier) {
            errorList.push({ row, error: "بيانات ناقصة (بريد الطالب أو معرف الشعبة)" });
            continue;
          }
          try {
            // البحث عن الطالب
            const userRes = await getUsers({ email: studentEmail });
            let userId;
            if (userRes.data && userRes.data.length > 0) {
              userId = userRes.data[0].id;
            } else {
              errorList.push({ email: studentEmail, error: "الطالب غير موجود" });
              continue;
            }
            // البحث عن الشعبة (إذا كان الإدخال نصاً، نبحث بالاسم)
            let sectionId;
            if (isNaN(sectionIdentifier)) {
              const sectionRes = await getSections({ name: sectionIdentifier });
              if (sectionRes.data && sectionRes.data.length > 0) {
                sectionId = sectionRes.data[0].id;
              } else {
                errorList.push({ email: studentEmail, error: `الشعبة "${sectionIdentifier}" غير موجودة` });
                continue;
              }
            } else {
              sectionId = parseInt(sectionIdentifier);
            }
            
            // إنشاء تسجيل جديد
            const section = sections.find(s => s.id === sectionId);
            await createEnrollment({
              user_id: userId,
              section_id: sectionId,
              academic_year: section?.academic_year || new Date().getFullYear(),
              semester: "first",
              status: "active"
            });
            
            successList.push({ email: studentEmail, sectionId });
          } catch (err) {
            errorList.push({ email: studentEmail, error: err.response?.data?.message || err.message });
          }
        }
        setBulkResults({ success: successList, errors: errorList });
        if (successList.length) fetchEnrollments();
      } catch (err) {
        alert("خطأ في معالجة الملف: " + err.message);
      } finally {
        setBulkLoading(false);
      }
    };
    reader.readAsArrayBuffer(bulkFile);
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  return (
    <div>
      <div className="page-header">
        <h1>إدارة التسجيلات (الطلاب في الشعب)</h1>
        <div>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ تسجيل طالب جديد</button>
          <label className="btn-secondary" style={{ marginRight: "10px", cursor: "pointer" }}>
            رفع تسجيلات من Excel
            <input type="file" accept=".xlsx, .xls" style={{ display: "none" }} onChange={(e) => setBulkFile(e.target.files[0])} />
          </label>
          {bulkFile && (
            <button onClick={handleBulkUpload} disabled={bulkLoading}>
              {bulkLoading ? "جاري..." : "بدء الرفع"}
            </button>
          )}
        </div>
      </div>

      {bulkResults && (
        <div className="bulk-results">
          <p>✅ نجح: {bulkResults.success.length}</p>
          {bulkResults.errors.length > 0 && (
            <div className="error-box">
              ❌ فشل: {bulkResults.errors.length}
              <ul>{bulkResults.errors.map((e, i) => <li key={i}>{e.email || e.row}: {e.error}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr><th>الطالب</th><th>الشعبة</th><th>المساق</th><th>السنة</th><th>الفصل</th><th>الحالة</th><th>الدرجة</th><th>الإجراءات</th></tr></thead>
        <tbody>
          {enrollments.map(en => (
            <tr key={en.id}>
              <td>{en.user?.name || en.user_id}</td>
              <td>{en.section?.name || en.section_id}</td>
              <td>{en.section?.course?.name || "—"}</td>
              <td>{en.academic_year}</td>
              <td>{en.semester === "first" ? "الأول" : en.semester === "second" ? "الثاني" : "الصيفي"}</td>
              <td>{en.status === "active" ? "نشط" : en.status === "dropped" ? "منسحب" : "مكتمل"}</td>
              <td>{en.final_grade || "—"}</td>
              <td><button onClick={() => handleDelete(en.id)} className="btn-sm danger">حذف</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* مودال إضافة تسجيل فردي */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>تسجيل طالب في شعبة</h3>
              <button onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSingleEnroll}>
              <div className="form-group">
                <label>البريد الإلكتروني للطالب</label>
                <input
                  type="email"
                  value={singleEnroll.studentEmail}
                  onChange={(e) => setSingleEnroll({ ...singleEnroll, studentEmail: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>الشعبة</label>
                <select
                  value={singleEnroll.sectionId}
                  onChange={(e) => setSingleEnroll({ ...singleEnroll, sectionId: e.target.value })}
                  required
                >
                  <option value="">اختر الشعبة</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.course?.name})</option>)}
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={singleLoading}>{singleLoading ? "جاري..." : "تسجيل"}</button>
                <button type="button" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}