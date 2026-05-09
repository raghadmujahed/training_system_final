import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBackupTableData } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import PageHeader from "../../../components/common/PageHeader";
import Button from "../../../components/ui/Button";

export default function TableData() {
  const { id, tableName } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getBackupTableData(id, tableName);
        // التعامل مع هيكل استجابة Laravel Resource
        const tableData = result?.data || result;
        
        if (tableData && tableData.length > 0) {
          setColumns(Object.keys(tableData[0]));
          setData(tableData);
        } else {
          setColumns([]);
          setData([]);
        }
      } catch (err) {
        console.error(err);
        setError("فشل تحميل بيانات الجدول");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, tableName]);

  if (loading) return <LoadingSpinner size="page" text="جاري تحميل البيانات..." />;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <PageHeader title={`بيانات الجدول: ${decodeURIComponent(tableName)}`} />

      <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
        <div className="mb-4">
          <strong>عدد السجلات:</strong> {data.length}
        </div>

        {data.length === 0 ? (
          <p className="text-text-soft">لا توجد بيانات في هذا الجدول</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.9rem]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">#</th>
                  {columns.map((col, i) => (
                    <th key={i} className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9]">
                    <td className="py-3 px-4">{idx + 1}</td>
                    {columns.map((col, i) => (
                      <td key={i} className="py-3 px-4">
                        {row[col] === null || row[col] === undefined ? (
                          <span className="text-text-faint">NULL</span>
                        ) : typeof row[col] === "object" ? (
                          <code className="text-[0.85rem]">
                            {JSON.stringify(row[col])}
                          </code>
                        ) : (
                          row[col]
                        )}
                      </td>
                    ))}
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
