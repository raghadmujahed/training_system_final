import { useState, useEffect } from "react";
import { getStaffDirectory } from "../../services/api";
import { Mail, Phone, Building2, GraduationCap, Users } from "lucide-react";
import { useStudentTrack } from "../../hooks/useStudentTrack";

export default function StaffDirectory() {
  const { config } = useStudentTrack();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStaffDirectory();
  }, []);

  const fetchStaffDirectory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStaffDirectory();
      setStaff(response.data || []);
    } catch (err) {
      setError("فشل في جلب بيانات دليل الموظفين");
      console.error("Staff directory error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "رئيس القسم":
        return <Building2 size={20} />;
      case "المنسق":
        return <Users size={20} />;
      case "المشرف الأكاديمي":
        return <GraduationCap size={20} />;
      case "مدير المدرسة":
      case "مدير المركز":
        return <Building2 size={20} />;
      case "المعلم":
      case "الأخصائي المرشد":
        return <Users size={20} />;
      default:
        return <Users size={20} />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "رئيس القسم":
        return "#8b5cf6";
      case "المنسق":
        return "#3b82f6";
      case "المشرف الأكاديمي":
        return "#10b981";
      case "مدير المدرسة":
      case "مدير المركز":
        return "#f59e0b";
      case "المعلم":
      case "الأخصائي المرشد":
        return "#6366f1";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <div className="enrollments-list">
        <div className="page-header">
          <h1>دليل الموظفين</h1>
          <p>عرض بيانات الموظفين في القسم ومكان التدريب</p>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enrollments-list">
        <div className="page-header">
          <h1>دليل الموظفين</h1>
          <p>عرض بيانات الموظفين في القسم ومكان التدريب</p>
        </div>
        <div style={{ textAlign: "center", padding: 40, color: "#dc3545" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="enrollments-list">
      <div className="page-header">
        <h1>دليل الموظفين</h1>
        <p>عرض بيانات الموظفين في القسم ومكان التدريب</p>
      </div>

      {staff.length === 0 ? (
        <div className="section-card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#666" }}>لا توجد بيانات موظفين متاحة</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {staff.map((person) => (
            <div
              key={person.id}
              className="section-card"
              style={{
                padding: 20,
                borderLeft: `4px solid ${getRoleColor(person.role)}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    backgroundColor: getRoleColor(person.role),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  {getRoleIcon(person.role)}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16 }}>{person.name}</h4>
                  <span
                    style={{
                      fontSize: 13,
                      color: getRoleColor(person.role),
                      fontWeight: 500,
                    }}
                  >
                    {person.role}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {person.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <Mail size={16} style={{ color: "#666" }} />
                    <a
                      href={`mailto:${person.email}`}
                      style={{ color: "#3b82f6", textDecoration: "none" }}
                    >
                      {person.email}
                    </a>
                  </div>
                )}

                {person.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <Phone size={16} style={{ color: "#666" }} />
                    <a
                      href={`tel:${person.phone}`}
                      style={{ color: "#3b82f6", textDecoration: "none" }}
                    >
                      {person.phone}
                    </a>
                  </div>
                )}

                {person.department && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <Building2 size={16} style={{ color: "#666" }} />
                    <span style={{ color: "#666" }}>{person.department}</span>
                  </div>
                )}

                {person.training_site && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <GraduationCap size={16} style={{ color: "#666" }} />
                    <span style={{ color: "#666" }}>{person.training_site}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
