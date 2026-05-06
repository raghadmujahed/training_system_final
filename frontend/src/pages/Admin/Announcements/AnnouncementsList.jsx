import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAnnouncements, deleteAnnouncement } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import useAppToast from "../../../hooks/useAppToast";

export default function AnnouncementsList() {
  const toast = useAppToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await getAnnouncements();
      setAnnouncements(response.data || []);
    } catch (err) {
      setError("فشل تحميل الإعلانات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الإعلان؟")) {
      try {
        await deleteAnnouncement(id);
        fetchAnnouncements();
      } catch (err) {
        toast.error("حدث خطأ أثناء الحذف");
      }
    }
  };

  const getTargetLabel = (announcement) => {
    const targets = announcement.targets || [];
    if (targets.length === 0) return "الجميع";

    const hasRoles = targets.some((t) => t.role);
    const hasUsers = targets.some((t) => t.user);
    const hasDepts = targets.some((t) => t.department);

    if (hasRoles) return `أدوار (${targets.filter((t) => t.role).length})`;
    if (hasUsers) return `مستخدمين (${targets.filter((t) => t.user).length})`;
    if (hasDepts) return `أقسام (${targets.filter((t) => t.department).length})`;
    return "غير محدد";
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div className="announcements-list">
      <div className="page-header">
        <h1>إدارة الإعلانات</h1>
        <Link to="/admin/announcements/create" className="btn-primary">+ إضافة إعلان</Link>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>العنوان</th>
            <th>المحتوى</th>
            <th>الاستهداف</th>
            <th>تاريخ النشر</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map((announcement) => (
            <tr key={announcement.id}>
              <td>{announcement.title}</td>
              <td>
                {announcement.content?.substring(0, 100)}
                {announcement.content?.length > 100 ? "..." : ""}
              </td>
              <td>{getTargetLabel(announcement)}</td>
              <td>{new Date(announcement.created_at).toLocaleDateString()}</td>
              <td>
                <Link to={`/admin/announcements/edit/${announcement.id}`} className="btn-sm">تعديل</Link>
                <button onClick={() => handleDelete(announcement.id)} className="btn-sm danger">حذف</button>
              </td>
            </tr>
          ))}
          {announcements.length === 0 && (
            <tr><td colSpan="5" className="text-center">لا توجد إعلانات</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}