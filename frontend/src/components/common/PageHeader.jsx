export default function PageHeader({ title, subtitle, icon: Icon }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 60%, #3b82f6 100%)",
      borderRadius: 20,
      padding: "1.75rem 2.5rem",
      color: "white",
      marginBottom: "1.5rem",
      boxShadow: "0 8px 32px rgba(30,58,95,0.3)",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    }}>
      {Icon && (
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={26} />
        </div>
      )}
      <div>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>{title}</h1>
        {subtitle && <p style={{ margin: "0.25rem 0 0", opacity: 0.9, fontSize: "0.92rem" }}>{subtitle}</p>}
      </div>
    </div>
  );
}