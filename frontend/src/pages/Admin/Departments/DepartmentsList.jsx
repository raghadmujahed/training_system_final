import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDepartments, deleteDepartment } from "../../../services/api";

export default function DepartmentsList() {
  const [items, setItems] = useState([]);

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();

      let departmentsArray = [];
      if (Array.isArray(response)) {
        departmentsArray = response;
      } else if (response?.data && Array.isArray(response.data)) {
        departmentsArray = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        departmentsArray = response.data.data;
      } else {
        departmentsArray = [];
      }

      setItems(departmentsArray);
    } catch (err) {
      console.error(err);
      setItems([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await getDepartments();
        let departmentsArray = [];
        if (Array.isArray(response)) {
          departmentsArray = response;
        } else if (response?.data && Array.isArray(response.data)) {
          departmentsArray = response.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          departmentsArray = response.data.data;
        }
        if (!cancelled) {
          setItems(departmentsArray);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id) => {
    if (confirm("حذف القسم؟")) {
      try {
        await deleteDepartment(id);
        fetchDepartments();
      } catch {
        alert("حدث خطأ أثناء الحذف");
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
          {items.map((item) => (
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
          {items.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center">لا يوجد أقسام</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}