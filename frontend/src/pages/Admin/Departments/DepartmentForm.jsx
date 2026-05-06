import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDepartment, createDepartment, updateDepartment } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";

export default function DepartmentForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  
  useEffect(() => { 
    if (id) getDepartment(id).then(data => setName(data.name)); 
  }, [id]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) await updateDepartment(id, { name });
      else await createDepartment({ name });
      navigate("/admin/departments");
    } catch (err) {
      toast.apiError(err, "حدث خطأ أثناء حفظ القسم");
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="form">
      <h1>{id ? "تعديل قسم" : "إضافة قسم"}</h1>
      <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="اسم القسم" />
      <button type="submit">حفظ</button>
    </form>
  );
}