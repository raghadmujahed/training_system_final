import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { getSections, getUsers, createUser, createEnrollment } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";

export default function BulkAddStudents() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSectionId = searchParams.get("sectionId");

  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(preselectedSectionId || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [results, setResults] = useState(null);
  const [step, setStep] = useState("form"); // form, preview, results
  const searchTimeout = useRef(null);

  // تحميل قائمة الشعب
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await getSections();
        setSections(res.data.data || res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSections();
  }, []);

  // البحث عن طالب بالاسم أو الرقم الجامعي
  const handleSearch = (query) => {
    setSearchQuery(query);
    setSelectedStudent(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getUsers({ role: 'student', search: query.trim(), per_page: 20 });
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  // إضافة الطالب المختار إلى القائمة
  const handleAddSelectedStudent = () => {
    if (!selectedSectionId) {
      toast.warning("يرجى اختيار الشعبة أولاً");
      return;
    }
    if (!selectedStudent) return;
    // التأكد من عدم إضافة نفس الطالب مرتين
    if (studentsList.some(s => s.user_id === selectedStudent.id)) {
      toast.warning("الطالب مضاف بالفعل إلى القائمة");
      return;
    }
    setStudentsList([...studentsList, { user_id: selectedStudent.id, name: selectedStudent.name, university_id: selectedStudent.university_id, section_id: selectedSectionId }]);
    setSelectedStudent(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  // رفع ملف Excel (يدعم عمود "رقم الشعبة" أو "اسم الشعبة")
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const mapped = rows.map((row) => ({
        name: row["الاسم الكامل"] || row["name"] || "",
        email: row["البريد الإلكتروني"] || row["email"] || "",
        university_id: String(row["الرقم الجامعي"] || row["university_id"] || ""),
        section_identifier: row["رقم الشعبة"] || row["اسم الشعبة"] || row["section_id"] || row["section_name"] || "",
      }));
      // تصفية الصفوف المكتملة
      const valid = mapped.filter(s => s.name && s.email && s.university_id && s.section_identifier);
      if (valid.length === 0) {
        toast.warning("الملف لا يحتوي على بيانات صحيحة. تأكد من وجود الأعمدة: الاسم، البريد، الرقم الجامعي، ورقم/اسم الشعبة");
        return;
      }
      setStudentsList(valid);
      setStep("preview");
    };
    reader.readAsArrayBuffer(file);
  };

  // دالة لحل معرف الشعبة من المعرف النصي (رقم أو اسم)
  const resolveSectionId = (identifier) => {
    // إذا كان identifier رقماً (id)
    if (!isNaN(identifier) && sections.find(s => s.id == identifier)) {
      return sections.find(s => s.id == identifier).id;
    }
    // إذا كان اسماً
    const section = sections.find(s => s.name == identifier);
    return section ? section.id : null;
  };

  const handleBulkEnroll = async () => {
    setLoading(true);
    let successCount = 0;
    let errors = [];

    for (const student of studentsList) {
      // تحديد section_id
      let sectionId = null;
      if (student.section_id) {
        sectionId = student.section_id;
      } else if (student.section_identifier) {
        sectionId = resolveSectionId(student.section_identifier);
        if (!sectionId) {
          errors.push(`الطالب ${student.name}: لم يتم العثور على الشعبة "${student.section_identifier}"`);
          continue;
        }
      } else {
        errors.push(`الطالب ${student.name}: لم يتم تحديد الشعبة`);
        continue;
      }

      try {
        // إذا كان الطالب مضافاً بالبحث (لديه user_id مباشرة)
        let userId = student.user_id || null;
        if (!userId) {
          // طلاب Excel - البحث عن طالب موجود بالرقم الجامعي
          const bySearch = await getUsers({ role: 'student', search: student.university_id, per_page: 5 });
          const existingList = bySearch.data || [];
          const match = existingList.find(u => u.university_id === student.university_id || u.email === student.email);
          if (match) {
            userId = match.id;
          } else if (student.email) {
            const newUser = await createUser({
              name: student.name,
              email: student.email,
              university_id: student.university_id,
              password: "12345678",
              password_confirmation: "12345678",
              role_id: 2,
              status: "active",
            });
            userId = newUser.data.id;
          } else {
            errors.push(`الطالب ${student.name}: غير موجود في النظام`);
            continue;
          }
        }
        await createEnrollment({
          user_id: userId,
          section_id: sectionId,
          academic_year: new Date().getFullYear(),
          semester: "first",
          status: "active"
        });
        successCount++;
      } catch (err) {
        errors.push(`الطالب ${student.name} (${student.email}): ${err.response?.data?.message || err.message}`);
      }
    }

    setResults({ successCount, errors, total: studentsList.length });
    setStep("results");
    setLoading(false);
  };

  const resetForm = () => {
    setStudentsList([]);
    setSelectedSectionId(preselectedSectionId || "");
    setSearchQuery("");
    setSelectedStudent(null);
    setSearchResults([]);
    setStep("form");
    setResults(null);
  };

  if (step === "results" && results) {
    return (
      <div>
        <h2>نتيجة إضافة الطلاب</h2>
        <p>تمت إضافة {results.successCount} من أصل {results.total} طالب بنجاح.</p>
        {results.errors.length > 0 && (
          <div style={{ color: "red" }}>
            <h4>الأخطاء:</h4>
            <ul>
              {results.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}
        <button onClick={resetForm} className="btn-primary">إضافة طلاب آخرين</button>
        <button onClick={() => navigate("/admin/sections")} className="btn-secondary">العودة إلى القائمة</button>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div>
        <div className="page-header">
          <h1>معاينة بيانات الطلاب ({studentsList.length})</h1>
          <button onClick={() => setStep("form")} className="btn-secondary">رجوع</button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>الاسم</th><th>البريد</th><th>الرقم الجامعي</th><th>الشعبة (معرف/اسم)</th></tr>
          </thead>
          <tbody>
            {studentsList.map((s, i) => (
              <tr key={i}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.university_id}</td>
                <td>{s.section_identifier || s.section_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="form-actions">
          <button onClick={handleBulkEnroll} disabled={loading} className="btn-primary">
            {loading ? "جاري الإضافة..." : "تأكيد الإضافة"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>إضافة طلاب إلى شعب</h1>
        <button onClick={() => navigate("/admin/sections")} className="btn-secondary">رجوع</button>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        {/* قسم الإضافة اليدوية لشعبة محددة */}
        <div style={{ flex: 1, border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
          <h3>تسجيل طالب في الشعبة</h3>
          <div className="form-group">
            <label>اختر الشعبة</label>
            <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)}>
              <option value="">-- اختر الشعبة --</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.name} (ID: {sec.id})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>البحث بالاسم أو الرقم الجامعي</label>
            <input
              type="text"
              placeholder="اكتب اسم الطالب أو رقمه الجامعي..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: "100%" }}
            />
            {searching && <p style={{ color: "#666", fontSize: "0.85rem" }}>جاري البحث...</p>}
            {searchResults.length > 0 && !selectedStudent && (
              <div style={{ border: "1px solid #ddd", maxHeight: "200px", overflowY: "auto", marginTop: "4px" }}>
                {searchResults.map(student => (
                  <div
                    key={student.id}
                    onClick={() => { setSelectedStudent(student); setSearchQuery(student.name); setSearchResults([]); }}
                    style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #eee" }}
                    onMouseEnter={e => e.target.style.background = "#f0f0f0"}
                    onMouseLeave={e => e.target.style.background = ""}
                  >
                    <strong>{student.name}</strong> — {student.university_id} {student.department?.name ? `| ${student.department.name}` : ""}
                  </div>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && !searching && !selectedStudent && (
              <p style={{ color: "#999", fontSize: "0.85rem" }}>لا توجد نتائج</p>
            )}
          </div>
          {selectedStudent && (
            <div style={{ background: "#f8f9fa", padding: "0.75rem", borderRadius: "8px", marginTop: "0.5rem" }}>
              <p><strong>الطالب:</strong> {selectedStudent.name} ({selectedStudent.university_id})</p>
              <button onClick={handleAddSelectedStudent} className="btn-primary">إضافة إلى القائمة</button>
              <button onClick={() => { setSelectedStudent(null); setSearchQuery(""); }} className="btn-secondary" style={{ marginRight: "0.5rem" }}>إلغاء</button>
            </div>
          )}
        </div>

        {/* قسم رفع ملف Excel */}
        <div style={{ flex: 2, border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
          <h3>رفع ملف Excel (لإضافة طلاب متعددين إلى شعب مختلفة)</h3>
          <p>يجب أن يحتوي الملف على الأعمدة التالية:</p>
          <ul>
            <li><strong>الاسم الكامل</strong> (name) - إجباري</li>
            <li><strong>البريد الإلكتروني</strong> (email) - إجباري</li>
            <li><strong>الرقم الجامعي</strong> (university_id) - إجباري</li>
            <li><strong>رقم الشعبة</strong> أو <strong>اسم الشعبة</strong> (section_id أو section_name) - إجباري، يمكن أن يكون رقم ID أو اسم الشعبة كما هو مسجل في النظام</li>
          </ul>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
      </div>

      {/* عرض قائمة الطلاب المضافة يدوياً */}
      {studentsList.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3>قائمة الطلاب المضافة ({studentsList.length})</h3>
          <table className="data-table">
            <thead>
              <tr><th>الاسم</th><th>الرقم الجامعي</th><th>الشعبة (ID)</th><th></th></tr>
            </thead>
            <tbody>
              {studentsList.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.name}</td>
                  <td>{s.university_id}</td>
                  <td>{s.section_id || s.section_identifier}</td>
                  <td><button onClick={() => setStudentsList(studentsList.filter((_, i) => i !== idx))}>حذف</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleBulkEnroll} disabled={loading} className="btn-primary">إضافة جميع الطلاب ({studentsList.length})</button>
        </div>
      )}
    </div>
  );
}
