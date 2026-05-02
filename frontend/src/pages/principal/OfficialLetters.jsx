import { Fragment, useEffect, useState } from "react";
import { getOfficialLetters, receiveOfficialLetter } from "../../services/api";

const normalizeLetter = (item) => ({
  id: item.id,
  subject:
    item.training_request?.data?.letter_number ||
    item.training_request?.letter_number ||
    item.letter_number ||
    "بدون عنوان",
  sender: item.sent_by?.data?.name || item.sent_by?.name || "غير محدد",
  date: item.letter_date || item.created_at || "—",
  status: item.status || "sent_to_school",
  statusLabel: item.status_label || "مرسل للمدرسة",
  content: item.content || "",
});

const OfficialLetters = () => {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [expandedLetterId, setExpandedLetterId] = useState(null);

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const data = await getOfficialLetters({ type: "to_school", per_page: 100 });
      const list = Array.isArray(data?.data) ? data.data : [];
      setLetters(list.map(normalizeLetter));
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to load school letters:", error);
      setErrorMessage("تعذر تحميل طلبات التدريب.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    if (status === "sent_to_school") return "badge-custom badge-info";
    if (status === "school_received") return "badge-custom badge-success";
    if (status === "completed") return "badge-custom badge-soft";
    return "badge-custom badge-warning";
  };

  const handleReceive = async (letter) => {
    try {
      setSavingId(letter.id);
      setSavedMessage("");
      setErrorMessage("");
      await receiveOfficialLetter(letter.id, {
        received_at: new Date().toISOString(),
        status: "school_received",
      });
      setSavedMessage("تم استلام الكتاب وتحديث حالته بنجاح.");
      await fetchLetters();
    } catch (error) {
      console.error("Failed to receive official letter:", error);
      setErrorMessage(error?.response?.data?.message || "تعذر استلام الكتاب.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleContent = (letterId) => {
    setExpandedLetterId((current) => (current === letterId ? null : letterId));
  };

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">طلبات التدريب</h1>
        <p className="page-subtitle">
          متابعة طلبات التدريب الواردة من المديرية أو الكلية وإدارة حالتها.
        </p>
      </div>

      <div className="section-card">
        <h4>إدارة طلبات التدريب</h4>
        {loading ? (
          <div className="alert-custom alert-info">جاري تحميل طلبات التدريب...</div>
        ) : (
          <div className="table-wrapper">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>عنوان الكتاب</th>
                  <th>الجهة المرسلة</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>المحتوى</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {letters.map((letter) => (
                  <Fragment key={letter.id}>
                    <tr key={letter.id}>
                      <td className="fw-bold">{letter.subject}</td>
                      <td>{letter.sender}</td>
                      <td>{letter.date}</td>
                      <td>
                        <span className={getStatusClass(letter.status)}>
                          {letter.statusLabel}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary-custom btn-sm-custom"
                          onClick={() => toggleContent(letter.id)}
                        >
                          {expandedLetterId === letter.id ? "إخفاء المحتوى" : "عرض المحتوى"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-primary-custom btn-sm-custom"
                          onClick={() => handleReceive(letter)}
                          disabled={
                            savingId === letter.id || letter.status === "school_received"
                          }
                        >
                          {savingId === letter.id
                            ? "جاري التحديث..."
                            : letter.status === "school_received"
                              ? "تم الاستلام"
                              : "تأكيد الاستلام"}
                        </button>
                      </td>
                    </tr>
                    {expandedLetterId === letter.id && (
                      <tr>
                        <td colSpan="6">
                          <div
                            style={{
                              background: "#f8f9fa",
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              padding: 16,
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.8,
                            }}
                          >
                            {letter.content || "لا يوجد محتوى محفوظ لهذا الكتاب."}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}

                {letters.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center">
                      لا توجد كتب رسمية حاليًا
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {savedMessage && (
          <div className="alert-custom alert-success mt-3">{savedMessage}</div>
        )}
        {errorMessage && (
          <div className="alert-custom alert-danger mt-3">{errorMessage}</div>
        )}
      </div>
    </>
  );
};

export default OfficialLetters;
