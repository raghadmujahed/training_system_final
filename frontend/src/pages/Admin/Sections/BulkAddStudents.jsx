import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { getSections, getUsers, createUser, createEnrollment } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/ui/Button";

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
      <>
        <PageHeader title="نتيجة إضافة الطلاب" />
        <p className="text-text">تمت إضافة {results.successCount} من أصل {results.total} طالب بنجاح.</p>
        {results.errors.length > 0 && (
          <div className="text-danger">
            <h4 className="font-bold">الأخطاء:</h4>
            <ul className="list-disc pr-4">
              {results.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <Button onClick={resetForm}>إضافة طلاب آخرين</Button>
          <Button variant="outline" onClick={() => navigate("/admin/sections")}>العودة إلى القائمة</Button>
        </div>
      </>
    );
  }

  if (step === "preview") {
    return (
      <>
        <PageHeader title={`معاينة بيانات الطلاب (${studentsList.length})`} />
        <div className="rounded-xl overflow-hidden border border-[#e2e8f0] mb-4">
          <table className="w-full border-collapse text-[0.9rem]">
            <thead>
              <tr className="bg-[#f8fafc]"><th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الاسم</th><th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">البريد</th><th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الرقم الجامعي</th><th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الشعبة</th></tr>
            </thead>
            <tbody>
              {studentsList.map((s, i) => (
                <tr key={i} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9]">
                  <td className="py-3 px-4">{s.name}</td>
                  <td className="py-3 px-4">{s.email}</td>
                  <td className="py-3 px-4">{s.university_id}</td>
                  <td className="py-3 px-4">{s.section_identifier || s.section_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("form")}>رجوع</Button>
          <Button onClick={handleBulkEnroll} disabled={loading}>
            {loading ? "جاري الإضافة..." : "تأكيد الإضافة"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="إضافة طلاب إلى شعب" />

      <div className="flex gap-8 flex-wrap">
        {/* قسم الإضافة اليدوية لشعبة محددة */}
        <div className="flex-1 min-w-[300px] border border-[#ccc] p-4 rounded-lg">
          <h3 className="font-bold text-text mb-3">تسجيل طالب في الشعبة</h3>
          <div className="mb-4">
            <label className="block mb-1 text-text-soft text-[0.9rem]">اختر الشعبة</label>
            <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} className="w-full">
              <option value="">-- اختر الشعبة --</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.name} (ID: {sec.id})</option>
              ))}
            </select>
          </div>
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
            <div className="bg-[#f8f9fa] p-3 rounded-lg mt-2">
              <p><strong>الطالب:</strong> {selectedStudent.name} ({selectedStudent.university_id})</p>
              <div className="flex gap-2 mt-2">
                <Button onClick={handleAddSelectedStudent}>إضافة إلى القائمة</Button>
                <Button variant="outline" onClick={() => { setSelectedStudent(null); setSearchQuery(""); }}>إلغاء</Button>
              </div>
            </div>
          )}
        </div>

        {/* قسم رفع ملف Excel */}
        <div className="flex-[2] min-w-[300px] border border-[#ccc] p-4 rounded-lg">
          <h3 className="font-bold text-text mb-3">رفع ملف Excel (لإضافة طلاب متعددين إلى شعب مختلفة)</h3>
          <p className="text-text-soft text-[0.88rem]">يجب أن يحتوي الملف على الأعمدة التالية:</p>
          <ul className="list-disc pr-5 text-text-soft text-[0.88rem]">
            <li><strong>الاسم الكامل</strong> (name) - إجباري</li>
            <li><strong>البريد الإلكتروني</strong> (email) - إجباري</li>
            <li><strong>الرقم الجامعي</strong> (university_id) - إجباري</li>
            <li><strong>رقم الشعبة</strong> أو <strong>اسم الشعبة</strong> (section_id أو section_name) - إجباري</li>
          </ul>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="mt-2" />
        </div>
      </div>

      {/* عرض قائمة الطلاب المضافة يدوياً */}
      {studentsList.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-text mb-3">قائمة الطلاب المضافة ({studentsList.length})</h3>
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0] mb-4">
            <table className="w-full border-collapse text-[0.9rem]">
              <thead>
                <tr className="bg-[#f8fafc]"><th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الاسم</th><th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الرقم الجامعي</th><th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الشعبة</th><th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]"></th></tr>
              </thead>
              <tbody>
                {studentsList.map((s, idx) => (
                  <tr key={idx} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9]">
                    <td className="py-3 px-4">{s.name}</td>
                    <td className="py-3 px-4">{s.university_id}</td>
                    <td className="py-3 px-4">{s.section_id || s.section_identifier}</td>
                    <td className="py-3 px-4"><button className="text-danger hover:underline" onClick={() => setStudentsList(studentsList.filter((_, i) => i !== idx))}>حذف</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={handleBulkEnroll} disabled={loading}>إضافة جميع الطلاب ({studentsList.length})</Button>
        </div>
      )}
    </>
  );
}
