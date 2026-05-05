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
    <div style={{
      background: gradient,
      borderRadius: 16,
      padding: "20px 22px",
      color: "#fff",
      display: "flex",
      alignItems: "flex-start",
      gap: 16,
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 6px 24px rgba(0,0,0,0.13)",
    }}>
      <div style={{
        position: "absolute", bottom: "-24px", left: "-20px",
        width: 120, height: 120, borderRadius: "50%",
        background: "rgba(255,255,255,0.07)",
        pointerEvents: "none",
      }} />
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: "rgba(255,255,255,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={22} color="#fff" />
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1, color: "#fff" }}>{value ?? 0}</div>
        {sub && <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Progress Row ─── */
function ProgressRow({ label, count, total, barColor, badge }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {badge}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>{count}</span>
          <span style={{
            fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px",
            borderRadius: 99, background: barColor + "22", color: barColor,
          }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${pct}%`,
          background: barColor,
          transition: "width 0.7s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

/* ─── Panel Card ─── */
function Panel({ icon: Icon, title, accent, count, children, showAll, setShowAll, total }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1.5px solid #e8edf4",
      overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #f0f4f8",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: accent + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={17} color={accent} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)" }}>{title}</div>
        </div>
        <span style={{
          background: accent + "15", color: accent,
          fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
        }}>
          {count} عنصر
        </span>
      </div>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
      {total > LIMIT && (
        <div style={{ padding: "0 20px 14px" }}>
          <button onClick={() => setShowAll(!showAll)} style={{
            width: "100%", padding: "8px",
            background: "transparent", border: "1px dashed #d1d9e0",
            borderRadius: 10, color: "#94a3b8",
            fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
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
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "16px 10px", borderRadius: 14,
      background: bg + "30", border: `1.5px solid ${bg}`,
      gap: 6, textAlign: "center", flex: "1 1 100px",
    }}>
      <span style={{ fontSize: "1.8rem", fontWeight: 900, color: text, lineHeight: 1 }}>{count}</span>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: text, opacity: 0.9 }}>{label}</span>
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", gap: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: "linear-gradient(135deg, var(--primary), var(--secondary))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(20,42,66,0.25)",
        }}>
          <Loader2 size={30} color="white" className="spin" />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--text)", fontSize: "1rem" }}>جاري تحميل الإحصائيات</p>
          <p style={{ margin: 0, color: "var(--text-faint)", fontSize: "0.85rem" }}>يرجى الانتظار...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>

      {/* ── Hero ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f2a4a 0%, #1a3a5c 50%, #1e4976 100%)",
        borderRadius: 18, padding: "28px 32px",
        display: "flex", alignItems: "center", gap: 20,
        position: "relative", overflow: "hidden",
        boxShadow: "0 10px 40px rgba(15,42,74,0.3)",
      }}>
        <div style={{ position: "absolute", top: "-40px", left: "-40px", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "15%", width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1.5px solid rgba(255,255,255,0.18)", flexShrink: 0,
        }}>
          <BarChart3 size={26} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: "1.3rem", color: "#fff" }}>لوحة الإحصائيات</h1>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
            ملخص شامل لحالات الطلبات، الطلبة، جهات التدريب، والدفعات
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#fff1f2", border: "1.5px solid #fecdd3",
          borderRadius: 12, padding: "12px 18px",
          display: "flex", alignItems: "center", gap: 10, color: "#be123c",
        }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
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
      <div style={{
        background: "#fff", borderRadius: 16, padding: "20px 24px",
        border: "1.5px solid #e8edf4", boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={16} color="#4f46e5" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>نظرة سريعة على حالة الطلبات</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600 }}>
              <span style={{ color: "#059669" }}>معتمد</span>
              <span style={{ color: "#059669", fontWeight: 800 }}>{approvedCount} ({approvalRate}%)</span>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${approvalRate}%`, background: "linear-gradient(90deg,#34d399,#10b981)", borderRadius: 99, transition: "width 0.8s ease" }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600 }}>
              <span style={{ color: "#f59e0b" }}>قيد المعالجة</span>
              <span style={{ color: "#f59e0b", fontWeight: 800 }}>{pendingCount} ({totalRequests > 0 ? Math.round((pendingCount / totalRequests) * 100) : 0}%)</span>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${totalRequests > 0 ? Math.round((pendingCount / totalRequests) * 100) : 0}%`, background: "linear-gradient(90deg,#fcd34d,#f59e0b)", borderRadius: 99, transition: "width 0.8s ease" }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600 }}>
              <span style={{ color: "#ef4444" }}>مرفوض</span>
              <span style={{ color: "#ef4444", fontWeight: 800 }}>{rejectedCount} ({totalRequests > 0 ? Math.round((rejectedCount / totalRequests) * 100) : 0}%)</span>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${totalRequests > 0 ? Math.round((rejectedCount / totalRequests) * 100) : 0}%`, background: "linear-gradient(90deg,#fca5a5,#ef4444)", borderRadius: 99, transition: "width 0.8s ease" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Grid 2×2 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>

        {/* By Status */}
        <Panel icon={Clock} title="توزيع حالات الطلبات" accent="#0891b2"
          count={statusEntries.length} showAll={showAllStatus} setShowAll={setShowAllStatus} total={statusEntries.length}>
          {visibleStatus.length === 0 ? (
            <p style={{ margin: 0, textAlign: "center", color: "var(--text-faint)", fontSize: "0.85rem" }}>لا توجد بيانات</p>
          ) : visibleStatus.map(([status, count]) => {
            const c = STATUS_COLORS[status] || { bg: "#e9ecef", text: "#495057" };
            return (
              <ProgressRow key={status}
                label={STATUS_LABELS[status] || status}
                count={count} total={totalRequests}
                barColor={c.text}
                badge={
                  <span style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>
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
            <p style={{ margin: 0, textAlign: "center", color: "var(--text-faint)", fontSize: "0.85rem" }}>لا توجد بيانات</p>
          ) : visibleGov.map(([gb, count]) => (
            <ProgressRow key={gb}
              label={getGoverningBodyLabel(gb)}
              count={count} total={totalRequests}
              barColor="#4f46e5"
              badge={<span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{getGoverningBodyLabel(gb)}</span>}
            />
          ))}
        </Panel>

        {/* By Department */}
        <Panel icon={GraduationCap} title="توزيع حسب القسم الأكاديمي" accent="#d97706"
          count={deptEntries.length} showAll={showAllDept} setShowAll={setShowAllDept} total={deptEntries.length}>
          {visibleDept.length === 0 ? (
            <p style={{ margin: 0, textAlign: "center", color: "var(--text-faint)", fontSize: "0.85rem" }}>لا توجد بيانات</p>
          ) : visibleDept.map(([dept, count]) => (
            <ProgressRow key={dept}
              label={dept}
              count={count} total={totalRequests}
              barColor="#d97706"
              badge={<span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{dept}</span>}
            />
          ))}
        </Panel>

        {/* By Training Site */}
        <Panel icon={School} title="توزيع حسب جهة التدريب" accent="#059669"
          count={siteEntries.length} showAll={showAllSite} setShowAll={setShowAllSite} total={siteEntries.length}>
          {visibleSite.length === 0 ? (
            <p style={{ margin: 0, textAlign: "center", color: "var(--text-faint)", fontSize: "0.85rem" }}>لا توجد بيانات</p>
          ) : visibleSite.map(([site, count]) => (
            <ProgressRow key={site}
              label={site}
              count={count} total={totalRequests}
              barColor="#059669"
              badge={<span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{site}</span>}
            />
          ))}
        </Panel>
      </div>

      {/* ── Batch Stats ── */}
      <div style={{
        background: "#fff", borderRadius: 16,
        border: "1.5px solid #e8edf4", overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
      }}>
        <div style={{
          padding: "16px 22px", borderBottom: "1px solid #f0f4f8",
          display: "flex", alignItems: "center", gap: 12,
          background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#7c3aed22",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Layers size={17} color="#7c3aed" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#3b0764" }}>إحصائيات الدفعات</div>
            <div style={{ fontSize: "0.75rem", color: "#6d28d9", marginTop: 1 }}>توزيع حالات دفعات الطلبات المُجمّعة</div>
          </div>
          <span style={{
            background: "#7c3aed20", color: "#7c3aed",
            fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: 99,
          }}>
            {batchStats.total} دفعة
          </span>
        </div>
        <div style={{ padding: "20px 22px" }}>
          {batchStats.total === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>
              <Layers size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: "0.88rem" }}>لا توجد دفعات حتى الآن</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
