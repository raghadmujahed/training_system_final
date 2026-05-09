import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api";
import useAppToast from "../../hooks/useAppToast";
import PageHeader from "../../components/common/PageHeader";
import { FileText, CheckCircle, RotateCcw } from "lucide-react";

function renderPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return <p className="text-soft">لا توجد بيانات معبأة.</p>;
  }
  return (
    <div className="grid gap-[10px]">
      {Object.entries(payload).map(([k, v]) => (
        <div key={k} className="section-card p-3">
          <div className="text-soft text-[0.85rem] mb-1">
            {k}
          </div>
          <div className="whitespace-pre-wrap text-[0.95rem]">
            {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FieldSupervisorFormInstanceReview() {
  const toast = useAppToast();
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!instanceId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/form-instances/${instanceId}`);
      setData(res.data?.data ?? res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر فتح النموذج");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = async (decision) => {
    if (!instanceId) return;
    setBusy(true);
    setError("");
    try {
      await apiClient.post(`/form-instances/${instanceId}/review`, {
        decision,
        comment: comment.trim() || null,
      });
      navigate("/field-supervisor/forms");
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "فشل إرسال المراجعة");
    } finally {
      setBusy(false);
    }
  };

  const tpl = data?.template;
  const subject = data?.subject;

  return (
    <>
      <div className="fs-back-row">
        <Link to="/field-supervisor/forms" className="btn-outline-custom btn-sm-custom">
          ← العودة للنماذج
        </Link>
      </div>

      <PageHeader
        icon={FileText}
        title={tpl?.title_ar || "مراجعة نموذج"}
        subtitle={subject?.name ? `الطالب: ${subject.name}` : "مراجعة فقط — لا تعبئة من هنا"}
      />

      {loading && <div className="section-card">جاري التحميل...</div>}
      {error && (
        <div className="section-card border-r-4 border-r-[var(--danger)]">
          <p className="m-0">{error}</p>
        </div>
      )}

      {!loading && data && (
        <>
          <div className="section-card mb-4">
            <p className="m-0 text-soft">
              الحالة: <strong>{data.status_label || data.status}</strong>
              {tpl?.owner_type ? ` — نوع المالك في القالب: ${tpl.owner_type}` : null}
            </p>
          </div>

          <div className="section-card mb-4">
            <h4 className="mt-0">محتوى النموذج (قراءة)</h4>
            {renderPayload(data.payload)}
          </div>

          {data.status === "pending_review" ? (
            <div className="section-card">
              <h4 className="mt-0">قرار المراجعة</h4>
              <div className="form-field">
                <label className="form-label-custom" htmlFor="review-comment">
                  ملاحظاتك (اختياري عند الموافقة، يُفضّل عند الإعادة)
                </label>
                <textarea
                  id="review-comment"
                  className="form-input-custom"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="تعليق للطالب أو للمسجل..."
                />
              </div>
              <div className="table-actions mt-3">
                <button
                  type="button"
                  className="btn-primary-custom btn-sm-custom inline-flex items-center gap-[6px]"
                  disabled={busy}
                  onClick={() => submitReview("approved")}
                >
                  <CheckCircle size={16} />
                  موافقة / اعتماد
                </button>
                <button
                  type="button"
                  className="btn-outline-custom btn-sm-custom inline-flex items-center gap-[6px]"
                  disabled={busy}
                  onClick={() => {
                    if (!comment.trim()) {
                      toast.warning("يرجى كتابة سبب الإعادة في الملاحظات.");
                      return;
                    }
                    submitReview("returned");
                  }}
                >
                  <RotateCcw size={16} />
                  إعادة للتعديل
                </button>
              </div>
            </div>
          ) : (
            <p className="text-soft">لا يتطلب هذا السجل مراجعة حالية من هذه الشاشة.</p>
          )}
        </>
      )}
    </>
  );
}
