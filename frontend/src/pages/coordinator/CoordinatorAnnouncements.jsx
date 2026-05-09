import { useEffect, useMemo, useState } from "react";
import { Megaphone, Loader2, Plus, Archive, FileEdit, CheckCircle2, Calendar } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  itemsFromPagedResponse,
} from "../../services/api";

const STATUS_TAB = {
  active: { label: "نشط", icon: CheckCircle2 },
  draft: { label: "مسودة", icon: FileEdit },
  archived: { label: "مؤرشف", icon: Archive },
};

export default function CoordinatorAnnouncements() {
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    status: "draft",
    all_students: true,
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAnnouncements({ status: tab, per_page: 50 });
      setItems(itemsFromPagedResponse(res));
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحميل الإعلانات.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const canSubmit = useMemo(
    () => form.title.trim().length > 0 && form.content.trim().length > 0,
    [form.title, form.content]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        status: form.status,
        all_students: form.all_students,
      };
      await createAnnouncement(payload);
      setForm({
        title: "",
        content: "",
        status: "draft",
        all_students: true,
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر حفظ الإعلان.");
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (id, status) => {
    setSaving(true);
    setError("");
    try {
      await updateAnnouncement(id, {
        status,
        ...(status === "active" ? { published_at: new Date().toISOString() } : {}),
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر تحديث الحالة.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("حذف هذا الإعلان؟")) return;
    setSaving(true);
    setError("");
    try {
      await deleteAnnouncement(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "تعذر الحذف.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <Megaphone size={24} />
          </div>
          <div className="flex-1">
            <h1 className="hero-title">إعلان عام للطلبة</h1>
            <p className="hero-subtitle">
              أنشئ إعلانات تظهر لجميع الطلبة النشطين. يمكن أرشفتها أو حفظها كمسودة.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p className="m-0">{error}</p>
        </div>
      )}

      <div className="section-card mb-4 p-[1.25rem_1.5rem]">
        <h5 className="mb-3 d-flex align-items-center gap-2">
          <Plus size={20} className="text-primary" />
          إنشاء إعلان جديد
        </h5>
        <form onSubmit={handleCreate} className="row g-3">
          <div className="col-md-6">
            <label className="form-label-custom">العنوان</label>
            <input
              className="form-input-custom"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label-custom">حالة النشر</label>
            <select
              className="form-select-custom"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="draft">مسودة</option>
              <option value="active">نشر فوري</option>
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <label className="d-flex align-items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.all_students}
                onChange={(e) => setForm((p) => ({ ...p, all_students: e.target.checked }))}
              />
              <span>جميع الطلبة</span>
            </label>
          </div>
          <div className="col-12">
            <label className="form-label-custom">المحتوى</label>
            <textarea
              className="form-textarea-custom"
              rows={4}
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              required
            />
          </div>
          <div className="col-12">
            <button type="submit" className="btn-primary-custom" disabled={saving || !canSubmit}>
              {saving ? "جاري الحفظ..." : "حفظ الإعلان"}
            </button>
          </div>
        </form>
      </div>

      <div className="section-card p-[1.25rem_1.5rem]">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {Object.entries(STATUS_TAB).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              type="button"
              className={`${tab === key ? "btn-primary-custom" : "btn-outline-custom"} inline-flex items-center gap-[6px]`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-4 text-muted">
            <LoadingSpinner size="section" text="جاري التحميل..." />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted mb-0">لا توجد إعلانات في هذا القسم.</p>
        ) : (
          <ul className="list-unstyled mb-0 flex flex-col gap-3">
            {items.map((a) => (
              <li
                key={a.id}
                className="border border-[var(--border)] rounded-[10px] p-[14px_16px] bg-white"
              >
                <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                  <div>
                    <strong className="text-[1.05rem]">{a.title}</strong>
                    <div className="text-[0.82rem] text-[var(--text-soft)] mt-[6px] d-flex flex-wrap gap-3">
                      <span className="d-inline-flex align-items-center gap-1">
                        <Calendar size={14} />
                        {a.published_at
                          ? new Date(a.published_at).toLocaleString("ar-SA")
                          : "لم يُنشر بعد"}
                      </span>
                      {a.expires_at && (
                        <span>انتهاء: {new Date(a.expires_at).toLocaleString("ar-SA")}</span>
                      )}
                      {a.all_students ? <span>جميع الطلبة</span> : null}
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    {a.status === "draft" && (
                      <button
                        type="button"
                        className="btn-sm btn-primary-custom"
                        disabled={saving}
                        onClick={() => patchStatus(a.id, "active")}
                      >
                        تفعيل
                      </button>
                    )}
                    {a.status === "active" && (
                      <button
                        type="button"
                        className="btn-sm btn-outline-custom"
                        disabled={saving}
                        onClick={() => patchStatus(a.id, "archived")}
                      >
                        أرشفة
                      </button>
                    )}
                    {a.status === "archived" && (
                      <button
                        type="button"
                        className="btn-sm btn-outline-custom"
                        disabled={saving}
                        onClick={() => patchStatus(a.id, "draft")}
                      >
                        إعادة مسودة
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-sm text-[#b91c1c] border border-[#fecaca] bg-white"
                      disabled={saving}
                      onClick={() => handleDelete(a.id)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
                <p className="mt-[10px] mb-0 whitespace-pre-wrap leading-[1.6]">{a.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
