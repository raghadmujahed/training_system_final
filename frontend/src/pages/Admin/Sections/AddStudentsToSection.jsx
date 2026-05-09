import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEnrollment, getUsers, createUser } from "../../../services/api";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/ui/Button";

export default function AddStudentsToSection() {
  const toast = useAppToast();
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
      toast.success("تم تسجيل الطالب في الشعبة بنجاح");
      setSelectedStudent(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      toast.apiError(err, "فشل تسجيل الطالب");
    } finally {
      setLoading(false);
    }
  };

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
        const students = rows.map(row => ({
          name: row["الاسم الكامل"] || row["name"] || "",
          email: row["البريد الإلكتروني"] || row["email"] || "",
          university_id: String(row["الرقم الجامعي"] || row["university_id"] || ""),
        })).filter(s => s.name && s.email && s.university_id);

        if (students.length === 0) throw new Error("لا توجد بيانات صالحة");

        const successList = [], errorList = [];
        for (const s of students) {
          try {
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
        if (successList.length) toast.success(`تمت إضافة ${successList.length} طالب بنجاح`);
      } catch (err) {
        toast.apiError(err, "خطأ في معالجة الملف");
      } finally {
        setBulkLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <>
      <PageHeader title={`إضافة طلاب إلى الشعبة #${sectionId}`} />

      {/* البحث عن طالب وتسجيله */}
      <fieldset className="border border-[#ccc] p-4 rounded-lg mb-6">
        <legend className="font-bold">تسجيل طالب في الشعبة</legend>
        <div className="mb-4">
          <label className="block mb-1 text-text-soft text-[0.9rem]">البحث بالاسم أو الرقم الجامعي</label>
          <input
            type="text"
            placeholder="اكتب اسم الطالب أو رقمه الجامعي..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />
          {searching && <p className="text-text-soft text-[0.85rem]">جاري البحث...</p>}
          {searchResults.length > 0 && !selectedStudent && (
            <div className="border border-[#ddd] max-h-[200px] overflow-y-auto mt-1">
              {searchResults.map(student => (
                <div
                  key={student.id}
                  onClick={() => { setSelectedStudent(student); setSearchQuery(student.name); setSearchResults([]); }}
                  className="px-3 py-2 cursor-pointer border-b border-[#eee] hover:bg-[#f0f0f0] transition-colors"
                >
                  <strong>{student.name}</strong> — {student.university_id} {student.department?.name ? `| ${student.department.name}` : ""}
                </div>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && !searching && !selectedStudent && (
            <p className="text-text-faint text-[0.85rem]">لا توجد نتائج</p>
          )}
        </div>
        {selectedStudent && (
          <div className="bg-[#f8f9fa] p-4 rounded-lg mt-2">
            <p><strong>الطالب المختار:</strong> {selectedStudent.name} ({selectedStudent.university_id})</p>
            <div className="flex gap-2 mt-2">
              <Button onClick={handleEnrollSelected} disabled={loading}>
                {loading ? "جاري التسجيل..." : "تسجيل في الشعبة"}
              </Button>
              <Button variant="outline" onClick={() => { setSelectedStudent(null); setSearchQuery(""); }}>إلغاء</Button>
            </div>
          </div>
        )}
      </fieldset>

      {/* رفع Excel */}
      <fieldset className="border border-[#ccc] p-4 rounded-lg">
        <legend className="font-bold">رفع ملف Excel (عدة طلاب)</legend>
        <p className="text-text-soft text-[0.88rem]">الأعمدة المطلوبة: الاسم الكامل، البريد الإلكتروني، الرقم الجامعي</p>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="my-2" />
        <Button onClick={processExcel} disabled={bulkLoading} className="mt-2">
          {bulkLoading ? "جاري الرفع..." : "رفع وإضافة"}
        </Button>
        {results && (
          <div className="mt-3">
            <div className="text-success font-bold">✅ نجح: {results.success.length}</div>
            {results.errors.length > 0 && (
              <div className="text-danger font-bold">❌ فشل: {results.errors.map(e => e.email).join(", ")}</div>
            )}
          </div>
        )}
      </fieldset>
    </>
  );
}
