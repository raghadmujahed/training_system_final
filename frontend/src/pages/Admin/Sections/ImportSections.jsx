import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { createSection, getUsers } from "../../../services/api";
import { useCourses } from "../../../hooks/useSharedData";
import useAppToast from "../../../hooks/useAppToast";
import { FileSpreadsheet, Download, Info, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

export default function ImportSections() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sectionsData, setSectionsData] = useState([]);
  const { data: courses } = useCourses();
  const [supervisors, setSupervisors] = useState([]);
  const [step, setStep] = useState(1); // 1: رفع ملف, 2: معاينة وتأكيد
  const [results, setResults] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  const [fileError, setFileError] = useState("");

  const downloadTemplate = () => {
    const headers = ["اسم الشعبة", "المساق", "السنة الأكاديمية", "الفصل", "المشرف الأكاديمي"];
    const example = ["شعبة تدريب 1", "تدريب ميداني في علم النفس", new Date().getFullYear(), "الأول", ""];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = [{ wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 10 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "شعب");
    XLSX.writeFile(wb, "نموذج_استيراد_الشعب.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setFileError("");
    if (!file) {
      setFileError("يرجى اختيار ملف Excel أولاً.");
      return;
    }
    const allowedExts = [".xlsx", ".xls"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setFileError("يرجى رفع ملف بصيغة Excel فقط (.xlsx أو .xls).");
      e.target.value = "";
      return;
    }

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
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          setFileError("الملف فارغ أو لا يحتوي على بيانات صالحة.");
          return;
        }

        // التحقق من وجود الأعمدة الإجبارية
        const firstRow = rows[0];
        const hasName = "اسم الشعبة" in firstRow || "name" in firstRow;
        const hasCourse = "المساق" in firstRow || "course_name" in firstRow;
        const missing = [];
        if (!hasName) missing.push("اسم الشعبة");
        if (!hasCourse) missing.push("المساق");
        if (missing.length > 0) {
          setFileError(`لا يمكن رفع الملف لأن الأعمدة التالية غير موجودة: ${missing.join("، ")}.`);
          return;
        }

        const mapped = rows.map((row) => ({
          name: row["اسم الشعبة"] || row["name"] || "",
          course_name: row["المساق"] || row["course_name"] || "",
          academic_year: row["السنة الأكاديمية"] || row["academic_year"] || new Date().getFullYear(),
          semester: row["الفصل"] === "الثاني" ? "second" : "first",
          academic_supervisor_name: row["المشرف الأكاديمي"] || row["supervisor_name"] || "",
        }));
        const valid = mapped.filter(s => s.name && s.course_name);
        const skipped = mapped.length - valid.length;
        if (valid.length === 0) {
          setFileError("جميع صفوف الملف تحتوي على حقول فارغة في اسم الشعبة أو المساق.");
          return;
        }
        if (skipped > 0) {
          toast.warning(`تم تجاهل ${skipped} صف بسبب وجود حقول إجبارية فارغة.`);
        }
        setSectionsData(valid);
        setStep(2);
      } catch {
        setFileError("تعذر قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة.");
      }
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
    const allSuccess = results.errors.length === 0;
    const allFailed = results.successCount === 0;
    return (
      <div>
        <div className="page-header">
          <h1>نتيجة استيراد الشعب</h1>
          <button onClick={() => navigate("/admin/sections")} className="btn-secondary">قائمة الشعب</button>
        </div>

        <div className={`rounded-xl border p-5 mb-5 flex items-start gap-4 ${allFailed ? "bg-red-50 border-red-200" : allSuccess ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="mt-1">
            {allSuccess && <CheckCircle className="text-green-600" size={28} />}
            {allFailed && <XCircle className="text-red-600" size={28} />}
            {!allSuccess && !allFailed && <AlertTriangle className="text-yellow-600" size={28} />}
          </div>
          <div>
            <p className="font-bold text-[1rem] mb-1">
              {allSuccess && "تمت إضافة جميع الشعب بنجاح"}
              {allFailed && "فشلت عملية الاستيراد"}
              {!allSuccess && !allFailed && "اكتمل الاستيراد مع بعض الأخطاء"}
            </p>
            <ul className="text-[0.9rem] list-none p-0 m-0 space-y-1">
              <li>✅ تمت إضافة <strong>{results.successCount}</strong> شعبة بنجاح</li>
              {results.errors.length > 0 && <li>❌ فشلت <strong>{results.errors.length}</strong> شعبة</li>}
            </ul>
          </div>
        </div>

        {results.errors.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-white mb-5 overflow-hidden">
            <div className="bg-red-50 px-4 py-3 flex items-center gap-2 border-b border-red-200">
              <XCircle className="text-red-500" size={18} />
              <span className="font-bold text-red-700">تفاصيل الأخطاء ({results.errors.length} شعبة)</span>
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

        <div className="flex gap-2">
          <button onClick={reset} className="btn-primary">استيراد ملف آخر</button>
          <button onClick={() => navigate("/admin/sections")} className="btn-secondary">العودة إلى قائمة الشعب</button>
        </div>
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
        <>
          {/* بطاقة التعليمات */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 mb-6 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-4 text-right"
              onClick={() => setShowGuide(g => !g)}
            >
              <div className="flex items-center gap-3">
                <Info className="text-blue-600 shrink-0" size={22} />
                <span className="font-bold text-blue-800 text-[0.98rem]">تعليمات ملف استيراد الشعب</span>
              </div>
              {showGuide ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-blue-600" />}
            </button>

            {showGuide && (
              <div className="px-5 pb-5 border-t border-blue-200 pt-4">
                <p className="text-blue-800 text-[0.9rem] mb-4">
                  يرجى التأكد من أن ملف Excel يحتوي على الأعمدة المطلوبة. يمكن استخدام الأسماء العربية أو الإنجليزية.
                </p>

                <h4 className="font-bold text-blue-900 mb-2 text-[0.9rem]">الأعمدة المطلوبة:</h4>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-[0.875rem] border-collapse border border-blue-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="py-2 px-3 text-right text-blue-900 border-b border-blue-200 font-semibold">اسم العمود (عربي)</th>
                        <th className="py-2 px-3 text-right text-blue-900 border-b border-blue-200 font-semibold">اسم العمود (إنجليزي)</th>
                        <th className="py-2 px-3 text-right text-blue-900 border-b border-blue-200 font-semibold">الحالة</th>
                        <th className="py-2 px-3 text-right text-blue-900 border-b border-blue-200 font-semibold">ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="border-b border-blue-100">
                        <td className="py-2 px-3 font-medium">اسم الشعبة</td>
                        <td className="py-2 px-3 font-mono text-[0.82rem]">name</td>
                        <td className="py-2 px-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">إجباري</span></td>
                        <td className="py-2 px-3 text-[#555]">اسم الشعبة الدراسية</td>
                      </tr>
                      <tr className="border-b border-blue-100">
                        <td className="py-2 px-3 font-medium">المساق</td>
                        <td className="py-2 px-3 font-mono text-[0.82rem]">course_name</td>
                        <td className="py-2 px-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">إجباري</span></td>
                        <td className="py-2 px-3 text-[#555]">اسم المساق يجب أن يطابق اسمه في النظام تماماً</td>
                      </tr>
                      <tr className="border-b border-blue-100">
                        <td className="py-2 px-3 font-medium">السنة الأكاديمية</td>
                        <td className="py-2 px-3 font-mono text-[0.82rem]">academic_year</td>
                        <td className="py-2 px-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">اختياري</span></td>
                        <td className="py-2 px-3 text-[#555]">افتراضي: السنة الحالية</td>
                      </tr>
                      <tr className="border-b border-blue-100">
                        <td className="py-2 px-3 font-medium">الفصل</td>
                        <td className="py-2 px-3 font-mono text-[0.82rem]">semester</td>
                        <td className="py-2 px-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">اختياري</span></td>
                        <td className="py-2 px-3 text-[#555]"><code className="bg-blue-50 px-1 rounded">الأول</code> أو <code className="bg-blue-50 px-1 rounded">الثاني</code> — افتراضي: الأول</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">المشرف الأكاديمي</td>
                        <td className="py-2 px-3 font-mono text-[0.82rem]">supervisor_name</td>
                        <td className="py-2 px-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">اختياري</span></td>
                        <td className="py-2 px-3 text-[#555]">الاسم يجب أن يطابق اسم المشرف في النظام تماماً</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="font-bold text-blue-900 mb-2 text-[0.9rem]">مثال على صف في الملف:</h4>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-[0.82rem] border-collapse border border-blue-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">اسم الشعبة</th>
                        <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">المساق</th>
                        <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">السنة الأكاديمية</th>
                        <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">الفصل</th>
                        <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">المشرف الأكاديمي</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr>
                        <td className="py-2 px-3">شعبة تدريب 1</td>
                        <td className="py-2 px-3">تدريب ميداني في علم النفس</td>
                        <td className="py-2 px-3">{new Date().getFullYear()}</td>
                        <td className="py-2 px-3">الأول</td>
                        <td className="py-2 px-3 text-[#aaa]">(اختياري)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

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

          {/* منطقة رفع الملف */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
            <div className="border-2 border-dashed border-[#c8d5e2] rounded-xl p-6 bg-[#f7fafc] flex flex-col items-center gap-3 mb-4">
              <FileSpreadsheet size={40} className="text-blue-400" />
              <p className="text-text-soft text-[0.9rem] text-center">اختر ملف Excel يحتوي على بيانات الشعب</p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#c8d5e2] rounded-lg text-[0.875rem] font-medium text-text hover:bg-[#f0f4f8] transition-colors">
                <FileSpreadsheet size={16} className="text-blue-500" />
                اختيار الملف
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              </label>
              <p className="text-text-faint text-[0.8rem]">الصيغ المقبولة: .xlsx أو .xls فقط</p>
            </div>

            {fileError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-red-700 text-[0.875rem]">{fileError}</p>
              </div>
            )}
          </div>
        </>
      )}

      {step === 2 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text text-[1rem]">
              معاينة البيانات
              <span className="mr-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">{sectionsData.length} شعبة</span>
            </h3>
            <button onClick={() => setStep(1)} className="btn-secondary text-[0.875rem]">تغيير الملف</button>
          </div>
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0] mb-4">
            <table className="w-full border-collapse text-[0.9rem]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">اسم الشعبة</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">المساق</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">السنة</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الفصل</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">المشرف</th>
                </tr>
              </thead>
              <tbody>
                {sectionsData.map((s, i) => (
                  <tr key={i} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9]">
                    <td className="py-3 px-4">{s.name}</td>
                    <td className="py-3 px-4">{s.course_name}</td>
                    <td className="py-3 px-4">{s.academic_year}</td>
                    <td className="py-3 px-4">{s.semester === "first" ? "الأول" : "الثاني"}</td>
                    <td className="py-3 px-4">{s.academic_supervisor_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={handleImport} disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? "جاري الاستيراد..." : `تأكيد استيراد ${sectionsData.length} شعبة`}
            </button>
            <button onClick={() => setStep(1)} className="btn-secondary">تغيير الملف</button>
          </div>
        </div>
      )}
    </div>
  );
}
