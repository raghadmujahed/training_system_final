import { useState, useMemo } from "react";
import {
  BarChart3, Loader2, Users, Building2, BookOpen, XCircle,
  FileText, GraduationCap, MapPin, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Send, AlertTriangle, TrendingUp,
  Activity, Award, Layers, RefreshCw, School,
} from "lucide-react";
import useCoordinatorStatistics from "../../hooks/useCoordinatorStatistics";
import { STATUS_LABELS, STATUS_COLORS, BATCH_STATUS_LABELS, BATCH_STATUS_COLORS } from "../../config/coordinator/statusLabels";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";

const LIMIT = 6;

/* ─── KPI Card ─── */
function KpiCard({ icon: Icon, label, value, sub, gradient, light }) {
  return (
    <div className="relative overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.13)] text-white flex items-start gap-4 py-5 px-[22px] rounded-2xl" style={{ background: gradient }}>
      <div className="absolute -bottom-6 -left-5 w-[120px] h-[120px] rounded-full bg-white/[0.07] pointer-events-none" />
      <div className="w-[46px] h-[46px] rounded-xl bg-white/[0.18] flex items-center justify-center shrink-0">
        <Icon size={22} color="#fff" />
      </div>
      <div>
        <div className="text-[0.75rem] text-white/75 font-semibold mb-1">{label}</div>
        <div className="text-[2rem] font-black leading-none text-white">{value ?? 0}</div>
        {sub && <div className="text-[0.72rem] text-white/60 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Progress Row ─── */
function ProgressRow({ label, count, total, barColor, badge }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-[2px]">
      <div className="flex justify-between items-center mb-[6px]">
        <div className="flex items-center gap-2">
          {badge}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-[0.95rem] text-[var(--text)]">{count}</span>
          <span className="text-[0.7rem] font-bold py-[2px] px-2 rounded-full" style={{ background: barColor + "22", color: barColor }}>{pct}%</span>
        </div>
      </div>
      <div className="h-[7px] rounded-full bg-[#f1f5f9] overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.4,0,.2,1)]" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

/* ─── Panel Card ─── */
function Panel({ icon: Icon, title, accent, count, children, showAll, setShowAll, total }) {
  return (
    <div className="bg-white rounded-2xl border-[1.5px] border-[#e8edf4] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
      <div className="py-4 px-5 border-b border-[#f0f4f8] flex items-center gap-3">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: accent + "18" }}>
          <Icon size={17} color={accent} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-[0.92rem] text-[var(--text)]">{title}</div>
        </div>
        <span className="text-[0.72rem] font-bold py-[3px] px-[10px] rounded-full" style={{ background: accent + "15", color: accent }}>
          {count} عنصر
        </span>
      </div>
      <div className="py-4 px-5 flex flex-col gap-[14px]">
        {children}
      </div>
      {total > LIMIT && (
        <div className="px-5 pb-[14px]">
          <button onClick={() => setShowAll(!showAll)} className="w-full py-2 bg-transparent border border-dashed border-[#d1d9e0] rounded-[10px] text-[#94a3b8] text-[0.8rem] font-semibold cursor-pointer flex items-center justify-center gap-[6px]">
            {showAll ? <><ChevronUp size={14} /> إخفاء</> : <><ChevronDown size={14} /> عرض الكل ({total})</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Batch Status Pill ─── */
function BatchPill({ label, count, bg, text }) {
  return (
    <div className="flex flex-col items-center py-4 px-[10px] rounded-[14px] gap-[6px] text-center flex-[1_1_100px]" style={{ background: bg + "30", border: `1.5px solid ${bg}` }}>
      <span className="text-[1.8rem] font-black leading-none" style={{ color: text }}>{count}</span>
      <span className="text-[0.72rem] font-bold opacity-90" style={{ color: text }}>{label}</span>
    </div>
  );
}

/* ─── Main Component ─── */
export default function CoordinatorStatistics() {
  const {
    loading, error, reload,
    byStatus, byDepartment, bySite, byGoverningBody,
    batchStats, totalStudents, totalSites, activeTrainings,
    requests,
  } = useCoordinatorStatistics();

  const [showAllStatus, setShowAllStatus] = useState(false);
  const [showAllDept, setShowAllDept] = useState(false);
  const [showAllSite, setShowAllSite] = useState(false);
  const [showAllGov, setShowAllGov] = useState(false);

  const totalRequests = requests?.length ?? 0;
  const approvedCount = (byStatus.get("approved") || 0) + (byStatus.get("school_approved") || 0) + (byStatus.get("directorate_approved") || 0);
  const rejectedCount = (byStatus.get("rejected") || 0) + (byStatus.get("coordinator_rejected") || 0) + (byStatus.get("directorate_rejected") || 0) + (byStatus.get("school_rejected") || 0);
  const pendingCount = totalRequests - approvedCount - rejectedCount;
  const approvalRate = totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : 0;

  const statusEntries = Array.from(byStatus.entries()).sort((a, b) => b[1] - a[1]);
  const deptEntries = Array.from(byDepartment.entries()).sort((a, b) => b[1] - a[1]);
  const siteEntries = Array.from(bySite.entries()).sort((a, b) => b[1] - a[1]);
  const govEntries = Array.from(byGoverningBody.entries()).sort((a, b) => b[1] - a[1]);

  const visibleStatus = showAllStatus ? statusEntries : statusEntries.slice(0, LIMIT);
  const visibleDept = showAllDept ? deptEntries : deptEntries.slice(0, LIMIT);
  const visibleSite = showAllSite ? siteEntries : siteEntries.slice(0, LIMIT);
  const visibleGov = showAllGov ? govEntries : govEntries.slice(0, LIMIT);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-[100px] px-5 gap-4">
        <div className="w-16 h-16 rounded-[18px] flex items-center justify-center shadow-[0_8px_24px_rgba(20,42,66,0.25)]" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
          <Loader2 size={30} color="white" className="spin" />
        </div>
        <div className="text-center">
          <p className="m-0 mb-1 font-bold text-[var(--text)] text-[1rem]">جاري تحميل الإحصائيات</p>
          <p className="m-0 text-[var(--text-faint)] text-[0.85rem]">يرجى الانتظار...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden shadow-[0_10px_40px_rgba(15,42,74,0.3)] flex items-center gap-5 py-7 px-8 rounded-[18px] bg-gradient-to-br from-[#0f2a4a] via-[#1a3a5c] to-[#1e4976]">
        <div className="absolute -top-10 -left-10 w-[200px] h-[200px] rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-[60px] right-[15%] w-[260px] h-[260px] rounded-full bg-white/[0.03] pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-white/[0.12] flex items-center justify-center border-[1.5px] border-white/[0.18] shrink-0">
          <BarChart3 size={26} color="white" />
        </div>
        <div className="flex-1">
          <h1 className="m-0 mb-[6px] font-black text-[1.3rem] text-white">لوحة الإحصائيات</h1>
          <p className="m-0 text-[0.85rem] text-white/65">
            ملخص شامل لحالات الطلبات، الطلبة، جهات التدريب، والدفعات
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[#fff1f2] border-[1.5px] border-[#fecdd3] rounded-xl py-3 px-[18px] flex items-center gap-[10px] text-[#be123c]">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[14px]">
        <KpiCard icon={Users} label="إجمالي الطلبة" value={totalStudents}
          gradient="linear-gradient(135deg, #0f2a4a, #1e4976)" />
        <KpiCard icon={FileText} label="إجمالي الطلبات" value={totalRequests}
          gradient="linear-gradient(135deg, #4f46e5, #7c3aed)" />
        <KpiCard icon={Activity} label="تدريبات جارية" value={activeTrainings}
          gradient="linear-gradient(135deg, #0891b2, #0e7490)" />
        <KpiCard icon={Building2} label="جهات التدريب" value={totalSites}
          gradient="linear-gradient(135deg, #b45309, #d97706)" />
        <KpiCard icon={CheckCircle2} label="معتمد" value={approvedCount} sub={`${approvalRate}% من الطلبات`}
          gradient="linear-gradient(135deg, #059669, #10b981)" />
        <KpiCard icon={XCircle} label="مرفوض" value={rejectedCount}
          gradient="linear-gradient(135deg, #dc2626, #ef4444)" />
      </div>

      {/* ── Quick Overview Bar ── */}
      <div className="bg-white rounded-2xl py-5 px-6 border-[1.5px] border-[#e8edf4] shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-[10px] mb-4">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-[#f0f4ff] flex items-center justify-center">
            <TrendingUp size={16} color="#4f46e5" />
          </div>
          <span className="font-bold text-[0.95rem] text-[var(--text)]">نظرة سريعة على حالة الطلبات</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div>
            <div className="flex justify-between mb-[6px] text-[0.82rem] font-semibold">
              <span className="text-[#059669]">معتمد</span>
              <span className="text-[#059669] font-extrabold">{approvedCount} ({approvalRate}%)</span>
            </div>
            <div className="h-[10px] rounded-full bg-[#f1f5f9] overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-800 ease" style={{ width: `${approvalRate}%`, background: "linear-gradient(90deg,#34d399,#10b981)" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-[6px] text-[0.82rem] font-semibold">
              <span className="text-[#f59e0b]">قيد المعالجة</span>
              <span className="text-[#f59e0b] font-extrabold">{pendingCount} ({totalRequests > 0 ? Math.round((pendingCount / totalRequests) * 100) : 0}%)</span>
            </div>
            <div className="h-[10px] rounded-full bg-[#f1f5f9] overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-800 ease" style={{ width: `${totalRequests > 0 ? Math.round((pendingCount / totalRequests) * 100) : 0}%`, background: "linear-gradient(90deg,#fcd34d,#f59e0b)" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-[6px] text-[0.82rem] font-semibold">
              <span className="text-[#ef4444]">مرفوض</span>
              <span className="text-[#ef4444] font-extrabold">{rejectedCount} ({totalRequests > 0 ? Math.round((rejectedCount / totalRequests) * 100) : 0}%)</span>
            </div>
            <div className="h-[10px] rounded-full bg-[#f1f5f9] overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-800 ease" style={{ width: `${totalRequests > 0 ? Math.round((rejectedCount / totalRequests) * 100) : 0}%`, background: "linear-gradient(90deg,#fca5a5,#ef4444)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Grid 2×2 ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">

        {/* By Status */}
        <Panel icon={Clock} title="توزيع حالات الطلبات" accent="#0891b2"
          count={statusEntries.length} showAll={showAllStatus} setShowAll={setShowAllStatus} total={statusEntries.length}>
          {visibleStatus.length === 0 ? (
            <p className="m-0 text-center text-[var(--text-faint)] text-[0.85rem]">لا توجد بيانات</p>
          ) : visibleStatus.map(([status, count]) => {
            const c = STATUS_COLORS[status] || { bg: "#e9ecef", text: "#495057" };
            return (
              <ProgressRow key={status}
                label={STATUS_LABELS[status] || status}
                count={count} total={totalRequests}
                barColor={c.text}
                badge={
                  <span className="py-[3px] px-[10px] rounded-full text-[0.75rem] font-bold" style={{ background: c.bg, color: c.text }}>
                    {STATUS_LABELS[status] || status}
                  </span>
                }
              />
            );
          })}
        </Panel>

        {/* By Governing Body */}
        <Panel icon={MapPin} title="توزيع حسب الجهة الرسمية" accent="#4f46e5"
          count={govEntries.length} showAll={showAllGov} setShowAll={setShowAllGov} total={govEntries.length}>
          {visibleGov.length === 0 ? (
            <p className="m-0 text-center text-[var(--text-faint)] text-[0.85rem]">لا توجد بيانات</p>
          ) : visibleGov.map(([gb, count]) => (
            <ProgressRow key={gb}
              label={getGoverningBodyLabel(gb)}
              count={count} total={totalRequests}
              barColor="#4f46e5"
              badge={<span className="text-[0.82rem] font-semibold text-[#374151]">{getGoverningBodyLabel(gb)}</span>}
            />
          ))}
        </Panel>

        {/* By Department */}
        <Panel icon={GraduationCap} title="توزيع حسب القسم الأكاديمي" accent="#d97706"
          count={deptEntries.length} showAll={showAllDept} setShowAll={setShowAllDept} total={deptEntries.length}>
          {visibleDept.length === 0 ? (
            <p className="m-0 text-center text-[var(--text-faint)] text-[0.85rem]">لا توجد بيانات</p>
          ) : visibleDept.map(([dept, count]) => (
            <ProgressRow key={dept}
              label={dept}
              count={count} total={totalRequests}
              barColor="#d97706"
              badge={<span className="text-[0.82rem] font-semibold text-[#374151]">{dept}</span>}
            />
          ))}
        </Panel>

        {/* By Training Site */}
        <Panel icon={School} title="توزيع حسب جهة التدريب" accent="#059669"
          count={siteEntries.length} showAll={showAllSite} setShowAll={setShowAllSite} total={siteEntries.length}>
          {visibleSite.length === 0 ? (
            <p className="m-0 text-center text-[var(--text-faint)] text-[0.85rem]">لا توجد بيانات</p>
          ) : visibleSite.map(([site, count]) => (
            <ProgressRow key={site}
              label={site}
              count={count} total={totalRequests}
              barColor="#059669"
              badge={<span className="text-[0.82rem] font-semibold text-[#374151]">{site}</span>}
            />
          ))}
        </Panel>
      </div>

      {/* ── Batch Stats ── */}
      <div className="bg-white rounded-2xl border-[1.5px] border-[#e8edf4] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <div className="py-4 px-[22px] border-b border-[#f0f4f8] flex items-center gap-3 bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe]">
          <div className="w-9 h-9 rounded-[10px] bg-[#7c3aed22] flex items-center justify-center">
            <Layers size={17} color="#7c3aed" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[0.92rem] text-[#3b0764]">إحصائيات الدفعات</div>
            <div className="text-[0.75rem] text-[#6d28d9] mt-[1px]">توزيع حالات دفعات الطلبات المُجمّعة</div>
          </div>
          <span className="bg-[#7c3aed20] text-[#7c3aed] text-[0.75rem] font-bold py-1 px-3 rounded-full">
            {batchStats.total} دفعة
          </span>
        </div>
        <div className="py-5 px-[22px]">
          {batchStats.total === 0 ? (
            <div className="text-center py-6 text-[var(--text-faint)]">
              <Layers size={36} className="opacity-20 mb-2" />
              <p className="m-0 text-[0.88rem]">لا توجد دفعات حتى الآن</p>
            </div>
          ) : (
            <div className="flex gap-[10px] flex-wrap">
              <BatchPill label="إجمالي الدفعات" count={batchStats.total} bg="#7c3aed" text="#5b21b6" />
              {Array.from(batchStats.byStatus.entries()).map(([status, count]) => {
                const c = BATCH_STATUS_COLORS[status] || { bg: "#e9ecef", text: "#495057" };
                return (
                  <BatchPill key={status} label={BATCH_STATUS_LABELS[status] || status} count={count} bg={c.bg} text={c.text} />
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
