import { useEffect, useMemo, useState, useCallback } from "react";
import { Megaphone, Plus, Archive, FileEdit, CheckCircle2, Calendar, Users, User, BookOpen, Search, X } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getCoordinatorSections,
  getCoordinatorStudents,
  itemsFromPagedResponse,
} from "../../services/api";

const STATUS_TAB = {
  active: { label: "نشط", icon: CheckCircle2 },
  draft: { label: "مسودة", icon: FileEdit },
  archived: { label: "مؤرشف", icon: Archive },
};

const TARGET_TYPES = [
  { value: "all_students", label: "كل الطلاب", icon: Users, desc: "يظهر لجميع الطلاب المسجلين" },
  { value: "sections", label: "شعب معينة", icon: BookOpen, desc: "يظهر فقط لطلاب الشعب المختارة" },
  { value: "student", label: "طالب معين", icon: User, desc: "يظهر لطالب واحد فقط" },
];

const TARGET_LABELS = {
  all_students: "كل الطلاب",
  sections: "شعب معينة",
  student: "طالب معين",
};

const INITIAL_FORM = {
  title: "",
  content: "",
  status: "draft",
  target_type: "all_students",
  section_ids: [],
  student_id: null,
};

export default function CoordinatorAnnouncements() {
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  // بيانات الشعب والطلاب
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsLoadError, setSectionsLoadError] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSearchTimeout, setStudentSearchTimeout] = useState(null);

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

  useEffect(() => { load(); }, [tab]);

  const parseListResponse = (res) => {
    if (Array.isArray(res)) return { items: res, message: "" };
    if (Array.isArray(res?.data)) return { items: res.data, message: res?.message || "" };
    return { items: [], message: res?.message || "" };
  };

  const loadSections = useCallback(() => {
    setSectionsLoading(true);
    setSectionsLoadError("");
    getCoordinatorSections()
      .then((res) => {
        const { items, message } = parseListResponse(res);
        setSections(items);
        if (items.length === 0 && message) {
          setSectionsLoadError(message);
        }
      })
      .catch((e) => {
        setSections([]);
        setSectionsLoadError(
          e?.response?.data?.message || "تعذر تحميل الشعب. تحقق من اتصالك أو ربط حسابك بالقسم."
        );
      })
      .finally(() => setSectionsLoading(false));
  }, []);

  // جلب الشعب عند اختيار «شعب معينة»
  useEffect(() => {
    if (form.target_type === "sections") {
      loadSections();
    }
  }, [form.target_type, loadSections]);

  // جلب الطلاب عند اختيار student مع بحث
  const fetchStudents = useCallback((search) => {
    setStudentsLoading(true);
    getCoordinatorStudents(search)
      .then((res) => setStudents(res?.data || []))
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }, []);

  useEffect(() => {
    if (form.target_type === "student") {
      fetchStudents("");
    }
  }, [form.target_type, fetchStudents]);

  const handleStudentSearch = (val) => {
    setStudentSearch(val);
    if (studentSearchTimeout) clearTimeout(studentSearchTimeout);
    setStudentSearchTimeout(setTimeout(() => fetchStudents(val), 350));
  };

  const canSubmit = useMemo(() => {
    if (!form.title.trim() || !form.content.trim()) return false;
    if (form.target_type === "sections" && form.section_ids.length === 0) return false;
    if (form.target_type === "student" && !form.student_id) return false;
    return true;
  }, [form]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    if (form.target_type === "sections" && form.section_ids.length === 0) {
      setFormError("يرجى اختيار شعبة واحدة على الأقل");
      return;
    }
    if (form.target_type === "student" && !form.student_id) {
      setFormError("يرجى اختيار الطالب المستهدف");
      return;
    }
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    setFormError("");
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        status: form.status,
        target_type: form.target_type,
        all_students: form.target_type === "all_students",
      };
      if (form.target_type === "sections") {
        payload.section_ids = form.section_ids;
      }
      if (form.target_type === "student") {
        payload.student_id = form.student_id;
      }
      await createAnnouncement(payload);
      setForm({ ...INITIAL_FORM });
      setStudentSearch("");
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || "تعذر حفظ الإعلان.";
      const errs = e?.response?.data?.errors;
      if (errs) {
        const firstErr = Object.values(errs).flat()[0];
        setFormError(firstErr || msg);
      } else {
        setFormError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id) => {
    setForm((p) => ({
      ...p,
      section_ids: p.section_ids.includes(id)
        ? p.section_ids.filter((s) => s !== id)
        : [...p.section_ids, id],
    }));
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

  const renderTargetBadge = (a) => {
    const tt = a.target_type || "all_students";
    if (tt === "all_students" || a.all_students) return <span className="badge-custom badge-info">كل الطلاب</span>;
    if (tt === "sections") {
      const sectionNames = (a.targets || [])
        .filter((t) => t.section_id)
        .map((t) => t.section?.name || `شعبة #${t.section_id}`)
        .join("، ");
      return <span className="badge-custom badge-warning" title={sectionNames}>شعب: {sectionNames || "—"}</span>;
    }
    if (tt === "student") {
      const name = a.target_student?.name || "طالب";
      return <span className="badge-custom badge-success">طالب: {name}</span>;
    }
    return null;
  };

  return (
    <div>
      <div className="hero-section mb-4">
        <div className="hero-content">
          <div className="hero-icon">
            <Megaphone size={26} />
          </div>
          <div className="flex-1">
            <h1 className="hero-title">إدارة الإعلانات</h1>
            <p className="hero-subtitle">
              أنشئ إعلانات موجهة لجميع الطلبة، أو لشعب معينة، أو لطالب محدد.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-custom alert-danger mb-3">
          <p className="m-0">{error}</p>
        </div>
      )}

      {/* ─── نموذج إنشاء إعلان ─── */}
      <div className="section-card mb-4 p-[1.25rem_1.5rem]">
        <h5 className="mb-3 d-flex align-items-center gap-2">
          <Plus size={20} className="text-primary" />
          إنشاء إعلان جديد
        </h5>
        <form onSubmit={handleCreate} className="row g-3">
          {formError && (
            <div className="col-12">
              <div className="alert-custom alert-danger">
                <p className="m-0">{formError}</p>
              </div>
            </div>
          )}

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

          {/* ─── الفئة المستهدفة ─── */}
          <div className="col-md-3">
            <label className="form-label-custom">الفئة المستهدفة</label>
            <select
              className="form-select-custom"
              value={form.target_type}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  target_type: e.target.value,
                  section_ids: [],
                  student_id: null,
                }))
              }
            >
              {TARGET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* وصف الفئة */}
          <div className="col-12">
            <p className="text-[0.82rem] text-[var(--text-soft)] m-0 d-flex align-items-center gap-1">
              {(() => {
                const tt = TARGET_TYPES.find((t) => t.value === form.target_type);
                if (!tt) return null;
                const Icon = tt.icon;
                return <><Icon size={14} /> {tt.desc}</>;
              })()}
            </p>
          </div>

          {/* ─── اختيار الشعب (Multi Select) ─── */}
          {form.target_type === "sections" && (
            <div className="col-12">
              <label className="form-label-custom">اختيار الشعب</label>
              {sectionsLoading ? (
                <p className="text-muted text-[0.85rem]">جاري تحميل الشعب...</p>
              ) : sectionsLoadError ? (
                <p className="text-[#dc2626] text-[0.85rem] mb-0">{sectionsLoadError}</p>
              ) : sections.length === 0 ? (
                <p className="text-muted text-[0.85rem] mb-0">
                  لا توجد شعب في قسمك حالياً. أنشئ الشعب من لوحة التوزيع أو تواصل مع الإدارة.
                </p>
              ) : (
                <div
                  className="border border-[var(--border)] rounded-[8px] p-[10px] max-h-[200px] overflow-y-auto"
                  style={{ background: "var(--bg-light, #f9fafb)" }}
                >
                  {sections.map((s) => (
                    <label
                      key={s.id}
                      className="d-flex align-items-center gap-2 py-[5px] px-[6px] rounded cursor-pointer select-none hover:bg-[var(--border-light,#e5e7eb)]"
                    >
                      <input
                        type="checkbox"
                        checked={form.section_ids.includes(s.id)}
                        onChange={() => toggleSection(s.id)}
                      />
                      <span className="flex-1 text-[0.9rem]">
                        {s.name}
                        {s.course_name ? <span className="text-[var(--text-soft)] text-[0.8rem]"> — {s.course_name}</span> : null}
                      </span>
                      <span className="text-[0.78rem] text-[var(--text-soft)]">{s.students_count} طالب</span>
                    </label>
                  ))}
                </div>
              )}
              {form.section_ids.length > 0 && (
                <p className="text-[0.82rem] mt-1 mb-0 text-primary">
                  تم اختيار {form.section_ids.length} شعبة
                </p>
              )}
            </div>
          )}

          {/* ─── اختيار طالب (Searchable) ─── */}
          {form.target_type === "student" && (
            <div className="col-12">
              <label className="form-label-custom">اختيار الطالب</label>
              <div className="position-relative mb-2">
                <Search size={16} className="position-absolute" style={{ top: 10, right: 10, color: "var(--text-soft)" }} />
                <input
                  className="form-input-custom pe-4"
                  style={{ paddingRight: 34 }}
                  placeholder="ابحث باسم الطالب أو البريد..."
                  value={studentSearch}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => { setStudentSearch(""); fetchStudents(""); }}
                    className="position-absolute border-0 bg-transparent"
                    style={{ top: 8, left: 8, color: "var(--text-soft)", cursor: "pointer" }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {form.student_id && (
                <div className="d-flex align-items-center gap-2 mb-2 p-[8px_12px] rounded-[8px] border border-[var(--primary)] bg-[var(--primary-light,#eff6ff)]">
                  <User size={16} className="text-primary" />
                  <span className="flex-1 text-[0.9rem]">
                    {students.find((s) => s.id === form.student_id)?.name || `طالب #${form.student_id}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, student_id: null }))}
                    className="border-0 bg-transparent text-[#b91c1c] cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {studentsLoading ? (
                <p className="text-muted text-[0.85rem]">جاري البحث...</p>
              ) : students.length === 0 ? (
                <p className="text-muted text-[0.85rem]">لا يوجد طلاب مطابقون.</p>
              ) : (
                <div
                  className="border border-[var(--border)] rounded-[8px] max-h-[180px] overflow-y-auto"
                  style={{ background: "var(--bg-light, #f9fafb)" }}
                >
                  {students.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, student_id: s.id }))}
                      className={`d-flex align-items-center gap-2 w-100 text-start py-[7px] px-[10px] border-0 cursor-pointer ${
                        form.student_id === s.id
                          ? "bg-[var(--primary-light,#dbeafe)]"
                          : "bg-transparent hover:bg-[var(--border-light,#e5e7eb)]"
                      }`}
                    >
                      <User size={14} className="text-[var(--text-soft)]" />
                      <span className="flex-1 text-[0.88rem]">{s.name}</span>
                      <span className="text-[0.78rem] text-[var(--text-soft)]">{s.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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

      {/* ─── قائمة الإعلانات ─── */}
      <div className="section-card p-[1.25rem_1.5rem]">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {Object.entries(STATUS_TAB).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
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
                    <div className="text-[0.82rem] text-[var(--text-soft)] mt-[6px] d-flex flex-wrap gap-3 align-items-center">
                      <span className="d-inline-flex align-items-center gap-1">
                        <Calendar size={14} />
                        {a.published_at
                          ? new Date(a.published_at).toLocaleString("ar-SA")
                          : "لم يُنشر بعد"}
                      </span>
                      {a.expires_at && (
                        <span>انتهاء: {new Date(a.expires_at).toLocaleString("ar-SA")}</span>
                      )}
                      {renderTargetBadge(a)}
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
