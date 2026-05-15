import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { uploadProfileAvatar, deleteProfileAvatar, getErrorMessage } from "../../services/api";
import { writeStoredUser } from "../../utils/session";
import useAppToast from "../../hooks/useAppToast";

function getInitials(name) {
  if (!name) return "؟";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const btnFocus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#142a42]/35 focus-visible:ring-offset-2";

/**
 * تعديل الصورة الشخصية من صفحة الملف الشخصي فقط (رفع / حذف عبر الـ API).
 */
export default function ProfileAvatarEditor({ displayName, avatarUrl }) {
  const toast = useAppToast();
  const inputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const revokePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    return () => revokePreview();
  }, [revokePreview]);

  const displaySrc = previewUrl || avatarUrl || null;
  const hasServerAvatar = Boolean(avatarUrl);
  const hasPending = Boolean(pendingFile);

  const openFilePicker = () => inputRef.current?.click();

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const okType =
      /^(image\/(jpeg|png|webp)|image\/jpg)$/i.test(file.type) ||
      /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!okType) {
      toast.error("يُسمح بصور JPG أو PNG أو WebP فقط.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("الحجم الأقصى للصورة 2 ميغابايت.");
      return;
    }

    revokePreview();
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearPending = () => {
    setPendingFile(null);
    revokePreview();
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!pendingFile) {
      toast.info("اختر صورة أولاً.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", pendingFile);
      const user = await uploadProfileAvatar(fd);
      if (user && typeof user === "object") {
        writeStoredUser(user);
      }
      clearPending();
      toast.success("تم حفظ الصورة الشخصية.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (hasPending) {
      clearPending();
      return;
    }
    if (!hasServerAvatar) return;

    setDeleting(true);
    try {
      const user = await deleteProfileAvatar();
      if (user && typeof user === "object") {
        writeStoredUser(user);
      }
      toast.success("تمت إزالة الصورة الشخصية.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-gray-200/90 bg-gradient-to-br from-slate-50/95 via-white to-[#f8fafc] p-4 sm:p-5 shadow-sm ring-1 ring-black/[0.03]"
    >
      <h3 className="m-0 mb-4 text-sm font-bold text-[#142a42] sm:text-base">الصورة الشخصية</h3>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={openFilePicker}
              className={`group relative flex h-[7rem] w-[7rem] sm:h-[7.5rem] sm:w-[7.5rem] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-[#142a42] to-[#1e3a5f] text-2xl font-bold text-white shadow-md transition-shadow hover:shadow-lg ${btnFocus}`}
              aria-label="اختيار صورة شخصية"
            >
              {displaySrc ? (
                <img src={displaySrc} alt="" className="h-full w-full object-cover" decoding="async" />
              ) : (
                <span className="text-2xl sm:text-3xl">{getInitials(displayName)}</span>
              )}
              <span
                className="pointer-events-none absolute bottom-1 end-1 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/90 bg-white text-[#142a42] shadow-md"
                aria-hidden
              >
                <Pencil size={14} strokeWidth={2.5} className="opacity-90" />
              </span>
            </button>
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPickFile} />
          </div>

          <button
            type="button"
            onClick={openFilePicker}
            className={`text-xs font-semibold text-[#142a42]/80 underline-offset-2 hover:text-[#142a42] hover:underline ${btnFocus} rounded px-1`}
          >
            تغيير الصورة
          </button>

          <p className="m-0 max-w-[14rem] text-center text-[11px] leading-relaxed text-gray-500 sm:text-xs">
            JPG أو PNG أو WebP — حتى 2MB
          </p>
        </div>

        <div className="hidden min-h-[7rem] w-px shrink-0 bg-gray-200/80 sm:block" aria-hidden />

        <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
          {hasPending && (
            <div className="flex w-full max-w-xs flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                disabled={uploading}
                onClick={handleSave}
                className={`inline-flex min-h-[2.25rem] items-center justify-center gap-1.5 rounded-lg bg-[#142a42] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#1e3a5f] disabled:opacity-55 sm:text-sm ${btnFocus}`}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : null}
                حفظ الصورة
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={clearPending}
                className={`inline-flex min-h-[2.25rem] items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#142a42] transition-colors hover:bg-gray-50 disabled:opacity-55 sm:text-sm ${btnFocus}`}
              >
                إلغاء
              </button>
            </div>
          )}

          {hasServerAvatar && !hasPending && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleRemove}
              className={`mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-55 sm:text-sm ${btnFocus}`}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              إزالة الصورة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
