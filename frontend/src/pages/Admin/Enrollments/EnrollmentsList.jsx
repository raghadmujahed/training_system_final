import { useEffect, useState } from "react";
import { getEnrollments, deleteEnrollment, getUsers, getSections, createEnrollment } from "../../../services/api";
import * as XLSX from "xlsx";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import PageHeader from "../../../components/common/PageHeader";
import useAppToast from "../../../hooks/useAppToast";

export default function EnrollmentsList() {
  const toast = useAppToast();
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
  // Filters state
  const [filters, setFilters] = useState({
    section_id: "",
    status: "",
    search: ""
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cleanFilters = Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== "")
        );
        const [enrollData, sectionsRes] = await Promise.all([
          getEnrollments(cleanFilters),
          getSections()
        ]);
        if (!cancelled) {
          setEnrollments(enrollData.data || enrollData || []);
          setSections(sectionsRes.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filters]);

  const fetchEnrollments = async () => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== "")
      );
      const data = await getEnrollments(cleanFilters);
      setEnrollments(data.data || data || []);
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
      toast.warning("يرجى اختيار طالب وشعبة");
      return;
    }
    setSingleLoading(true);
    try {
      // البحث عن الطالب
      const userRes = await getUsers({ email: singleEnroll.studentEmail });
      let userId;
      // البحث عن تطابق دقيق للبريد الإلكتروني
      const exactMatch = userRes.data?.find(u => u.email?.toLowerCase().trim() === singleEnroll.studentEmail?.toLowerCase().trim());
      if (exactMatch) {
        userId = exactMatch.id;
      } else if (userRes.data && userRes.data.length > 0) {
        // إذا لم يوجد تطابق دقيق، نعرض خطأ حتى لا يتم اختيار طالب خاطئ
        toast.error("لم يتم العثور على طالب بهذا البريد الإلكتروني بالضبط. يرجى التحقق من صحة البريد");
        setSingleLoading(false);
        return;
      } else {
        toast.error("الطالب غير موجود، يرجى إضافته أولاً");
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
      
      toast.success("تم التسجيل بنجاح");
      setSingleEnroll({ studentEmail: "", sectionId: "" });
      setShowModal(false);
      fetchEnrollments();
    } catch (err) {
      toast.apiError(err, "فشل التسجيل");
    } finally {
      setSingleLoading(false);
    }
  };

  // رفع ملف Excel
  const handleBulkUpload = async () => {
    if (!bulkFile) { toast.warning("اختر ملف Excel أولاً"); return; }
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
            // البحث عن تطابق دقيق للبريد الإلكتروني
            const exactMatch = userRes.data?.find(u => u.email?.toLowerCase().trim() === studentEmail?.toLowerCase().trim());
            if (exactMatch) {
              userId = exactMatch.id;
            } else if (userRes.data && userRes.data.length > 0) {
              errorList.push({ email: studentEmail, error: "لم يتم العثور على تطابق دقيق للبريد الإلكتروني" });
              continue;
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
        toast.apiError(err, "خطأ في معالجة الملف");
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
          <label className="btn-secondary ml-2.5 cursor-pointer">
            رفع تسجيلات من Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => setBulkFile(e.target.files[0])} />
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

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <select
          value={filters.section_id}
          onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
          style={{ minWidth: '200px' }}
        >
          <option value="">جميع الشعب</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name} ({section.course?.name || "—"})
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="dropped">منسحب</option>
          <option value="completed">مكتمل</option>
        </select>

        <input
          type="text"
          placeholder="بحث بالطالب..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />

        <button
          onClick={() => setFilters({ section_id: "", status: "", search: "" })}
          className="btn-secondary"
        >
          إعادة تعيين
        </button>
      </div>

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