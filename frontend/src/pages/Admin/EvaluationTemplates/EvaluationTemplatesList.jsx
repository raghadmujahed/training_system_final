import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEvaluationTemplates, deleteEvaluationTemplate } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import useAppToast from "../../../hooks/useAppToast";

export default function EvaluationTemplatesList() {
  const toast = useAppToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await getEvaluationTemplates();
      // الصحيح: response.data هي المصفوفة
      const templatesData = response.data || [];
      setTemplates(templatesData);
    } catch (err) {
      console.error(err);
      setError("فشل تحميل قوالب التقييم");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا القالب؟")) {
      try {
        await deleteEvaluationTemplate(id);
        fetchTemplates();
      } catch (err) {
        toast.error("حدث خطأ أثناء حذف القالب");
      }
    }
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>قوالب التقييم</h1>
        <Link to="/admin/evaluation-templates/create" className="btn-primary">
          + إضافة قالب جديد
        </Link>
      </div>

      {templates.length === 0 ? (
        <p>لا توجد قوالب حالياً. يمكنك إضافة قالب جديد باستخدام الزر أعلاه.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>النوع</th>
              <th>الدور المستهدف</th>
              <th>القسم</th>
              <th>عدد البنود</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td>{template.name}</td>
                <td>{template.form_type === "evaluation" ? "تقييم" : "نموذج طالب"}</td>
                <td>{template.target_role_label || "عام"}</td>
                <td>{template.department_label || "عام"}</td>
                <td>{template.items?.length || 0}</td>
                <td>
                  <Link
                    to={`/admin/evaluation-templates/edit/${template.id}`}
                    className="btn-sm"
                  >
                    تعديل
                  </Link>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="btn-sm danger"
                  >
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