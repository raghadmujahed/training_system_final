import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getBackupDetails, downloadBackup } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import useAppToast from "../../../hooks/useAppToast";

export default function BackupDetails() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const result = await getBackupDetails(id);
        const backupData = result?.data || result;
        setData(backupData);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 403) {
          setError("لا تملك صلاحية عرض تفاصيل النسخ الاحتياطية.");
        } else if (status === 404) {
          setError("النسخة الاحتياطية غير موجودة أو تم حذفها.");
        } else {
          setError("تعذر تحميل تفاصيل النسخة الاحتياطية.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleDownload = async () => {
    try {
      await downloadBackup(id, data?.name);
      toast.success("تم تحميل النسخة الاحتياطية بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("تعذر تحميل النسخة الاحتياطية.");
    }
  };

  if (loading) return <LoadingSpinner size="page" text="جاري تحميل تفاصيل النسخة الاحتياطية..." />;
  if (error) return (
    <div>
      <div className="alert alert-danger mb-3" role="alert">{error}</div>
      <button onClick={() => navigate("/admin/backups")} className="btn-secondary">
        رجوع إلى القائمة
      </button>
    </div>
  );
  if (!data) return (
    <div>
      <p>لا توجد تفاصيل إضافية لهذه النسخة.</p>
      <button onClick={() => navigate("/admin/backups")} className="btn-secondary">
        رجوع إلى القائمة
      </button>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>تفاصيل النسخة الاحتياطية</h1>
        <div className="page-header-actions">
          <button onClick={handleDownload} className="btn-primary">
            تحميل النسخة
          </button>
          <button onClick={() => navigate("/admin/backups")} className="btn-secondary">
            رجوع إلى القائمة
          </button>
        </div>
      </div>

      <div className="section-card">
        <div className="backup-info">
          <p><strong>اسم الملف:</strong> {data.name}</p>
          <p><strong>تاريخ الإنشاء:</strong> {data.created_at ? new Date(data.created_at).toLocaleString('ar-EG') : '-'}</p>
          <p><strong>الحجم:</strong> {data.size ? `${(data.size / 1024).toFixed(2)} KB` : '0 KB'}</p>
          <p><strong>النوع:</strong> {data.type || '-'}</p>
          {data.notes && <p><strong>ملاحظة:</strong> {data.notes}</p>}
          {data.user && <p><strong>تم الإنشاء بواسطة:</strong> {data.user.name}</p>}
          {data.file_exists !== undefined && (
            <p><strong>حالة الملف:</strong> {data.file_exists ? 'موجود' : 'غير موجود'}</p>
          )}
        </div>
      </div>

      <div className="section-card">
        <h3>محتويات النسخة</h3>
        {data.tables && Array.isArray(data.tables) && data.tables.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>اسم الجدول</th>
                <th>عدد الحقول</th>
                <th>عدد السجلات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data.tables.map((table, idx) => (
                <tr key={idx}>
                  <td>{table.name}</td>
                  <td>{table.columns_count !== undefined ? table.columns_count : '-'}</td>
                  <td>{table.rows_count !== undefined ? table.rows_count : table.count || 0}</td>
                  <td>
                    <Link
                      to={`/admin/backups/${id}/table/${encodeURIComponent(table.name)}`}
                      target="_blank"
                      className="btn-sm"
                    >
                      عرض تفاصيل الجدول
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>لا توجد معلومات عن الجداول في هذه النسخة</p>
        )}
      </div>
    </div>
  );
}
