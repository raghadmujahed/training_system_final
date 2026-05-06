import { useState } from "react";
import { Link } from "react-router-dom";
import { deleteDepartment } from "../../../services/api";
import { apiCache } from "../../../services/apiCache";
import { useDepartments } from "../../../hooks/useSharedData";
import useAppToast from "../../../hooks/useAppToast";

export default function DepartmentsList() {
  const toast = useAppToast();
  const { data: items, loading } = useDepartments();
  const [localItems, setLocalItems] = useState(null);

  const displayItems = localItems ?? items;

  const handleDelete = async (id) => {
    if (confirm("حذف القسم؟")) {
      try {
        await deleteDepartment(id);
        apiCache.invalidate("departments:list");
        setLocalItems((prev) => (prev ?? items).filter((d) => d.id !== id));
      } catch {
        toast.error("حدث خطأ أثناء الحذف");
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>الأقسام</h1>
        <Link to="/admin/departments/create" className="btn-primary">
          + إضافة قسم
        </Link>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>
                <Link to={`/admin/departments/edit/${item.id}`} className="btn-sm">
                  تعديل
                </Link>
                <button onClick={() => handleDelete(item.id)} className="btn-sm danger">
                  حذف
                </button>
              </td>
            </tr>
          ))}
          {displayItems.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center">لا يوجد أقسام</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}