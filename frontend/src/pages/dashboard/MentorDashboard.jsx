import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDashboardStats,
  getTrainingAssignments,
  getTasks,
  itemsFromPagedResponse,
} from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Button from "../../components/ui/Button";
import {
  GraduationCap,
  Activity,
  ListChecks,
  ClipboardList,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  MapPin,
} from "lucide-react";

export default function MentorDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignTotal, setAssignTotal] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [st, assignRes, taskRes] = await Promise.all([
          getDashboardStats(),
          getTrainingAssignments({ per_page: 5 }),
          getTasks({ per_page: 5 }),
        ]);
        if (!mounted) return;
        setStats(st);
        const aItems = itemsFromPagedResponse(assignRes);
        setAssignments(aItems);
        setAssignTotal(
          typeof assignRes?.meta?.total === "number" ? assignRes.meta.total : aItems.length
        );
        const tItems = itemsFromPagedResponse(taskRes);
        setTasksTotal(
          typeof taskRes?.meta?.total === "number" ? taskRes.meta.total : tItems.length
        );
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || "فشل تحميل لوحة المعلم المرشد");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const statCards = [
    { title: "طلبة التدريب (تعييناتك)", value: stats?.my_students ?? "—", icon: GraduationCap, color: "border-r-info", bg: "bg-info/8" },
    { title: "تدريبات جارية (النظام)", value: stats?.active_trainings ?? "—", icon: Activity, color: "border-r-accent", bg: "bg-accent/8" },
    { title: "مهام أضفتها", value: tasksTotal, icon: ListChecks, color: "border-r-success", bg: "bg-success/8" },
    { title: "تعييناتك", value: assignTotal, icon: ClipboardList, color: "border-r-primary", bg: "bg-primary/8" },
  ];

  return (
    <>
      <PageHeader title="لوحة المعلم المرشد" subtitle="متابعة طلبة التدريب المرتبطين بك، المهام، الحضور، والتقييمات في جهة التدريب." icon={GraduationCap} />

      {loading ? (
        <LoadingSpinner size="section" text="جاري التحميل..." />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-[16xl] p-6 text-center">حدث خطأ أثناء تحميل البيانات، يرجى المحاولة مرة أخرى.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card, i) => (
              <div key={i} className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 border-r-4 ${card.color} hover:shadow-md transition-shadow`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-[10px] ${card.bg} flex items-center justify-center`}>
                    <card.icon size={20} className="text-secondary" />
                  </div>
                  <div className="text-text-faint text-[0.85rem] font-bold">{card.title}</div>
                </div>
                <div className="text-[1.8rem] font-extrabold text-secondary">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-secondary mb-4">الوصول السريع</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <Link
                to="/mentor/students"
                className="bg-gradient-to-br from-white to-[#f8fafc] border border-border rounded-[16px] p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Users size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-secondary mb-1">طلابي</h4>
                <p className="text-sm text-text-faint">عرض الطلاب المرتبطين بي</p>
              </Link>

              <Link
                to="/mentor/tasks"
                className="bg-gradient-to-br from-white to-[#f8fafc] border border-border rounded-[16px] p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ListChecks size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-secondary mb-1">المهام</h4>
                <p className="text-sm text-text-faint">إدارة المهام المُنشأة</p>
              </Link>

              <Link
                to="/mentor/attendance"
                className="bg-gradient-to-br from-white to-[#f8fafc] border border-border rounded-[16px] p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ClipboardList size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-secondary mb-1">الحضور</h4>
                <p className="text-sm text-text-faint">تسجيل ومتابعة الحضور</p>
              </Link>

              <Link
                to="/mentor/evaluations"
                className="bg-gradient-to-br from-white to-[#f8fafc] border border-border rounded-[16px] p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-secondary mb-1">التقييمات</h4>
                <p className="text-sm text-text-faint">إدخال التقييمات</p>
              </Link>

              <Link
                to="/mentor/schedule"
                className="bg-gradient-to-br from-white to-[#f8fafc] border border-border rounded-[16px] p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Calendar size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-secondary mb-1">الجدول الأسبوعي</h4>
                <p className="text-sm text-text-faint">عرض جدول التدريب</p>
              </Link>

              <Link
                to="/mentor/notes"
                className="bg-gradient-to-br from-white to-[#f8fafc] border border-border rounded-[16px] p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileText size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-secondary mb-1">الملاحظات</h4>
                <p className="text-sm text-text-faint">سجل الملاحظات اليومية</p>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
              <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">أحدث تعيينات التدريب</h4>
              {assignments.length === 0 ? (
                <EmptyState
                  title="لا توجد تعيينات"
                  description="لا توجد تعيينات تدريب مرتبطة بحسابك حالياً"
                  icon={Users}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {assignments.map((a) => {
                    const stu = a.enrollment?.user;
                    return (
                      <div key={a.id} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                        <h6 className="m-0 mb-1 text-text font-bold text-[0.95rem]">{stu?.name || "طالب"}</h6>
                        <p className="m-0 text-text-soft text-[0.88rem]">
                          {a.training_site?.name || "جهة التدريب"} —{" "}
                          {a.status_label || a.status}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-3 flex-wrap mt-4">
                <Link to="/mentor/students"><Button variant="default" size="sm">كل الطلبة</Button></Link>
                <Link to="/mentor/tasks"><Button variant="outline" size="sm">المهام</Button></Link>
                <Link to="/mentor/attendance"><Button variant="outline" size="sm">الحضور</Button></Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-[18px] p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Activity size={20} className="text-blue-600" />
                </div>
                <div>
                  <h5 className="m-0 mb-2 text-blue-900 font-extrabold text-[1.05rem]">نصائح سريعة</h5>
                  <p className="text-blue-800 text-[0.92rem] m-0 mb-3 leading-relaxed">
                    راجع جدولك الأسبوعي في جهة التدريب، وسجّل ملاحظاتك على التقييمات والمهام
                    لمتابعة تقدم الطلبة.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Link to="/mentor/schedule"><Button variant="default" size="sm">الجدول الأسبوعي</Button></Link>
                    <Link to="/mentor/evaluations"><Button variant="outline" size="sm">التقييمات</Button></Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
