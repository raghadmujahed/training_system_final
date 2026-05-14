import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBackups, createBackup, restoreBackup, deleteBackup, downloadBackup } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import Button from "../../../components/ui/Button";
import useAppToast from "../../../hooks/useAppToast";

export default function BackupsList() {
  const toast = useAppToast();
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
    setError(null);
    try {
      const response = await createBackup({ type: "full" });
      toast.success("تم إنشاء النسخة الاحتياطية بنجاح");
      
      // تحميل الملف تلقائياً بعد الإنشاء
      const backupId = response.backup?.id || response?.id;
      const filename = response.backup?.name || response?.name;
      if (backupId) {
        try {
          await downloadBackup(backupId, filename);
          toast.success("تم تحميل النسخة الاحتياطية بنجاح");
        } catch (downloadErr) {
          console.error("فشل التحميل التلقائي:", downloadErr);
          toast.warning("تم إنشاء النسخة ولكن فشل التحميل التلقائي");
        }
      }
      
      fetchBackups();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "فشل إنشاء النسخة الاحتياطية";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm("تحذير: استعادة النسخة ستؤدي إلى فقدان البيانات الحالية. هل أنت متأكد؟")) return;
    setError(null);
    try {
      await restoreBackup(id);
      toast.success("تمت استعادة النسخة بنجاح");
      fetchBackups();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "فشل استعادة النسخة";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه النسخة؟")) return;
    setError(null);
    try {
      await deleteBackup(id);
      toast.success("تم حذف النسخة بنجاح");
      fetchBackups();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "فشل حذف النسخة";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      await downloadBackup(id, filename);
      toast.success("تم تحميل النسخة الاحتياطية بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل النسخة");
    }
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  return (
    <div>
      <div className="page-header">
        <h1>النسخ الاحتياطية</h1>
        <Button onClick={handleCreate} disabled={creating || loading}>
          {creating ? "جاري الإنشاء..." : "+ إنشاء نسخة احتياطية جديدة"}
        </Button>
      </div>

      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

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
                  <div className="flex gap-2">
                    <Button
                      as={Link}
                      to={`/admin/backups/${backup.id}`}
                      size="sm"
                      variant="outline"
                    >
                      عرض التفاصيل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(backup.id, backup.name)}
                    >
                      تحميل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(backup.id)}
                      className="text-warning border-warning hover:bg-warning/10"
                    >
                      استعادة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(backup.id)}
                      className="text-danger border-danger hover:bg-danger/10"
                    >
                      حذف
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}