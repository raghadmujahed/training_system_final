import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAppToast from "../../../hooks/useAppToast";
import { useRoles, useDepartments } from "../../../hooks/useSharedData";
import {
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  getUsers,
} from "../../../services/api";

export default function AnnouncementForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const { data: roles } = useRoles();
  const { data: departments } = useDepartments();
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    title: "",
    content: "",
    target_type: "all",
    target_ids: [],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    getUsers({ per_page: 200 }).then((res) => setUsers(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      const fetchAnnouncement = async () => {
        try {
          const data = await getAnnouncement(id);
          const targets = data.targets || [];
          const roleIds = targets.filter((t) => t.role).map((t) => t.role?.id);
          const userIds = targets.filter((t) => t.user).map((t) => t.user?.id);
          const deptIds = targets.filter((t) => t.department).map((t) => t.department?.id);

          let targetType = "all";
          let targetIds = [];
          if (roleIds.length > 0) {
            targetType = "role";
            targetIds = roleIds;
          } else if (userIds.length > 0) {
            targetType = "user";
            targetIds = userIds;
          } else if (deptIds.length > 0) {
            targetType = "department";
            targetIds = deptIds;
          }

          setForm({
            title: data.title,
            content: data.content,
            target_type: targetType,
            target_ids: targetIds,
          });
        } catch (error) {
          console.error(error);
        }
      };
      fetchAnnouncement();
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const handleTargetIdsChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
    setForm({ ...form, target_ids: selected });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const payload = {
        title: form.title,
        content: form.content,
      };

      if (form.target_type === "role") {
        payload.target_roles = form.target_ids;
      } else if (form.target_type === "user") {
        payload.target_users = form.target_ids;
      } else if (form.target_type === "department") {
        payload.target_departments = form.target_ids;
      }

      if (id) {
        await updateAnnouncement(id, payload);
      } else {
        await createAnnouncement(payload);
      }

      navigate("/admin/announcements");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.apiError(err, "حدث خطأ أثناء حفظ الإعلان");
      }
    } finally {
      setLoading(false);
    }
  };

  const targetOptions = () => {
    switch (form.target_type) {
      case "role":
        return roles;
      case "user":
        return users;
      case "department":
        return departments;
      default:
        return [];
    }
  };

  return (
    <div className="announcement-form">
      <div className="page-header">
        <h1>{id ? "تعديل إعلان" : "إضافة إعلان جديد"}</h1>
        <button onClick={() => navigate("/admin/announcements")} className="btn-secondary">
          رجوع
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>العنوان *</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required />
          {errors.title && <span className="error">{errors.title[0]}</span>}
        </div>

        <div className="form-group">
          <label>المحتوى *</label>
          <textarea name="content" rows="6" value={form.content} onChange={handleChange} required />
          {errors.content && <span className="error">{errors.content[0]}</span>}
        </div>

        <div className="form-group">
          <label>نوع الاستهداف *</label>
          <select name="target_type" value={form.target_type} onChange={handleChange}>
            <option value="all">الجميع</option>
            <option value="role">أدوار</option>
            <option value="user">مستخدمين</option>
            <option value="department">أقسام</option>
          </select>
        </div>

        {form.target_type !== "all" && (
          <div className="form-group">
            <label>
              {form.target_type === "role" && "الأدوار المستهدفة"}
              {form.target_type === "user" && "المستخدمين المستهدفين"}
              {form.target_type === "department" && "الأقسام المستهدفة"}
              {" (اضغط Ctrl لاختيار متعدد)"}
            </label>
            <select
              multiple
              value={form.target_ids.map(String)}
              onChange={handleTargetIdsChange}
              style={{ minHeight: 120 }}
            >
              {targetOptions().map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "جاري الحفظ..." : id ? "تحديث" : "إضافة"}
          </button>
          <button type="button" onClick={() => navigate("/admin/announcements")} className="btn-secondary">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}