/**
 * يطابق منطق FieldEvaluationTemplate::weightedTotalFromScores في الـ backend.
 * مجموع من 100 بناءً على أوزان المحاور وسلم الدرجة لكل محور.
 * يعيد null للقوالب الوصفية بالكامل (response_type: text_pair).
 */
export function weightedTotalFromScores(criteria, scores) {
  let list = criteria || [];
  if (!Array.isArray(list)) {
    list = list && typeof list === "object" ? Object.values(list) : [];
  }
  if (!list.length) {
    let sum = 0;
    for (const v of Object.values(scores || {})) {
      if (typeof v === "number" || (typeof v === "string" && v !== "" && !Number.isNaN(Number(v)))) {
        sum += Number(v);
      }
    }
    return Math.round(sum);
  }
  let total = 0;
  let hadNumeric = false;
  for (const c of list) {
    if (c.response_type === "text_pair") continue;
    const id = c.id;
    hadNumeric = true;
    const raw = Number(scores[id] ?? scores[String(id)] ?? 0);
    const weight = Number(c.weight ?? 0);
    const scale = Array.isArray(c.scale) && c.scale.length ? c.scale : [1, 2, 3, 4, 5];
    const maxScale = Math.max(...scale.map(Number));
    const minScale = Math.min(...scale.map(Number));
    if (maxScale <= minScale) continue;
    const norm = Math.max(0, Math.min(1, (raw - minScale) / (maxScale - minScale)));
    total += norm * weight;
  }
  if (!hadNumeric) return null;
  return Math.round(total);
}

export function isClassroomVisitFormSix(template) {
  return template?.code === "classroom_visit_form_6";
}
