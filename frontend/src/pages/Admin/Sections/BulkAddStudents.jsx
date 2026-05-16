import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { getSections, getUsers, createUser, createEnrollment } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/ui/Button";
import { FileSpreadsheet, Download, Info, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

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
  const [showGuide, setShowGuide] = useState(true);
  const [fileError, setFileError] = useState("");
  const searchTimeout = useRef(null);

  const downloadTemplate = () => {
    const headers = ["الاسم الكامل", "البريد الإلكتروني", "الرقم الجامعي", "رقم الشعبة"];
    const example = ["أحمد محمد علي", "22210001@students.hebron.edu", "22210001", "1"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = [{ wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "طلاب");
    XLSX.writeFile(wb, "نموذج_تسجيل_الطلاب.xlsx");
  };

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
    setFileError("");
    if (!file) {
      setFileError("يرجى اختيار ملف Excel أولاً.");
      return;
    }
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const allowedExts = [".xlsx", ".xls"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      setFileError("يرجى رفع ملف بصيغة Excel فقط (.xlsx أو .xls).");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          setFileError("الملف فارغ أو لا يحتوي على بيانات صالحة.");
          return;
        }

        // التحقق من وجود الأعمدة المطلوبة
        const firstRow = rows[0];
        const hasName = "الاسم الكامل" in firstRow || "name" in firstRow;
        const hasEmail = "البريد الإلكتروني" in firstRow || "email" in firstRow;
        const hasUniId = "الرقم الجامعي" in firstRow || "university_id" in firstRow;
        const hasSection = "رقم الشعبة" in firstRow || "اسم الشعبة" in firstRow || "section_id" in firstRow || "section_name" in firstRow;

        const missing = [];
        if (!hasName) missing.push("الاسم الكامل");
        if (!hasEmail) missing.push("البريد الإلكتروني");
        if (!hasUniId) missing.push("الرقم الجامعي");
        if (!hasSection) missing.push("رقم الشعبة / اسم الشعبة");

        if (missing.length > 0) {
          setFileError(`لا يمكن رفع الملف لأن الأعمدة التالية غير موجودة: ${missing.join("، ")}.`);
          return;
        }

        const mapped = rows.map((row) => ({
          name: row["الاسم الكامل"] || row["name"] || "",
          email: row["البريد الإلكتروني"] || row["email"] || "",
          university_id: String(row["الرقم الجامعي"] || row["university_id"] || ""),
          section_identifier: row["رقم الشعبة"] || row["اسم الشعبة"] || row["section_id"] || row["section_name"] || "",
        }));
        // تصفية الصفوف المكتملة
        const valid = mapped.filter(s => s.name && s.email && s.university_id && s.section_identifier);
        const skipped = mapped.length - valid.length;
        if (valid.length === 0) {
          setFileError("جميع صفوف الملف تحتوي على حقول فارغة. يرجى التأكد من اكتمال البيانات في كل صف.");
          return;
        }
        if (skipped > 0) {
          toast.warning(`تم تجاهل ${skipped} صف بسبب وجود حقول إجبارية فارغة.`);
        }
        setStudentsList(valid);
        setStep("preview");
      } catch {
        setFileError("تعذر قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة.");
      }
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
    const allSuccess = results.errors.length === 0;
    const allFailed = results.successCount === 0;
    return (
      <>
        <PageHeader title="نتيجة إضافة الطلاب" />

        {/* Summary card */}
        <div className={`rounded-xl border p-5 mb-5 flex items-start gap-4 ${allFailed ? "bg-red-50 border-red-200" : allSuccess ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="mt-1">
            {allSuccess && <CheckCircle className="text-green-600" size={28} />}
            {allFailed && <XCircle className="text-red-600" size={28} />}
            {!allSuccess && !allFailed && <AlertTriangle className="text-yellow-600" size={28} />}
          </div>
          <div>
            <p className="font-bold text-[1rem] mb-1">
              {allSuccess && "تمت إضافة جميع الطلاب بنجاح"}
              {allFailed && "فشلت عملية الإضافة"}
              {!allSuccess && !allFailed && "اكتملت العملية مع بعض الأخطاء"}
            </p>
            <ul className="text-[0.9rem] list-none p-0 m-0 space-y-1">
              <li>✅ تم تسجيل <strong>{results.successCount}</strong> طالب بنجاح</li>
              {results.errors.length > 0 && <li>❌ فشل تسجيل <strong>{results.errors.length}</strong> طالب</li>}
              {results.total - results.successCount - results.errors.length > 0 && (
                <li>⏭ تم تجاهل <strong>{results.total - results.successCount - results.errors.length}</strong> سجل</li>
              )}
            </ul>
          </div>
        </div>

        {results.errors.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-white mb-5 overflow-hidden">
            <div className="bg-red-50 px-4 py-3 flex items-center gap-2 border-b border-red-200">
              <XCircle className="text-red-500" size={18} />
              <span className="font-bold text-red-700">تفاصيل الأخطاء ({results.errors.length} سجل)</span>
            </div>
            <ul className="divide-y divide-[#fde8e8]">
              {results.errors.map((err, i) => (
                <li key={i} className="px-4 py-2 text-[0.875rem] text-red-700 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button onClick={resetForm}>إضافة طلاب آخرين</Button>
          <Button variant="outline" onClick={() => navigate("/admin/sections")}>العودة إلى قائمة الشعب</Button>
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

      {/* ===== بطاقة التعليمات ===== */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 mb-6 overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-right"
          onClick={() => setShowGuide(g => !g)}
        >
          <div className="flex items-center gap-3">
            <Info className="text-blue-600 shrink-0" size={22} />
            <span className="font-bold text-blue-800 text-[0.98rem]">تعليمات ملف تسجيل الطلاب</span>
          </div>
          {showGuide ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-blue-600" />}
        </button>

        {showGuide && (
          <div className="px-5 pb-5 border-t border-blue-200 pt-4">
            <p className="text-blue-800 text-[0.9rem] mb-4">
              يرجى التأكد من أن ملف Excel يحتوي على الأعمدة المطلوبة وبنفس الأسماء الموضحة أدناه حتى يتم رفع تسجيلات الطلاب بشكل صحيح.
            </p>

            {/* جدول الأعمدة المطلوبة */}
            <h4 className="font-bold text-blue-900 mb-2 text-[0.9rem]">الأعمدة المطلوبة في ملف Excel:</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-[0.875rem] border-collapse border border-blue-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="py-2 px-3 text-right text-blue-900 border-b border-blue-200 font-semibold">اسم العمود (بالعربية)</th>
                    <th className="py-2 px-3 text-right text-blue-900 border-b border-blue-200 font-semibold">اسم العمود (بالإنجليزية)</th>
                    <th className="py-2 px-3 text-right text-blue-900 border-b border-blue-200 font-semibold">الحالة</th>
                    <th className="py-2 px-3 text-right text-blue-900 border-b border-blue-200 font-semibold">ملاحظة</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-blue-100">
                    <td className="py-2 px-3 font-medium">الاسم الكامل</td>
                    <td className="py-2 px-3 font-mono text-[0.82rem]">name</td>
                    <td className="py-2 px-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">إجباري</span></td>
                    <td className="py-2 px-3 text-[#555]">الاسم الثلاثي للطالب</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 px-3 font-medium">البريد الإلكتروني</td>
                    <td className="py-2 px-3 font-mono text-[0.82rem]">email</td>
                    <td className="py-2 px-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">إجباري</span></td>
                    <td className="py-2 px-3 text-[#555]">البريد الجامعي للطالب</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 px-3 font-medium">الرقم الجامعي</td>
                    <td className="py-2 px-3 font-mono text-[0.82rem]">university_id</td>
                    <td className="py-2 px-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">إجباري</span></td>
                    <td className="py-2 px-3 text-[#555]">رقم الطالب الجامعي الفريد</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">رقم الشعبة / اسم الشعبة</td>
                    <td className="py-2 px-3 font-mono text-[0.82rem]">section_id / section_name</td>
                    <td className="py-2 px-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">إجباري</span></td>
                    <td className="py-2 px-3 text-[#555]">الشعبة يجب أن تكون موجودة مسبقاً في النظام</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* اشتراطات الملف */}
            <h4 className="font-bold text-blue-900 mb-2 text-[0.9rem]">اشتراطات الملف:</h4>
            <ul className="list-none p-0 m-0 mb-4 space-y-1 text-[0.875rem] text-blue-900">
              <li className="flex items-start gap-2"><CheckCircle size={15} className="text-green-600 mt-0.5 shrink-0" /> يجب أن يكون الملف بصيغة Excel فقط (.xlsx أو .xls).</li>
              <li className="flex items-start gap-2"><CheckCircle size={15} className="text-green-600 mt-0.5 shrink-0" /> يجب أن يحتوي الصف الأول على أسماء الأعمدة كما هي موضحة أعلاه.</li>
              <li className="flex items-start gap-2"><CheckCircle size={15} className="text-green-600 mt-0.5 shrink-0" /> يجب ألا تكون الحقول الإجبارية فارغة في أي صف.</li>
              <li className="flex items-start gap-2"><CheckCircle size={15} className="text-green-600 mt-0.5 shrink-0" /> يجب أن يكون البريد الإلكتروني صحيحاً وفريداً لكل طالب.</li>
              <li className="flex items-start gap-2"><CheckCircle size={15} className="text-green-600 mt-0.5 shrink-0" /> يجب أن تكون الشعبة المحددة موجودة مسبقاً في النظام.</li>
              <li className="flex items-start gap-2"><AlertTriangle size={15} className="text-yellow-600 mt-0.5 shrink-0" /> إذا كان الطالب موجوداً برقمه الجامعي، سيتم تسجيله مباشرة دون إنشاء حساب جديد.</li>
              <li className="flex items-start gap-2"><AlertTriangle size={15} className="text-yellow-600 mt-0.5 shrink-0" /> إذا لم يكن الطالب موجوداً، سيتم إنشاء حساب له تلقائياً بكلمة المرور الافتراضية.</li>
            </ul>

            {/* مثال */}
            <h4 className="font-bold text-blue-900 mb-2 text-[0.9rem]">مثال على صف في الملف:</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-[0.82rem] border-collapse border border-blue-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">الاسم الكامل</th>
                    <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">البريد الإلكتروني</th>
                    <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">الرقم الجامعي</th>
                    <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">رقم الشعبة</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr>
                    <td className="py-2 px-3">أحمد محمد علي</td>
                    <td className="py-2 px-3 font-mono text-[0.78rem]">22210001@students.hebron.edu</td>
                    <td className="py-2 px-3">22210001</td>
                    <td className="py-2 px-3">1</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* تحميل النموذج */}
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-[0.875rem] font-bold hover:bg-blue-800 transition-colors"
            >
              <Download size={16} />
              تحميل نموذج Excel جاهز
            </button>
          </div>
        )}
      </div>

      {/* ===== قسمَا الإضافة ===== */}
      <div className="flex gap-6 flex-wrap">
        {/* الإضافة اليدوية */}
        <div className="flex-1 min-w-[300px] border border-[#ccc] p-5 rounded-xl bg-white">
          <h3 className="font-bold text-text mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
            تسجيل طالب بالبحث اليدوي
          </h3>
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
              <div className="border border-[#ddd] max-h-[200px] overflow-y-auto mt-1 rounded-lg">
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
              <p className="text-text-faint text-[0.85rem] mt-1">لا توجد نتائج</p>
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

        {/* رفع ملف Excel */}
        <div className="flex-[2] min-w-[300px] border border-[#ccc] p-5 rounded-xl bg-white">
          <h3 className="font-bold text-text mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
            رفع ملف Excel (لإضافة طلاب متعددين دفعة واحدة)
          </h3>

          <div className="border-2 border-dashed border-[#c8d5e2] rounded-xl p-5 bg-[#f7fafc] flex flex-col items-center gap-3 mb-3">
            <FileSpreadsheet size={36} className="text-blue-400" />
            <p className="text-text-soft text-[0.875rem] text-center">اختر ملف Excel يحتوي على بيانات الطلاب</p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#c8d5e2] rounded-lg text-[0.875rem] font-medium text-text hover:bg-[#f0f4f8] transition-colors">
              <FileSpreadsheet size={16} className="text-blue-500" />
              اختيار الملف
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
            <p className="text-text-faint text-[0.8rem]">الصيغ المقبولة: .xlsx أو .xls فقط</p>
          </div>

          {fileError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
              <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-700 text-[0.875rem]">{fileError}</p>
            </div>
          )}
        </div>
      </div>

      {/* قائمة الطلاب المضافة */}
      {studentsList.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-text mb-3">
            قائمة الطلاب المُضافة
            <span className="mr-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">{studentsList.length}</span>
          </h3>
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0] mb-4">
            <table className="w-full border-collapse text-[0.9rem]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">#</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الاسم</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الرقم الجامعي</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الشعبة</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]"></th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((s, idx) => (
                  <tr key={idx} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9]">
                    <td className="py-3 px-4 text-text-faint">{idx + 1}</td>
                    <td className="py-3 px-4">{s.name}</td>
                    <td className="py-3 px-4">{s.university_id}</td>
                    <td className="py-3 px-4">{s.section_id || s.section_identifier}</td>
                    <td className="py-3 px-4">
                      <button
                        className="text-danger text-[0.82rem] hover:underline"
                        onClick={() => setStudentsList(studentsList.filter((_, i) => i !== idx))}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={handleBulkEnroll} disabled={loading}>
            {loading ? "جاري الإضافة..." : `تأكيد إضافة ${studentsList.length} طالب`}
          </Button>
        </div>
      )}
    </>
  );
}
