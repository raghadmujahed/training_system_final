import { useState } from "react";
import {
  BarChart3, Loader2, Users, Building2, BookOpen, XCircle,
  FileText, GraduationCap, MapPin, ChevronDown, ChevronUp,
  TrendingUp, CheckCircle2, Clock, Send, AlertTriangle,
} from "lucide-react";
import useCoordinatorStatistics from "../../hooks/useCoordinatorStatistics";
import { STATUS_LABELS, STATUS_COLORS, BATCH_STATUS_LABELS, BATCH_STATUS_COLORS } from "../../config/coordinator/statusLabels";
import { getGoverningBodyLabel } from "../../config/coordinator/governingBodies";

const LIMIT = 5;

/* ─────────────── Summary Card ─────────────── */
function SummaryCard({ icon: Icon, label, value, gradient }) {
  return (
    <div style={{
      background: gradient,
      borderRadius: 16,
      padding: "18px 20px",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      gap: 14,
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", right: -18, bottom: -18,
        width: 90, height: 90, borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        pointerEvents: "none",
      }} />
      <div style={{
        width: 50, height: 50, borderRadius: 14,
        background: "rgba(255,255,255,0.22)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={24} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.78rem", opacity: 0.88, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, lineHeight: 1 }}>{value ?? 0}</div>
      </div>
    </div>
  );
}

