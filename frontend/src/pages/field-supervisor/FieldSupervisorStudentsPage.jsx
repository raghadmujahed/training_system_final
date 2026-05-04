import { useFieldSupervisorStudents } from "../../hooks/useFieldSupervisorApi";
import FieldSupervisorStudentsPanel from "./FieldSupervisorStudentsPanel";
import PageHeader from "../../components/common/PageHeader";
import { Users } from "lucide-react";

export default function FieldSupervisorStudentsPage() {
  const { students, loading, error, refresh } = useFieldSupervisorStudents();

  return (
    <>
      <PageHeader
        icon={Users}
        title="الطلبة المرتبطون"
        subtitle="قائمة بكل الطلبة المرتبطين بحسابك — الأعمدة الكاملة (حضور، تقرير اليوم، تقييم…). للمهام اليومية استخدم «الحضور»، «السجلات»، وغيرها من القائمة الجانبية."
      />
      <div className="fs-students-list-banner">
        <span className="fs-students-list-banner__tag">قائمة عامة</span>
        <span>ليست صفحة مهام — هنا ترى الجميع دفعة واحدة.</span>
      </div>
      <FieldSupervisorStudentsPanel
        students={students}
        loading={loading}
        error={error}
        onRetry={refresh}
        panelTitle="الطلبة المرتبطون"
      />
    </>
  );
}
