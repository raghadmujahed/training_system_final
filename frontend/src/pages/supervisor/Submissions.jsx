import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";

export default function Submissions() {
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      studentName: "أحمد محمد",
      taskTitle: "إعداد خطة درس",
      submittedAt: "2026-04-08",
      status: "بانتظار المراجعة",
      notes: "",
    },
    {
      id: 2,
      studentName: "سارة خالد",
      taskTitle: "تقرير زيارة ميدانية",
      submittedAt: "2026-04-09",
      status: "مقبول",
      notes: "تمت مراجعة الحل وهو جيد جدًا.",
    },
    {
      id: 3,
      studentName: "محمد يوسف",
      taskTitle: "تحليل موقف تدريسي",
      submittedAt: "2026-04-10",
      status: "بحاجة تعديل",
      notes: "يرجى توسيع التحليل وإضافة أمثلة أوضح.",
    },
  ]);

  const updateStatus = (id, status) => {
    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  };

  const updateNotes = (id, notes) => {
    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, notes } : item
      )
    );
  };

  const getBadgeClass = (status) => {
    if (status === "مقبول") return "badge-success";
    if (status === "بحاجة تعديل") return "badge-danger";
    return "badge-warning";
  };

  return (
    <>
      <PageHeader
        title="متابعة حلول الطلبة"
        subtitle="مراجعة حلول المهام وإضافة الملاحظات الأكاديمية عليها"
      />

      {!submissions.length ? (
        <EmptyState
          title="لا توجد حلول مرفوعة"
          description="لم يرفع الطلبة أي حلول للمهام حتى الآن."
        />
      ) : (
        <div className="list-clean">
          {submissions.map((item) => (
            <div key={item.id} className="list-item-card">
              <div className="panel-header">
                <div>
                  <h4 className="panel-title">{item.studentName}</h4>
                  <p className="panel-subtitle">المهمة: {item.taskTitle}</p>
                </div>

                <span className={`badge-custom ${getBadgeClass(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <div className="list-clean mt-3 gap-2">
                <span className="text-soft">تاريخ التسليم: {item.submittedAt}</span>

                <div className="form-group-custom mb-0">
                  <label className="form-label-custom">ملاحظات المشرف</label>
                  <textarea
                    className="form-textarea-custom"
                    value={item.notes}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    placeholder="أدخل ملاحظاتك على الحل..."
                  />
                </div>

                <div className="table-actions">
                  <button
                    className="btn-success-custom btn-sm-custom"
                    onClick={() => updateStatus(item.id, "مقبول")}
                  >
                    قبول
                  </button>

                  <button
                    className="btn-warning-custom btn-sm-custom"
                    onClick={() => updateStatus(item.id, "بحاجة تعديل")}
                  >
                    بحاجة تعديل
                  </button>

                  <button
                    className="btn-light-custom btn-sm-custom"
                    onClick={() => updateStatus(item.id, "بانتظار المراجعة")}
                  >
                    إعادة للمراجعة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}