import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSection } from "../../../services/api";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";
import { FileSpreadsheet, Download, Info, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

export default function BulkUploadSections() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [fileError, setFileError] = useState("");
  const [showGuide, setShowGuide] = useState(true);

  const downloadTemplate = () => {
    const headers = ["اسم الشعبة", "رقم المساق", "السنة الأكاديمية", "الفصل", "رقم المشرف"];
    const example = ["شعبة تدريب 1", "5", new Date().getFullYear(), "first", ""];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "شعب");
    XLSX.writeFile(wb, "نموذج_رفع_الشعب.xlsx");
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFileError("");
    if (!f) return;
    const allowedExts = [".xlsx", ".xls"];
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setFileError("يرجى رفع ملف بصيغة Excel فقط (.xlsx أو .xls).");
      e.target.value = "";
      return;
    }
    setFile(f);
    setFileName(f.name);
  };

  const processFile = async () => {
    if (!file) {
      setFileError("يرجى اختيار ملف Excel أولاً.");
      return;
    }
    setLoading(true);
    setFileError("");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (rows.length === 0) {
          setFileError("الملف فارغ أو لا يحتوي على بيانات صالحة.");
          setLoading(false);
          return;
        }

        // التحقق من وجود الأعمدة الإجبارية
        const firstRow = rows[0];
        const hasName = "section_name" in firstRow || "اسم الشعبة" in firstRow;
        const hasCourse = "course_id" in firstRow || "رقم المساق" in firstRow;
        const missing = [];
        if (!hasName) missing.push("اسم الشعبة");
        if (!hasCourse) missing.push("رقم المساق");
        if (missing.length > 0) {
          setFileError(`لا يمكن رفع الملف لأن الأعمدة التالية غير موجودة: ${missing.join("، ")}.`);
          setLoading(false);
          return;
        }

        const successList = [];
        const failedList = [];

        for (const row of rows) {
          try {
            const sectionData = {
              name: row["section_name"] || row["اسم الشعبة"] || "",
              academic_year: row["academic_year"] || row["السنة الأكاديمية"] || new Date().getFullYear(),
              semester: row["semester"] || row["الفصل"] || "first",
              course_id: row["course_id"] || row["رقم المساق"] || "",
              academic_supervisor_id: row["academic_supervisor_id"] || row["رقم المشرف"] || null,
            };
            if (!sectionData.name || !sectionData.course_id) {
              failedList.push({ section_name: sectionData.name || "غير محدد", error: "اسم الشعبة أو رقم المساق فارغ" });
              continue;
            }
            await createSection(sectionData);
            successList.push(sectionData.name);
          } catch (err) {
            failedList.push({
              section_name: row["section_name"] || row["اسم الشعبة"] || "غير معروف",
              error: err.response?.data?.message || err.message
            });
          }
        }

        setResults({ success: successList, failed: failedList, total: rows.length });
      } catch (err) {
        setFileError("تعذر قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const reset = () => {
    setFile(null);
    setFileName("");
    setResults(null);
    setFileError("");
  };

  if (results) {
    const allSuccess = results.failed.length === 0;
    const allFailed = results.success.length === 0;
    return (
      <div>
        <div className="page-header">
          <h1>نتيجة رفع الشعب</h1>
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
              {allFailed && "فشلت عملية الرفع"}
              {!allSuccess && !allFailed && "اكتملت العملية مع بعض الأخطاء"}
            </p>
            <ul className="text-[0.9rem] list-none p-0 m-0 space-y-1">
              <li>✅ تمت إضافة <strong>{results.success.length}</strong> شعبة بنجاح</li>
              {results.failed.length > 0 && <li>❌ فشلت <strong>{results.failed.length}</strong> شعبة</li>}
            </ul>
          </div>
        </div>

        {results.failed.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-white mb-5 overflow-hidden">
            <div className="bg-red-50 px-4 py-3 flex items-center gap-2 border-b border-red-200">
              <XCircle className="text-red-500" size={18} />
              <span className="font-bold text-red-700">تفاصيل الأخطاء ({results.failed.length} شعبة)</span>
            </div>
            <ul className="divide-y divide-[#fde8e8]">
              {results.failed.map((f, i) => (
                <li key={i} className="px-4 py-2 text-[0.875rem] text-red-700 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  <span><strong>{f.section_name}</strong>: {f.error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={reset} className="btn-primary">رفع ملف آخر</button>
          <button onClick={() => navigate("/admin/sections")} className="btn-secondary">العودة إلى قائمة الشعب</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>رفع شعب من ملف Excel</h1>
        <button onClick={() => navigate("/admin/sections")} className="btn-secondary">رجوع</button>
      </div>

      {/* بطاقة التعليمات */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 mb-6 overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-right"
          onClick={() => setShowGuide(g => !g)}
        >
          <div className="flex items-center gap-3">
            <Info className="text-blue-600 shrink-0" size={22} />
            <span className="font-bold text-blue-800 text-[0.98rem]">تعليمات ملف الشعب</span>
          </div>
          {showGuide ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-blue-600" />}
        </button>

        {showGuide && (
          <div className="px-5 pb-5 border-t border-blue-200 pt-4">
            <p className="text-blue-800 text-[0.9rem] mb-4">
              يرجى التأكد من أن ملف Excel يحتوي على الأعمدة المطلوبة وبنفس الأسماء الموضحة أدناه.
            </p>

            <h4 className="font-bold text-blue-900 mb-2 text-[0.9rem]">الأعمدة المطلوبة في ملف Excel:</h4>
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
                    <td className="py-2 px-3 font-mono text-[0.82rem]">section_name</td>
                    <td className="py-2 px-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">إجباري</span></td>
                    <td className="py-2 px-3 text-[#555]">اسم الشعبة الدراسية</td>
                  </tr>
                  <tr className="border-b border-blue-100">
                    <td className="py-2 px-3 font-medium">رقم المساق</td>
                    <td className="py-2 px-3 font-mono text-[0.82rem]">course_id</td>
                    <td className="py-2 px-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">إجباري</span></td>
                    <td className="py-2 px-3 text-[#555]">المعرّف الرقمي للمساق في النظام</td>
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
                    <td className="py-2 px-3 text-[#555]"><code className="bg-blue-50 px-1 rounded">first</code> أو <code className="bg-blue-50 px-1 rounded">second</code> فقط — افتراضي: first</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">رقم المشرف</td>
                    <td className="py-2 px-3 font-mono text-[0.82rem]">academic_supervisor_id</td>
                    <td className="py-2 px-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">اختياري</span></td>
                    <td className="py-2 px-3 text-[#555]">المعرّف الرقمي للمشرف الأكاديمي</td>
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
                    <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">رقم المساق</th>
                    <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">السنة الأكاديمية</th>
                    <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">الفصل</th>
                    <th className="py-2 px-3 text-right border-b border-blue-200 text-blue-900">رقم المشرف</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr>
                    <td className="py-2 px-3">شعبة تدريب 1</td>
                    <td className="py-2 px-3">5</td>
                    <td className="py-2 px-3">{new Date().getFullYear()}</td>
                    <td className="py-2 px-3">first</td>
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
          <p className="text-text-soft text-[0.9rem] text-center">
            {fileName ? (
              <span className="font-medium text-text">{fileName}</span>
            ) : (
              "اختر ملف Excel يحتوي على بيانات الشعب"
            )}
          </p>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#c8d5e2] rounded-lg text-[0.875rem] font-medium text-text hover:bg-[#f0f4f8] transition-colors">
            <FileSpreadsheet size={16} className="text-blue-500" />
            {fileName ? "تغيير الملف" : "اختيار الملف"}
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
          </label>
          <p className="text-text-faint text-[0.8rem]">الصيغ المقبولة: .xlsx أو .xls فقط</p>
        </div>

        {fileError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-red-700 text-[0.875rem]">{fileError}</p>
          </div>
        )}

        <button
          onClick={processFile}
          disabled={loading || !file}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "جاري رفع الشعب..." : "رفع الملف وإضافة الشعب"}
        </button>
      </div>
    </div>
  );
}