/* ─────────────── Row Bar ─────────────── */
function RowBar({ label, count, total, colorBg, colorText }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      background: "#fff",
      borderRadius: 10,
      border: "1px solid #edf0f4",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <span>{label}</span>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{count}</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: "#f0f2f5", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${pct}%`,
            background: colorBg || "var(--primary)",
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>
      <div style={{
        minWidth: 38, textAlign: "center",
        fontSize: "0.72rem", fontWeight: 700,
        color: colorText || "var(--primary)",
        background: colorBg ? colorBg + "33" : "#e8edf5",
        borderRadius: 8, padding: "3px 6px",
      }}>
        {pct}%
      </div>
    </div>
  );
}

/* ─────────────── Section Card ─────────────── */
function StatSection({ icon: Icon, title, iconGradient, items, renderRow, showAll, setShowAll, accentColor }) {
  const visible = showAll ? items : items.slice(0, LIMIT);
  const hasMore = items.length > LIMIT;
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #edf0f4",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "15px 18px 13px",
        borderBottom: "1px solid #f0f2f5",
        display: "flex", alignItems: "center", gap: 10,
        background: "linear-gradient(135deg, #fafbfc 0%, #f4f6f9 100%)",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: iconGradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          flexShrink: 0,
        }}>
          <Icon size={18} />
        </div>
        <h6 style={{ margin: 0, fontWeight: 700, fontSize: "0.93rem", color: "var(--text)" }}>{title}</h6>
        <span style={{
          marginRight: "auto",
          background: accentColor ? accentColor + "22" : "#e8edf5",
          color: accentColor || "var(--primary)",
          fontSize: "0.72rem", fontWeight: 700,
          borderRadius: 99, padding: "2px 9px",
        }}>
          {items.length} عنصر
        </span>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)", fontSize: "0.85rem" }}>
            لا توجد بيانات
          </div>
        ) : (
          visible.map((item, idx) => renderRow(item, idx))
        )}
      </div>
      {hasMore && (
        <div style={{ padding: "0 14px 14px" }}>
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", padding: "8px",
              background: "transparent",
              border: "1.5px dashed #cbd5e1",
              borderRadius: 10,
              color: "var(--info)", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            {showAll
              ? <><ChevronUp size={15} /> إخفاء</>
              : <><ChevronDown size={15} /> عرض الكل ({items.length})</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Batch Mini Card ─────────────── */
function BatchMiniCard({ label, count, colors }) {
  return (
    <div style={{
      padding: "16px 12px",
      borderRadius: 14,
      border: `1.5px solid ${colors.bg}`,
      background: colors.bg + "55",
      textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    }}>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: colors.text }}>{count}</div>
      <div style={{ fontSize: "0.74rem", fontWeight: 600, color: colors.text, opacity: 0.85 }}>{label}</div>
    </div>
  );
}

/* ─────────────── Main Component ─────────────── */
export default function CoordinatorStatistics() {
  const {
    loading, error,
    byStatus, byDepartment, bySite, byGoverningBody,
    batchStats, totalStudents, totalSites, activeTrainings,
    requests,
  } = useCoordinatorStatistics();

  const [showAllStatus, setShowAllStatus] = useState(false);
  const [showAllDept, setShowAllDept] = useState(false);
  const [showAllSite, setShowAllSite] = useState(false);
  const [showAllGov, setShowAllGov] = useState(false);

  const totalRequests = requests?.length ?? 0;
  const rejectedCount = byStatus.get("rejected") || 0;
  const approvedCount = byStatus.get("approved") || 0;

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "100px 20px", gap: 14,
      }}>
        <Loader2 size={42} className="spin" style={{ color: "var(--primary)" }} />
        <p style={{ color: "var(--text-faint)", fontSize: "0.95rem", margin: 0 }}>جاري تحميل الإحصائيات...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ── Hero ── */}
      <div style={{
        background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
        borderRadius: 18,
        padding: "24px 28px",
        color: "#fff",
        display: "flex", alignItems: "center", gap: 18,
        boxShadow: "0 6px 24px rgba(20,42,66,0.18)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", left: -30, top: -30,
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(255,255,255,0.05)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", right: 20, bottom: -40,
          width: 120, height: 120, borderRadius: "50%",
          background: "rgba(255,255,255,0.06)", pointerEvents: "none",
        }} />
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <BarChart3 size={30} />
        </div>
        <div>
          <h2 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: "1.3rem" }}>الإحصائيات العامة</h2>
          <p style={{ margin: 0, opacity: 0.85, fontSize: "0.88rem" }}>
            ملخص شامل لحالات الطلبات والطلبة وجهات التدريب والدفعات
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#fff5f5", border: "1px solid #fecaca",
          borderRadius: 12, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10,
          color: "#c0392b", fontSize: "0.88rem",
        }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 14 }}>
        <SummaryCard
          icon={Users} label="إجمالي الطلبة" value={totalStudents}
          gradient="linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)"
        />
        <SummaryCard
          icon={FileText} label="إجمالي الطلبات" value={totalRequests}
          gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
        />
        <SummaryCard
          icon={BookOpen} label="تدريبات جارية" value={activeTrainings}
          gradient="linear-gradient(135deg, #059669 0%, #10b981 100%)"
        />
        <SummaryCard
          icon={Building2} label="جهات التدريب" value={totalSites}
          gradient="linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
        />
        <SummaryCard
          icon={CheckCircle2} label="معتمد" value={approvedCount}
          gradient="linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)"
        />
        <SummaryCard
          icon={XCircle} label="مرفوض" value={rejectedCount}
          gradient="linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
        />
      </div>

      {/* ── Stats Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>

        {/* By Status */}
        <StatSection
          icon={Clock}
          title="حسب حالة الكتاب"
          iconGradient="linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)"
          accentColor="#0891b2"
          items={Array.from(byStatus.entries())}
          showAll={showAllStatus}
          setShowAll={setShowAllStatus}
          renderRow={([status, count]) => {
            const colors = STATUS_COLORS[status] || { bg: "#e9ecef", text: "#495057" };
            return (
              <RowBar
                key={status}
                label={
                  <span style={{
                    background: colors.bg, color: colors.text,
                    padding: "3px 10px", borderRadius: 99,
                    fontSize: "0.76rem", fontWeight: 700,
                  }}>
                    {STATUS_LABELS[status] || status}
                  </span>
                }
                count={count}
                total={totalRequests}
                colorBg={colors.bg}
                colorText={colors.text}
              />
            );
          }}
        />

        {/* By Governing Body */}
        <StatSection
          icon={MapPin}
          title="حسب الجهة الرسمية"
          iconGradient="linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%)"
          accentColor="#1d4ed8"
          items={Array.from(byGoverningBody.entries())}
          showAll={showAllGov}
          setShowAll={setShowAllGov}
          renderRow={([gb, count]) => (
            <RowBar
              key={gb}
              label={<span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-soft)" }}>{getGoverningBodyLabel(gb)}</span>}
              count={count}
              total={totalRequests}
              colorBg="#dbeafe"
              colorText="#1d4ed8"
            />
          )}
        />

        {/* By Department */}
        <StatSection
          icon={GraduationCap}
          title="حسب القسم الأكاديمي"
          iconGradient="linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
          accentColor="#d97706"
          items={Array.from(byDepartment.entries())}
          showAll={showAllDept}
          setShowAll={setShowAllDept}
          renderRow={([dept, count]) => (
            <RowBar
              key={dept}
              label={<span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-soft)" }}>{dept}</span>}
              count={count}
              total={totalRequests}
              colorBg="#fef3c7"
              colorText="#92400e"
            />
          )}
        />

        {/* By Training Site */}
        <StatSection
          icon={Building2}
          title="حسب جهة التدريب"
          iconGradient="linear-gradient(135deg, #059669 0%, #10b981 100%)"
          accentColor="#059669"
          items={Array.from(bySite.entries())}
          showAll={showAllSite}
          setShowAll={setShowAllSite}
          renderRow={([site, count]) => (
            <RowBar
              key={site}
              label={<span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-soft)" }}>{site}</span>}
              count={count}
              total={totalRequests}
              colorBg="#d1fae5"
              colorText="#065f46"
            />
          )}
        />
      </div>

      {/* ── Batch Stats ── */}
      <div style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #edf0f4",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "15px 20px 13px",
          borderBottom: "1px solid #f0f2f5",
          display: "flex", alignItems: "center", gap: 10,
          background: "linear-gradient(135deg, #fafbfc 0%, #f4f6f9 100%)",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #5b3a8c 0%, #8b5fcf 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}>
            <Send size={17} />
          </div>
          <h6 style={{ margin: 0, fontWeight: 700, fontSize: "0.93rem", color: "var(--text)" }}>إحصائيات الدفعات</h6>
          <span style={{
            marginRight: "auto",
            background: "#ede9fe", color: "#5b21b6",
            fontSize: "0.72rem", fontWeight: 700,
            borderRadius: 99, padding: "2px 9px",
          }}>
            {batchStats.total} دفعة
          </span>
        </div>
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
            <BatchMiniCard
              label="إجمالي الدفعات"
              count={batchStats.total}
              colors={{ bg: "#ede9fe", text: "#5b21b6" }}
            />
            {Array.from(batchStats.byStatus.entries()).map(([status, count]) => {
              const colors = BATCH_STATUS_COLORS[status] || { bg: "#e9ecef", text: "#495057" };
              return (
                <BatchMiniCard
                  key={status}
                  label={BATCH_STATUS_LABELS[status] || status}
                  count={count}
                  colors={colors}
                />
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
