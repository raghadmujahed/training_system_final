import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBackups, createBackup, restoreBackup, deleteBackup, downloadBackup } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function BackupsList() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await getBackups();
      setBackups(data.data || []);
    } catch (err) {
      console.error(err);
      setError("فشل تحميل النسخ الاحتياطية");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!window.confirm("هل أنت متأكد من إنشاء نسخة احتياطية جديدة؟")) return;
    setCreating(true);
    try {
      const response = await createBackup({ type: "full" });
      alert("تم إنشاء النسخة الاحتياطية بنجاح");
      
      // تحميل الملف تلقائياً بعد الإنشاء
      const backupId = response.backup?.id || response?.id;
      const filename = response.backup?.name || response?.name;
      if (backupId) {
        try {
          await downloadBackup(backupId, filename);
          alert("تم تحميل النسخة الاحتياطية بنجاح");
        } catch (downloadErr) {
          console.error("فشل التحميل التلقائي:", downloadErr);
        }
      }
      
      fetchBackups();
    } catch (err) {
      setError("فشل إنشاء النسخة");
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm("تحذير: استعادة النسخة ستؤدي إلى فقدان البيانات الحالية. هل أنت متأكد؟")) return;
    try {
      await restoreBackup(id);
      alert("تمت استعادة النسخة بنجاح");
      fetchBackups();
    } catch (err) {
      setError("فشل استعادة النسخة");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه النسخة؟")) return;
    try {
      await deleteBackup(id);
      alert("تم حذف النسخة");
      fetchBackups();
    } catch (err) {
      setError("فشل حذف النسخة");
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      await downloadBackup(id, filename);
      alert("تم تحميل النسخة الاحتياطية بنجاح");
    } catch (err) {
      console.error(err);
      setError("فشل تحميل النسخة");
    }
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  if (error) return <div className="text-center text-danger">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>النسخ الاحتياطية</h1>
        <button onClick={handleCreate} disabled={creating} className="btn-primary">
          {creating ? "جاري الإنشاء..." : "+ إنشاء نسخة جديدة"}
        </button>
      </div>

      {backups.length === 0 ? (
        <p>لا توجد نسخ احتياطية حتى الآن. قم بإنشاء نسخة جديدة.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>اسم الملف</th>
              <th>تاريخ الإنشاء</th>
              <th>الحجم (بايت)</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr key={backup.id}>
                <td>{backup.name}</td>
                <td>{new Date(backup.created_at).toLocaleString()} </td>
                <td>{backup.size?.toLocaleString() || "غير معروف"} bytes</td>
                <td>
                  <Link to={`/admin/backups/${backup.id}`} className="btn-sm">
                    عرض التفاصيل
                  </Link>
                  <button onClick={() => handleDownload(backup.id, backup.name)} className="btn-sm">
                    تحميل
                  </button>
                  <button onClick={() => handleRestore(backup.id)} className="btn-sm">
                    استعادة
                  </button>
                  <button onClick={() => handleDelete(backup.id)} className="btn-sm danger">
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}