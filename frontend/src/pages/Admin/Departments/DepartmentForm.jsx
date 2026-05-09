import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDepartment, createDepartment, updateDepartment } from "../../../services/api";
import useAppToast from "../../../hooks/useAppToast";
import { isRequired, getNameErrorMessage } from "../../../utils/validation";
import { apiCache } from "../../../services/apiCache";

export default function DepartmentForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  
  useEffect(() => { 
    if (id) getDepartment(id).then(data => setName(data.name)); 
  }, [id]);

  const handleChange = (e) => {
    const value = e.target.value;
    setName(value);
    // Clear error when user types
    if (fieldErrors.name) {
      setFieldErrors({ ...fieldErrors, name: null });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!isRequired(name)) {
      errors.name = "اسم القسم مطلوب";
    } else if (name.length < 2) {
      errors.name = getNameErrorMessage();
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (id) await updateDepartment(id, { name });
      else await createDepartment({ name });
      // Invalidate departments cache to refresh the list
      apiCache.invalidate("departments:list");
      navigate("/admin/departments");
    } catch (err) {
      toast.apiError(err, "حدث خطأ أثناء حفظ القسم");
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="form">
      <h1>{id ? "تعديل قسم" : "إضافة قسم"}</h1>
      <div>
        <input 
          type="text" 
          value={name} 
          onChange={handleChange} 
          onBlur={handleChange}
          className={fieldErrors.name ? 'border-red-500' : ''}
          required 
          placeholder="اسم القسم" 
        />
        {fieldErrors.name && (
          <div className="text-red-500 text-sm mt-1">{fieldErrors.name}</div>
        )}
      </div>
      <button type="submit">حفظ</button>
    </form>
  );
}