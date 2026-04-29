import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEnrollment, getUsers, createUser } from "../../../services/api";
import * as XLSX from "xlsx";

export default function AddStudentsToSection() {
  const { id: sectionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [results, setResults] = useState(null);
  const searchTimeout = useRef(null);

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

  // تسجيل الطالب المختار في الشعبة
  const handleEnrollSelected = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      await createEnrollment({
        user_id: selectedStudent.id,
        section_id: sectionId,
        academic_year: new Date().getFullYear(),
        semester: "first",
        status: "active"
      });
      alert("تم تسجيل الطالب في الشعبة بنجاح");
      setSelectedStudent(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      alert(err.response?.data?.message || "فشل تسجيل الطالب");
    } finally {
      setLoading(false);
    }
  };

  // رفع ملف Excel
  const handleFileChange = (e) => setFile(e.target.files[0]);
  const processExcel = async () => {
    if (!file) return alert("اختر ملف Excel أولاً");
    setBulkLoading(true);
    setResults(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const students = rows.map(row => ({
          name: row["الاسم الكامل"] || row["name"] || "",
          email: row["البريد الإلكتروني"] || row["email"] || "",
          university_id: String(row["الرقم الجامعي"] || row["university_id"] || ""),
        })).filter(s => s.name && s.email && s.university_id);

        if (students.length === 0) throw new Error("لا توجد بيانات صالحة");

        const successList = [], errorList = [];
        for (const s of students) {
          try {
            // البحث عن طالب موجود بالرقم الجامعي أو البريد
            let userId = null;
            const byUnivId = await getUsers({ role: 'student', search: s.university_id, per_page: 5 });
            const existingList = byUnivId.data || [];
            const match = existingList.find(u => u.university_id === s.university_id || u.email === s.email);
            if (match) {
              userId = match.id;
            } else {
              const newUser = await createUser({
                name: s.name,
                email: s.email,
                university_id: s.university_id,
                password: "12345678",
                password_confirmation: "12345678",
                role_id: 2,
                status: "active",
              });
              userId = newUser.data.id;
            }
            await createEnrollment({
              user_id: userId,
              section_id: sectionId,
              academic_year: new Date().getFullYear(),
              semester: "first",
              status: "active"
            });
            successList.push(s.email);
          } catch (err) {
            errorList.push({ email: s.email, error: err.response?.data?.message || err.message });
          }
        }
        setResults({ success: successList, errors: errorList });
        if (successList.length) alert(`تمت إضافة ${successList.length} طالب بنجاح`);
      } catch (err) {
        alert(err.message);
      } finally {
        setBulkLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="add-students-section">
      <div className="page-header">
        <h1>إضافة طلاب إلى الشعبة #{sectionId}</h1>
        <button onClick={() => navigate("/admin/sections")} className="btn-secondary">رجوع</button>
      </div>

      {/* البحث عن طالب وتسجيله */}
      <fieldset style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
        <legend style={{ fontWeight: "bold" }}>تسجيل طالب في الشعبة</legend>
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
          <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", marginTop: "0.5rem" }}>
            <p><strong>الطالب المختار:</strong> {selectedStudent.name} ({selectedStudent.university_id})</p>
            <button onClick={handleEnrollSelected} disabled={loading} className="btn-primary">
              {loading ? "جاري التسجيل..." : "تسجيل في الشعبة"}
            </button>
            <button onClick={() => { setSelectedStudent(null); setSearchQuery(""); }} className="btn-secondary" style={{ marginRight: "0.5rem" }}>إلغاء</button>
          </div>
        )}
      </fieldset>

      {/* رفع Excel */}
      <fieldset style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
        <legend style={{ fontWeight: "bold" }}>رفع ملف Excel (عدة طلاب)</legend>
        <p>الأعمدة المطلوبة: الاسم الكامل، البريد الإلكتروني، الرقم الجامعي</p>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
        <button onClick={processExcel} disabled={bulkLoading} style={{ marginTop: "0.5rem" }}>
          {bulkLoading ? "جاري الرفع..." : "رفع وإضافة"}
        </button>
        {results && (
          <div>
            <div className="success">✅ نجح: {results.success.length}</div>
            {results.errors.length > 0 && (
              <div className="error">❌ فشل: {results.errors.map(e => e.email).join(", ")}</div>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}
