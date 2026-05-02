/** @typedef {{ ref?: string, studentName: string, universityId: string, course: string, site: string }} PrintRow */
/** @typedef {{ title: string, rows: PrintRow[] }} PrintSection */

/** حالات سير العمل التي تُعامَل كـ «مقبولة» في مطبوعات الكتب الرسمية (غير المسودة وغير المرفوضة). */
export const ACCEPTED_PRINT_BOOK_STATUSES = new Set([
  "prelim_approved",
  "batched_pending_send",
  "sent_to_directorate",
  "sent_to_health_ministry",
  "directorate_approved",
  "sent_to_school",
  "school_approved",
]);

export function isTrainingRequestAcceptedForPrint(bookStatus) {
  if (!bookStatus) return false;
  return ACCEPTED_PRINT_BOOK_STATUSES.has(bookStatus);
}

export function filterTrainingRequestsForPrint(requests) {
  return (requests || []).filter((r) => isTrainingRequestAcceptedForPrint(r.book_status));
}

/** للكشف الجماعي حسب المديرية فقط: طلبات «معتمدة مبدئيًا» ولم تُدْرَج بعد في دفعة — يُفصل عن طباعة «كشف الدفعة» لتجنّب تكرار الأسماء. */
export function filterPrelimOnlyForAggregateDirectoratePrint(requests) {
  return (requests || []).filter((r) => r.book_status === "prelim_approved");
}

/**
 * مطبوعة رسمية لدفعة واحدة (أسماء الطلبات المضمّنة في هذه الدفعة فقط).
 * @param {{ batch: object, trainingRequests: object[], senderFooter?: string }} opts
 */
export function printBatchTrainingRequests({ batch, trainingRequests, senderFooter }) {
  const list = trainingRequests || [];
  if (list.length === 0) return false;

  const variant = batch.governing_body === "ministry_of_health" ? "health" : "education";
  const dirLabel = (batch.directorate || "").trim();
  const orgLines =
    batch.governing_body === "ministry_of_health"
      ? [
          "كلية التربية — جامعة الخليل",
          "وزارة الصحة الفلسطينية",
          "قطاع التدريب الميداني — وزارة الصحة",
        ]
      : [
          "كلية التربية — جامعة الخليل",
          "وزارة التربية والتعليم",
          `المنطقة: ${formatEducationRegionSubtitle(dirLabel)}`,
        ];
  const recipientTo =
    batch.governing_body === "ministry_of_health"
      ? "وزارة الصحة الفلسطينية — لمتابعة ملفات التدريب الميداني"
      : formatEducationDirectorateRecipient(dirLabel);
  const bodyIntro =
    variant === "health" ? HEALTH_MINISTRY_TO_CENTERS_PRINT_INTRO : DEFAULT_COORDINATOR_TO_DIRECTORATE_INTRO;

  const rawDate = batch.letter_date || new Date().toISOString().slice(0, 10);
  let dateDisplay = new Date().toLocaleDateString("ar-SA");
  try {
    const d = new Date(String(rawDate).includes("T") ? rawDate : `${rawDate}T12:00:00`);
    if (!Number.isNaN(d.getTime())) dateDisplay = d.toLocaleDateString("ar-SA");
  } catch {
    /* keep default */
  }

  const html = buildFormalTrainingLetterHtml({
    variant,
    orgLines,
    referenceNumber: batch.letter_number || null,
    letterDate: dateDisplay,
    recipientTo,
    subject: `دفعة طلبات تدريب رقم ${batch.id}`,
    bodyIntro,
    sections: [
      {
        title: `كشف الطلبات — الدفعة #${batch.id} (${list.length} طلب)`,
        rows: list.map(trainingRequestToPrintRow),
      },
    ],
    senderFooter: senderFooter || "كلية التربية — جامعة الخليل",
    attachmentsNote: null,
  });
  printHtmlDocument(html);
  return true;
}

