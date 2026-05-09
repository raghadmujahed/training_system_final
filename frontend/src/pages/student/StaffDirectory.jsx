import { useState, useEffect } from "react";
import { getStaffDirectory } from "../../services/api";
import { Mail, Phone, Building2, GraduationCap, Users } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
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
      <div>
        <PageHeader title="دليل الموظفين" subtitle="عرض بيانات الموظفين في القسم ومكان التدريب" icon={Users} />
        <LoadingSpinner size="section" text="جاري التحميل..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="دليل الموظفين" subtitle="عرض بيانات الموظفين في القسم ومكان التدريب" icon={Users} />
        <div className="text-center py-10 text-danger">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="دليل الموظفين" subtitle="عرض بيانات الموظفين في القسم ومكان التدريب" icon={Users} />

      {staff.length === 0 ? (
        <EmptyState title="لا توجد بيانات" description="لا توجد بيانات موظفين متاحة" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((person) => (
            <div
              key={person.id}
              className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[var(--radius-lg)] shadow-sm p-5"
              style={{ borderRight: `4px solid ${getRoleColor(person.role)}` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: getRoleColor(person.role) }}
                >
                  {getRoleIcon(person.role)}
                </div>
                <div>
                  <h4 className="m-0 text-base font-bold text-text">{person.name}</h4>
                  <span
                    className="text-[0.8rem] font-medium"
                    style={{ color: getRoleColor(person.role) }}
                  >
                    {person.role}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {person.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={16} className="text-text-faint" />
                    <a
                      href={`mailto:${person.email}`}
                      className="text-info no-underline hover:underline"
                    >
                      {person.email}
                    </a>
                  </div>
                )}

                {person.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={16} className="text-text-faint" />
                    <a
                      href={`tel:${person.phone}`}
                      className="text-info no-underline hover:underline"
                    >
                      {person.phone}
                    </a>
                  </div>
                )}

                {person.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 size={16} className="text-text-faint" />
                    <span className="text-text-faint">{person.department}</span>
                  </div>
                )}

                {person.training_site && (
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap size={16} className="text-text-faint" />
                    <span className="text-text-faint">{person.training_site}</span>
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
