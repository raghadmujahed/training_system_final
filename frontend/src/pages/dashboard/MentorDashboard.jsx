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
import Button from "../../components/ui/Button";
import { GraduationCap, Activity, ListChecks, ClipboardList } from "lucide-react";

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
        <div className="bg-danger/8 border border-danger/20 text-danger rounded-[16px] p-4">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card, i) => (
              <div key={i} className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 border-r-4 ${card.color}`}>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
              <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">أحدث تعيينات التدريب</h4>
              {assignments.length === 0 ? (
                <p className="text-text-faint">لا توجد تعيينات مرتبطة بحسابك حالياً.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {assignments.map((a) => {
                    const stu = a.enrollment?.user;
                    return (
                      <div key={a.id} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
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

            <div className="bg-accent/8 border border-accent/20 rounded-[18px] p-5">
              <h5 className="m-0 mb-3 text-secondary font-extrabold text-[1.05rem]">اختصارات سريعة</h5>
              <p className="text-text-soft text-[0.92rem] m-0 mb-3">
                راجع جدولك الأسبوعي في جهة التدريب، وسجّل ملاحظاتك على التقييمات والمهام
                لمتابعة تقدم الطلبة.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link to="/mentor/schedule"><Button variant="default" size="sm">الجدول الأسبوعي</Button></Link>
                <Link to="/mentor/evaluations"><Button variant="outline" size="sm">التقييمات</Button></Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