/** صياغة رسمية لسطر «إلى / …» حسب منطقة محافظة الخليل في النظام */
const REGION_TO_FORMAL_RECIPIENT = {
  شمال: "مديرية التربية والتعليم — شمال الخليل",
  وسط: "مديرية التربية والتعليم — وسط الخليل",
  جنوب: "مديرية التربية والتعليم — جنوب الخليل",
  يطا: "مديرية التربية والتعليم — يطا",
  دورا: "مديرية التربية والتعليم — دورا",
  حلحول: "مديرية التربية والتعليم — حلحول",
};

export function formatEducationDirectorateRecipient(regionRaw) {
  const r = (regionRaw || "").trim();
  if (!r) return "مديرية التربية والتعليم — محافظة الخليل";
  return REGION_TO_FORMAL_RECIPIENT[r] || `مديرية التربية والتعليم — ${r}`;
}

/** جزء المنطقة فقط لسطر الترويسة (مثل: شمال الخليل) */
export function formatEducationRegionSubtitle(regionRaw) {
  const line = formatEducationDirectorateRecipient(regionRaw);
  const idx = line.indexOf("—");
  if (idx === -1) return (regionRaw || "").trim() || "محافظة الخليل";
  return line.slice(idx + 1).trim();
}

/** نص افتتاحي موجّه من الكلية إلى المديرية (مطبوعة المنسّق) */
export const DEFAULT_COORDINATOR_TO_DIRECTORATE_INTRO =
  "يسرّ كلية التربية بجامعة الخليل أن ترفق لفائلكم الكريمة كشفًا بأسماء الطلبة المتقدّمين للتدريب الميداني في نطاق اختصاصكم الجغرافي، وفق السجلات الرسمية المعتمدة لدى الكلية، لاتخاذ ما ترونه ملاءمًا من إجراءات، مع فائق التحية والتقدير.";

/** نص افتتاحي من المديرية/الجهة إلى الكلية (كشف المعتمدين والمُحالين) */
export const DIRECTORATE_TO_COLLEGE_PRINT_INTRO =
  "نرفق لفائلكم الموقّر كشفًا ببيانات طلبات التدريب الميداني التي أُجيزت من الجهة المختصة لدينا وأُحيلت إلى جهات التدريب الميداني، حرصًا على التنسيق والمتابعة وفق الأصول.";

/** نص مطبوعة وزارة الصحة: المعتمدون يُحالون إلى المراكز الصحية التدريبية (وليس بصيغة مراسلة للكلية كمسار تربوي). */
export const HEALTH_MINISTRY_TO_CENTERS_PRINT_INTRO =
  "يُرفق أدناه كشفٌ بأسماء المتدربين المعتمدين في مسار التدريب الميداني الصحي، والمُحالين إلى المراكز الصحية التدريبية المعنية، وذلك للتنسيق في الاستقبال والمتابعة المهنية وفق الأصول المعتمدة.";

export function trainingSiteFromRequest(r) {
  return r?.training_site?.data ?? r?.training_site ?? null;
}

/** طلب يتبع مسار الصحة فعليًا (موقع تدريب = مركز صحي + جهة وزارة الصحة) */
export function isHealthCenterTrainingPath(r) {
  const site = trainingSiteFromRequest(r);
  if (!site || site.site_type !== "health_center") return false;
  const gb = r.governing_body || site.governing_body;
  return gb === "ministry_of_health";
}

/** إخفاء طلبات المسار الصحي عن واجهة مديريات التربية */
export function filterRequestsForEducationDirectorateUi(requests) {
  return (requests || []).filter((r) => !isHealthCenterTrainingPath(r));
}

/** إظهار طلبات المراكز الصحية فقط في واجهة وزارة الصحة */
export function filterRequestsForHealthMinistryUi(requests) {
  return (requests || []).filter((r) => isHealthCenterTrainingPath(r));
}

