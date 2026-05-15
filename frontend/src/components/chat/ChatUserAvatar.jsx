/**
 * صورة مستخدم في الدردشة: avatar_url أو الحرف الأول من الاسم (عرض فقط).
 */
export default function ChatUserAvatar({ avatarUrl, name, className = "", children }) {
  const hasImg = Boolean(avatarUrl);
  const fallback =
    name && String(name).trim()
      ? String(name).trim().charAt(0).toUpperCase()
      : "؟";

  return (
    <div className={`${className}${hasImg ? " chat-avatar--has-image" : ""}`.trim()}>
      {hasImg ? (
        <img src={avatarUrl} alt="" className="chat-avatar-img" decoding="async" />
      ) : (
        fallback
      )}
      {children}
    </div>
  );
}
