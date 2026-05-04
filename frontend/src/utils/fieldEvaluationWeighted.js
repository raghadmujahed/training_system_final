/**
 * يطابق منطق FieldEvaluationTemplate::weightedTotalFromScores في الـ backend.
 * مجموع من 100 بناءً على أوزان المحاور وسلم الدرجة لكل محور.
 */
export function weightedTotalFromScores(criteria, scores) {
  let list = criteria || [];
  if (!Array.isArray(list)) {
    list = list && typeof list === "object" ? Object.values(list) : [];
  }
  if (!list.length) {
    return Object.values(scores || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }
  let total = 0;
  for (const c of list) {
    const id = c.id;
    const raw = Number(scores[id] ?? scores[String(id)] ?? 0);
    const weight = Number(c.weight ?? 0);
    const scale = Array.isArray(c.scale) && c.scale.length ? c.scale : [1, 2, 3, 4, 5];
    const maxScale = Math.max(...scale.map(Number));
    const minScale = Math.min(...scale.map(Number));
    if (maxScale <= minScale) continue;
    const norm = Math.max(0, Math.min(1, (raw - minScale) / (maxScale - minScale)));
    total += norm * weight;
  }
  return Math.round(total);
}
