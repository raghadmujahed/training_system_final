export default function PageHeader({ title, subtitle, icon: Icon, background }) {
  return (
    <div style={{
      background: background || "var(--primary)",
      borderRadius: 14,
      padding: "1.25rem 1.5rem",
      color: "#fff",
      marginBottom: "1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "-30%", left: "-8%",
        width: 200, height: 200,
        background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
      {Icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: "rgba(255,255,255,0.12)",
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={22} />
        </div>
      )}
      <div>
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{title}</h1>
        {subtitle && <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}