import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSection } from "../../../services/api";
import * as XLSX from "xlsx";
import useAppToast from "../../../hooks/useAppToast";

export default function BulkUploadSections() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const processFile = async () => {
    if (!file) { toast.warning("اختر ملف أولاً"); return; }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (rows.length === 0) throw new Error("الملف فارغ");

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
            await createSection(sectionData);
            successList.push(sectionData.name);
          } catch (err) {
            failedList.push({
              section_name: row["section_name"] || row["اسم الشعبة"] || "غير معروف",
              error: err.response?.data?.message || err.message
            });
          }
        }

        setResults({ success: successList, failed: failedList });
        if (successList.length) {
          setTimeout(() => {
            navigate("/admin/sections");
          }, 2000);
        }
      } catch (err) {
        toast.apiError(err, "خطأ في معالجة الملف");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <div className="page-header">
        <h1>رفع شعب من Excel</h1>
        <button onClick={() => navigate("/admin/sections")}>رجوع</button>
      </div>
      <div>
        <p>
          الأعمدة المطلوبة: <strong>section_name, academic_year, semester, course_id, academic_supervisor_id (اختياري)</strong>
        </p>
        <ul>
          <li>semester: <code>first</code> أو <code>second</code> فقط</li>
        </ul>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
        <button onClick={processFile} disabled={loading}>
          {loading ? "جاري..." : "رفع"}
        </button>
        {results && (
          <div>
            {results.success.length > 0 && (
              <div className="success">✅ تمت إضافة {results.success.length} شعبة</div>
            )}
            {results.failed.length > 0 && (
              <div className="error">
                ❌ فشلت {results.failed.length} شعبة:{" "}
                {results.failed.map((f) => f.section_name).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
