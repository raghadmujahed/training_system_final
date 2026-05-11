import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, AlertTriangle, CheckCircle2, Database, Eye, ShieldAlert } from "lucide-react";
import { getPublicArchiveBatches } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function HeadOfDepartmentArchive() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublicArchiveBatches();
      setBatches(data?.batches || []);
    } catch (err) {
      console.error("Archive load error:", err);
      setError(err?.response?.data?.message || "فشل في تحميل بيانات الأرشفة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner size="section" text="جاري تحميل البيانات..." />;
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold">
            <Database size={28} /> الفترات المؤرشفة
          </h1>
          <p className="text-[#666] m-0 mt-1">
            عرض الفترات التدريبية المؤرشفة - للعرض فقط
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {error && (
        <div className="bg-[#fee] text-[#c00] p-4 rounded-lg mb-4 flex items-center gap-2">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Admin-only notice */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-4 mb-6 flex items-center gap-3">
        <ShieldAlert size={24} className="text-[#1e40af]" />
        <div>
          <p className="m-0 font-semibold text-[#1e40af]">الأرشفة متاحة فقط لمسؤول النظام</p>
          <p className="m-0 text-sm text-[#666]">
            يمكن لرئيس القسم عرض الفترات المؤرشفة فقط. للأرشفة، يرجى التواصل مع الإدارة.
          </p>
        </div>
      </div>

      {/* Archive batches list */}
      <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <h2 className="mt-0 flex items-center gap-2 text-xl font-semibold">
          <Database size={20} /> سجل الأرشفة ({batches.length})
        </h2>

        {batches.length === 0 ? (
          <p className="text-[#666] text-center p-6">لا توجد فترات مؤرشفة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9fafb]">
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">#</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الفترة التدريبية</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">تاريخ الأرشفة</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الحالة</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">إجمالي العناصر</th>
                  <th className="p-3 text-right border-b-2 border-[#e5e7eb]">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch, i) => (
                  <tr key={batch.id} className="border-b border-[#e5e7eb]">
                    <td className="p-3 text-[#6b7280]">{i + 1}</td>
                    <td className="p-3 font-semibold">{batch.period?.name || "-"}</td>
                    <td className="p-3 text-[13px] text-[#666]">
                      {batch.archived_at ? new Date(batch.archived_at).toLocaleString("ar") : "-"}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 bg-[#dcfce7] text-[#166534] py-1 px-[10px] rounded-full text-xs font-semibold">
                        <CheckCircle2 size={14} /> مؤرشف
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="bg-[#dbeafe] text-[#1e40af] py-[2px] px-[10px] rounded-full text-[13px] font-semibold">
                        {batch.total_count || 0}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          if (batch.period?.id) {
                            navigate(`/head-department/archive/details?period_id=${batch.period.id}`);
                          }
                        }}
                        className="inline-flex items-center gap-[6px] bg-[#3b82f6] text-white border-none py-[6px] px-3 rounded-md cursor-pointer text-[13px] font-semibold"
                      >
                        <Eye size={14} /> عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
