import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { CheckCircle2, Star, Eye, FileText } from "lucide-react";

function formatSubmittedAt(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BundleSubmittedPanel({
  submittedList,
  maxScore,
  selectedId,
  onSelectStudent,
  selectedRow,
  draft,
  onDraftChange,
  onGrade,
  gradeSavingId,
  openingFileId,
  onOpenFile,
  fileError,
}) {
  if (!submittedList.length) {
    return (
      <div className="text-center py-8 text-muted bg-slate-50 rounded-lg border border-dashed">
        <FileText size={32} className="mb-2 opacity-40 mx-auto" />
        <p className="mb-0">لا يوجد طلاب رفعوا حلولاً بعد.</p>
      </div>
    );
  }

  const sub = selectedRow?.submission;
  const currentScore = sub?.score ?? sub?.grade;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,300px)_1fr] gap-4">
      <div className="border border-[#e2e8f0] rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="px-3 py-2.5 bg-gradient-to-l from-indigo-50 to-white border-b border-[#e2e8f0] font-semibold text-[0.9rem] text-[#334155]">
          الطلاب الذين سلّموا ({submittedList.length})
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y divide-[#f1f5f9]">
          {submittedList.map((r) => {
            const sc = r.submission?.score ?? r.submission?.grade;
            const active = r.user_id === selectedId;
            return (
              <button
                key={r.user_id}
                type="button"
                onClick={() => onSelectStudent(r.user_id)}
                className={`w-full text-start px-3 py-3 transition-colors border-none cursor-pointer ${
                  active ? "bg-indigo-50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="font-semibold text-[0.9rem] text-[#1e293b]">{r.name}</div>
                <div className="text-[0.75rem] text-[#64748b] mt-0.5">
                  {formatSubmittedAt(r.submission?.submitted_at)}
                </div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[0.7rem] py-0.5 px-2 rounded-full bg-blue-100 text-blue-800">
                    تم التسليم
                  </span>
                  {sc != null && (
                    <span className="text-[0.7rem] py-0.5 px-2 rounded-full bg-emerald-100 text-emerald-800">
                      {sc}/{maxScore}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRow && sub ? (
        <div className="border border-[#e2e8f0] rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e2e8f0] bg-slate-50">
            <h6 className="m-0 font-bold text-[#1e293b]">{selectedRow.name}</h6>
            <p className="m-0 mt-1 text-[0.8rem] text-[#64748b]">
              {selectedRow.university_id ? `الرقم الجامعي: ${selectedRow.university_id} · ` : ""}
              تسليم: {formatSubmittedAt(sub.submitted_at)}
            </p>
          </div>

          <div className="p-4">
            {fileError && (
              <div className="alert-custom alert-danger mb-3 text-[0.85rem]">{fileError}</div>
            )}

            <div
              className="p-3 rounded-lg mb-4"
              style={{
                background: currentScore != null ? "#f0fdf4" : "#eff6ff",
                border: `1px solid ${currentScore != null ? "#bbf7d0" : "#bfdbfe"}`,
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2">
                {currentScore != null ? (
                  <Star size={16} className="text-success" />
                ) : (
                  <CheckCircle2 size={16} className="text-primary" />
                )}
                <strong>{currentScore != null ? "تم التقييم" : "تم التسليم"}</strong>
              </div>

              {(sub.file_url || sub.file_path) && sub.id && (
                <button
                  type="button"
                  className="btn-primary-custom btn-sm-custom d-inline-flex align-items-center gap-2 mb-2"
                  disabled={openingFileId === sub.id}
                  onClick={() => onOpenFile(sub)}
                >
                  <Eye size={14} />
                  {openingFileId === sub.id ? "جاري الفتح..." : "عرض / تحميل الحل"}
                </button>
              )}

              {sub.notes && (
                <div className="text-[0.88rem] mt-2">
                  <span className="text-muted">ملاحظات الطالب: </span>
                  {sub.notes}
                </div>
              )}

              {sub.feedback && (
                <div className="text-[0.88rem] mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                  <span className="font-semibold">ملاحظاتك: </span>
                  {sub.feedback}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#fefce8] border border-[#fde68a]">
              <h6 className="d-flex align-items-center gap-2 mb-3 m-0">
                <Star size={16} className="text-warning" />
                تقييم التسليم
              </h6>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">العلامة (0–{maxScore})</label>
                  <input
                    type="number"
                    min={0}
                    max={maxScore}
                    step={0.5}
                    className="form-control-custom"
                    value={draft.score}
                    onChange={(e) => onDraftChange({ ...draft, score: e.target.value })}
                    placeholder="مثال: 85"
                  />
                </div>
                <div className="col-md-9">
                  <label className="form-label">ملاحظات / تغذية راجعة</label>
                  <textarea
                    className="form-control-custom"
                    rows={2}
                    value={draft.feedback}
                    onChange={(e) => onDraftChange({ ...draft, feedback: e.target.value })}
                    placeholder="اكتب ملاحظاتك للطالب..."
                  />
                </div>
                <div className="col-12">
                  <button
                    type="button"
                    className="btn-primary-custom d-inline-flex align-items-center gap-2"
                    disabled={gradeSavingId === sub.id || draft.score === ""}
                    onClick={() => onGrade(selectedRow.user_id, sub.id)}
                  >
                    {gradeSavingId === sub.id ? (
                      <>
                        <LoadingSpinner size="button" /> جاري التقييم...
                      </>
                    ) : (
                      <>
                        <Star size={16} /> تسجيل التقييم
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center p-10 text-muted border border-dashed rounded-xl bg-slate-50">
          اختر طالباً من القائمة لعرض حله
        </div>
      )}
    </div>
  );
}
