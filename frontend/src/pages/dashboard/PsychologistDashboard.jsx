import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, itemsFromPagedResponse } from "../../services/api";
import { useAnnouncements } from "../../hooks/useSharedData";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Button from "../../components/ui/Button";
import { Heart, Megaphone, Shield, MessageCircle } from "lucide-react";

export default function PsychologistDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentsCount, setStudentsCount] = useState(0);
  const { data: announcements } = useAnnouncements({ per_page: 5 });

  useEffect(() => {
    let m = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const usersRes = await getUsers({ per_page: 200, status: "active" });
        if (!m) return;
        const users = itemsFromPagedResponse(usersRes);
        setStudentsCount(
          typeof usersRes?.meta?.total === "number" ? usersRes.meta.total : users.length
        );
      } catch (e) {
        if (m) setError(e?.response?.data?.message || "فشل تحميل البيانات");
      } finally {
        if (m) setLoading(false);
      }
    }
    load();
    return () => { m = false; };
  }, []);

  const statCards = [
    { title: "الطلبة (قائمة مرجعية)", value: studentsCount, icon: Heart, color: "border-r-info", bg: "bg-info/8" },
    { title: "إعلانات حديثة", value: announcements.length, icon: Megaphone, color: "border-r-accent", bg: "bg-accent/8" },
    { title: "خدمات الإرشاد", value: "دليل", icon: Shield, color: "border-r-success", bg: "bg-success/8" },
    { title: "التواصل", value: "داخلي", icon: MessageCircle, color: "border-r-primary", bg: "bg-primary/8" },
  ];

  return (
    <>
      <PageHeader title="لوحة الأخصائي النفسي" subtitle="منصة دعم نفسي وإرشاد للطلبة ضمن إطار التدريب الميداني والأكاديمي." icon={Heart} />

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
              <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">أحدث الإعلانات الموجهة لك</h4>
              {announcements.length === 0 ? (
                <p className="text-text-faint">لا توجد إعلانات حالياً.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
                      <h6 className="m-0 mb-1 text-text font-bold text-[0.95rem]">{a.title || "إعلان"}</h6>
                      <p className="m-0 text-text-soft text-[0.88rem]">{a.content || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3 flex-wrap mt-4">
                <Link to="/psychologist/students"><Button variant="default" size="sm">قائمة الطلبة</Button></Link>
                <Link to="/psychologist/guidance"><Button variant="outline" size="sm">الإرشاد والدعم</Button></Link>
                <Link to="/notifications"><Button variant="outline" size="sm">الإشعارات</Button></Link>
              </div>
            </div>

            <div className="bg-accent/8 border border-accent/20 rounded-[18px] p-5">
              <h5 className="m-0 mb-3 text-secondary font-extrabold text-[1.05rem]">تنويه</h5>
              <p className="text-text-soft text-[0.92rem] m-0">
                تُعرض هنا بيانات عامة وإعلانات فقط. أي جلسات أو تقارير سرية يجب أن تُدار وفق
                سياسة الجامعة والسرية المهنية، ولا تُخزَّن في هذا النموذج الأولي إلا بعد
                إضافة وحدة خلفية مخصصة.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
