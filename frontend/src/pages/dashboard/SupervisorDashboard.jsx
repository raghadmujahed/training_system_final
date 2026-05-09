import { LayoutDashboard, Layers, ListChecks, MapPin, CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/Button";

export default function SupervisorDashboard() {
  const stats = [
    { title: "عدد الشعب", value: 4, icon: Layers, color: "border-r-info", bg: "bg-info/8" },
    { title: "المهام النشطة", value: 7, icon: ListChecks, color: "border-r-accent", bg: "bg-accent/8" },
    { title: "الزيارات الميدانية", value: 5, icon: MapPin, color: "border-r-success", bg: "bg-success/8" },
    { title: "التقييمات المكتملة", value: 18, icon: CheckCircle2, color: "border-r-primary", bg: "bg-primary/8" },
  ];

  const recentActivities = [
    {
      title: "إضافة مهمة جديدة لشعبة التربية العملية 1",
      description: "تم إنشاء مهمة إعداد خطة درس ومشاركتها مع الطلبة.",
      meta: "منذ ساعتين",
    },
    {
      title: "رفع أحد الطلبة ملف التكليف",
      description: "تم استلام ملف الواجب الخاص بمهمة الزيارة الصفية.",
      meta: "منذ 4 ساعات",
    },
    {
      title: "إدخال تقييم جديد",
      description: "تم اعتماد تقييم أحد الطلبة ضمن استمارة الأداء العملي.",
      meta: "اليوم",
    },
  ];

  const timeline = [
    {
      title: "زيارة ميدانية يوم الأحد",
      description: "متابعة أداء الطلبة في مدرسة الحسين الثانوية.",
    },
    {
      title: "موعد تسليم المهام يوم الإثنين",
      description: "آخر موعد لتسليم مهام خطة الدرس للشعبة الأولى.",
    },
    {
      title: "اجتماع متابعة يوم الأربعاء",
      description: "اجتماع مع المنسق الأكاديمي لمراجعة سير التدريب.",
    },
  ];

  return (
    <>
      <PageHeader title="لوحة تحكم المشرف الأكاديمي" subtitle="متابعة المهام، الزيارات الميدانية، تقييم الطلبة، والشعب المسندة إليك." icon={LayoutDashboard} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((item, index) => (
          <div key={index} className={`bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5 border-r-4 ${item.color}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-[10px] ${item.bg} flex items-center justify-center`}>
                <item.icon size={20} className="text-secondary" />
              </div>
              <div className="text-text-faint text-[0.85rem] font-bold">{item.title}</div>
            </div>
            <div className="text-[1.8rem] font-extrabold text-secondary">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">أحدث الأنشطة</h4>
          <div className="flex flex-col gap-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
                <h6 className="m-0 mb-1 text-text font-bold text-[0.95rem]">{activity.title}</h6>
                <p className="m-0 text-text-soft text-[0.88rem]">{activity.description}</p>
                <div className="text-accent text-[0.8rem] font-bold mt-1">{activity.meta}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-accent/8 border border-accent/20 rounded-[18px] p-5">
          <h5 className="m-0 mb-3 text-secondary font-extrabold text-[1.05rem]">تنبيه</h5>
          <p className="text-text-soft text-[0.92rem] m-0">
            يرجى مراجعة المهام غير المسلّمة والتأكد من استكمال التقييمات قبل
            نهاية الأسبوع.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">المهام السريعة</h4>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="default" size="sm">إضافة مهمة جديدة</Button>
            <Button variant="outline" size="sm">عرض حلول الطلبة</Button>
            <Button variant="outline" size="sm">إدخال تقييم</Button>
            <Button variant="light" size="sm">جدولة زيارة ميدانية</Button>
          </div>
        </div>

        <div className="bg-gradient-to-b from-bg-paper to-[#f8fafc] border border-border rounded-[18px] p-5">
          <h4 className="m-0 mb-4 text-secondary font-extrabold text-[1.05rem]">الجدول القادم</h4>
          <div className="flex flex-col gap-3">
            {timeline.map((item, index) => (
              <div key={index} className="border-b border-[#edf2f7] pb-3 last:border-0 last:pb-0">
                <h6 className="m-0 mb-1 text-text font-bold text-[0.95rem]">{item.title}</h6>
                <p className="m-0 text-text-soft text-[0.88rem]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}