import { useState } from "react";
import { resolveAvatarUrl } from "../../utils/avatarUrl";

/**
 * صورة مستخدم في الدردشة: avatar_url أو الحرف الأول من الاسم (عرض فقط).
 */
export default function ChatUserAvatar({ avatarUrl, name, className = "", children }) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedSrc = resolveAvatarUrl(avatarUrl);
  const hasImg = Boolean(resolvedSrc) && !imgFailed;
  const fallback =
    name && String(name).trim()
      ? String(name).trim().charAt(0).toUpperCase()
      : "؟";

  return (
    <div className={`${className}${hasImg ? " chat-avatar--has-image" : ""}`.trim()}>
      {hasImg ? (
        <img
          src={resolvedSrc}
          alt=""
          className="chat-avatar-img"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      ) : (
        fallback
      )}
      {children}
    </div>
  );
}
