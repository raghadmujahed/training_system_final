import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBackupTableData } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

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
      <div className="page-header">
        <h1>بيانات الجدول: {decodeURIComponent(tableName)}</h1>
        <div>
          <button onClick={() => navigate(-1)} className="btn-secondary">رجوع</button>
          <button onClick={() => navigate(`/admin/backups/${id}`)} className="btn-primary">
            تفاصيل النسخة
          </button>
        </div>
      </div>

      <div className="section-card">
        <div style={{ marginBottom: "1rem" }}>
          <strong>عدد السجلات:</strong> {data.length}
        </div>

        {data.length === 0 ? (
          <p>لا توجد بيانات في هذا الجدول</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    {columns.map((col, i) => (
                      <td key={i}>
                        {row[col] === null || row[col] === undefined ? (
                          <span style={{ color: "#999" }}>NULL</span>
                        ) : typeof row[col] === "object" ? (
                          <code style={{ fontSize: "0.85rem" }}>
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