function escapeHtml(text) {
  if (text == null || text === "") return "—";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function trainingRequestToPrintRow(r) {
  const s0 = r.students?.[0];
  return {
    ref: r.letter_number || `#${r.id}`,
    studentName: s0?.user?.name || "—",
    universityId: s0?.user?.university_id || "—",
    course: s0?.course?.name || "—",
    site: r.training_site?.data?.name || r.training_site?.name || "—",
  };
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, "Segoe UI", "Tahoma", sans-serif; direction: rtl; color: #111; background: #fff; }
  .sheet { position: relative; min-height: 100vh; padding: 18mm 16mm 22mm; max-width: 210mm; margin: 0 auto; }
  .corner-tl {
    position: absolute; top: 0; left: 0; width: 100mm; height: 100mm;
    background: radial-gradient(ellipse 90% 80% at 0% 0%, rgba(30, 90, 142, 0.38) 0%, transparent 72%);
    pointer-events: none;
  }
  .corner-br {
    position: absolute; bottom: 0; right: 0; width: 110mm; height: 110mm;
    background: radial-gradient(ellipse 85% 75% at 100% 100%, rgba(56, 189, 248, 0.32) 0%, transparent 70%);
    pointer-events: none;
  }
  .head-row { display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #1e3a5f; }
  .seal-wrap { flex-shrink: 0; width: 76px; height: 76px; border-radius: 50%; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; background: #fafafa; overflow: hidden; }
  .seal-wrap img { width: 90%; height: 90%; object-fit: contain; }
  .org-lines { text-align: right; flex: 1; }
  .org-lines .l1 { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
  .org-lines .l2 { font-size: 12px; color: #334155; margin: 0 0 2px; }
  .org-lines .l3 { font-size: 11px; color: #475569; margin: 0; }
  .meta-row { display: flex; justify-content: flex-end; gap: 28px; margin: 12px 0 18px; font-size: 12px; }
  .meta-row span { color: #334155; }
  .recipient { text-align: center; font-size: 13px; font-weight: 700; margin: 16px 0 8px; }
  .subject { text-align: center; font-size: 14px; font-weight: 800; margin: 0 0 18px; color: #0f172a; }
  .greeting { font-size: 12.5px; line-height: 1.9; margin-bottom: 10px; }
  .body-text { font-size: 12.5px; line-height: 2; text-align: justify; margin-bottom: 16px; }
  .section-title { font-size: 12.5px; font-weight: 700; color: #1e3a5f; margin: 16px 0 8px; border-right: 3px solid #1e5a8e; padding-right: 8px; }
  table.list { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
  table.list th, table.list td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: right; }
  table.list th { background: #1e5a8e; color: #fff; font-weight: 700; }
  table.list tr:nth-child(even) td { background: #f8fafc; }
  .closing { margin-top: 20px; font-size: 12.5px; font-weight: 600; }
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; font-size: 11px; color: #475569; }
  .footer-row.sign-only { justify-content: flex-end; }
  .sign { text-align: center; font-size: 12px; }
  .sign .role { font-weight: 700; color: #0f172a; margin-bottom: 6px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { min-height: auto; padding: 12mm; }
  }
`;

/**
 * @param {object} opts
 * @param {'education'|'health'} opts.variant
 * @param {string[]} opts.orgLines
 * @param {string|null|undefined} opts.referenceNumber  نص رقم الكتاب؛ إن وُجد فارغًا لا يُعرض سلسلة تقنية
 * @param {string} opts.letterDate
 * @param {string} opts.recipientTo
 * @param {string} [opts.subject]
 * @param {string} [opts.bodyIntro]
 * @param {PrintSection[]} opts.sections
 * @param {string} [opts.senderFooter]
 * @param {string|null} [opts.attachmentsNote]  إن كانت null أو "" لا يُعرض سطر المرفقات
 */
export function buildFormalTrainingLetterHtml(opts) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const logoPath =
    opts.variant === "health" ? "/branding/ministry-health.jpg" : "/branding/ministry-education.png";
  const logoSrc = origin ? `${origin}${logoPath}` : logoPath;

  const [l1, l2, l3] = [opts.orgLines[0] || "", opts.orgLines[1] || "", opts.orgLines[2] || ""].map(escapeHtml);

  const sectionsHtml = (opts.sections || [])
    .map((sec) => {
      const rows = sec.rows || [];
      if (rows.length === 0) return "";
      const bodyRows = rows
        .map(
          (row, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(row.ref)}</td>
          <td>${escapeHtml(row.studentName)}</td>
          <td>${escapeHtml(row.universityId)}</td>
          <td>${escapeHtml(row.course)}</td>
          <td>${escapeHtml(row.site)}</td>
        </tr>`
        )
        .join("");
      return `
      <div class="section-title">${escapeHtml(sec.title)}</div>
      <table class="list">
        <thead>
          <tr>
            <th>م</th><th>الرقم / المرجع</th><th>اسم الطالب</th><th>الرقم الجامعي</th><th>المساق</th><th>جهة التدريب</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
    })
    .join("");

  const subject = escapeHtml(opts.subject || "طلبات التدريب الميداني");
  const refRaw = opts.referenceNumber;
  const hasRef = refRaw != null && String(refRaw).trim() !== "";
  const refDisplay = hasRef ? escapeHtml(String(refRaw).trim()) : "";
  const date = escapeHtml(opts.letterDate || new Date().toLocaleDateString("ar-SA"));
  const recipient = escapeHtml(opts.recipientTo || "");
  const intro = escapeHtml(opts.bodyIntro || "");
  const sender = escapeHtml(opts.senderFooter || "كلية التربية — جامعة الخليل");
  const attachRaw = opts.attachmentsNote;
  const showAttach = attachRaw != null && String(attachRaw).trim() !== "";

  const defaultIntro =
    "نرفق لكم جدولًا ببيانات طلبات التدريب الميداني كما هو مسجل لدى الكلية، للاطلاع ولمزيد من التنسيق حسب الأصول.";
  const footerRowClass = showAttach ? "footer-row" : "footer-row sign-only";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${subject}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="sheet">
    <div class="corner-tl"></div>
    <div class="corner-br"></div>

    <div class="head-row">
      <div class="seal-wrap">
        <img src="${logoSrc}" alt="" onerror="this.style.display='none'" />
      </div>
      <div class="org-lines">
        ${l1 ? `<p class="l1">${l1}</p>` : ""}
        ${l2 ? `<p class="l2">${l2}</p>` : ""}
        ${l3 ? `<p class="l3">${l3}</p>` : ""}
      </div>
    </div>

    <div class="meta-row">
      <span><strong>التاريخ:</strong> ${date}</span>
      ${hasRef ? `<span><strong>العدد:</strong> ${refDisplay}</span>` : ""}
    </div>

    <div class="recipient">إلى / ${recipient}</div>
    <div class="subject">م / ${subject}</div>

    <p class="greeting">تحية طيبة وبعد،</p>
    ${intro ? `<p class="body-text">${intro}</p>` : `<p class="body-text">${escapeHtml(defaultIntro)}</p>`}

    ${sectionsHtml}

    <p class="closing">مع الاحترام والتقدير،</p>

    <div class="${footerRowClass}">
      ${
        showAttach
          ? `<div class="attach" style="font-size: 11px; color: #64748b; max-width: 45%;"><strong>المرفقات:</strong> ${escapeHtml(String(attachRaw).trim())}</div>`
          : ""
      }
      <div class="sign">
        <div class="role">${sender}</div>
        <div>${date}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printHtmlDocument(fullHtmlString) {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank");
  if (!w) {
    window.alert("يُرجى السماح بالنوافذ المنبثقة لاستخدام الطباعة.");
    return;
  }
  w.document.open();
  w.document.write(fullHtmlString);
  w.document.close();
  w.focus();
  setTimeout(() => {
    try {
      w.print();
    } catch {
      /* ignore */
    }
  }, 250);
}
