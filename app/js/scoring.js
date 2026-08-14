// ═══════════════════════════════════════════════════════════════════════════
// محرك الاحتساب الشفاف (scoring-v1)
// النضج = Σ (وزن النوع × متوسط درجات النوع المرجّحة)  — لكل مجاٍل وإجمالاً
// يعتمد فقط على الإجابات المعتمَدة من المراجع (P2). N/A و«لا أعرف» تُستثنى.
// ═══════════════════════════════════════════════════════════════════════════
import { ASSESSMENT_TYPES } from './model.js';

// هل تدخل الإجابة في الحساب؟ (معتمَدة + درجة رقمية)
function isCounted(resp) {
  return resp && resp.status === 'approved' &&
    typeof resp.finalScore === 'number' && resp.finalScore >= 1;
}

// متوسط مرجّح لمجموعة أسئلة مصنّفة حسب النوع
function weightedByType(questions, responses) {
  const buckets = {}; // type -> {sum, w}
  let evidenced = 0, answerable = 0, confidenceSum = 0, confidenceN = 0;

  for (const q of questions) {
    const r = responses[q.id];
    answerable++;
    if (!isCounted(r)) continue;
    const t = q.type;
    buckets[t] = buckets[t] || { sum: 0, w: 0 };
    buckets[t].sum += r.finalScore * (q.weight || 1);
    buckets[t].w += (q.weight || 1);
    if (r.evidence && r.evidence.length) evidenced++;
    if (typeof r.confidence === 'number') { confidenceSum += r.confidence; confidenceN++; }
  }

  // درجة كل نوع (0 إن لا إجابات فيه) ثم مزجها بأوزان الأنواع الفعّالة
  let scoreSum = 0, typeWeightSum = 0;
  const breakdown = {};
  for (const [type, def] of Object.entries(ASSESSMENT_TYPES)) {
    const b = buckets[type];
    if (!b || b.w === 0) { breakdown[type] = null; continue; }
    const typeScore = b.sum / b.w;               // 1..5
    breakdown[type] = round1(typeScore);
    scoreSum += typeScore * def.weight;
    typeWeightSum += def.weight;
  }

  const overall = typeWeightSum > 0 ? scoreSum / typeWeightSum : 0;
  const counted = questions.filter(q => isCounted(responses[q.id])).length;

  return {
    score: round1(overall),
    breakdown,                                   // درجة كل نوع
    evidenceCoverage: counted ? Math.round((evidenced / counted) * 100) : 0,
    confidence: confidenceN ? round1(confidenceSum / confidenceN) : null,
    counted, answerable,
    completeness: answerable ? Math.round((counted / answerable) * 100) : 0,
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

// النتيجة الكاملة للتقييم (تعمل على الـ snapshot المجمّد)
export function computeScores(snapshotDomains, responses) {
  const domains = snapshotDomains.map(d => ({
    id: d.id, name: d.name, icon: d.icon,
    ...weightedByType(d.questions, responses),
  }));

  const all = snapshotDomains.flatMap(d => d.questions);
  const overall = weightedByType(all, responses);

  return {
    overall,
    domains,
    scoringVersion: 'scoring-v1',
  };
}

// توليد الفجوات آلياً: كل سؤال معتمَد بدرجة < عتبة يصبح فجوة مرتّبة بالأولوية
export function deriveGaps(snapshotDomains, responses, threshold = 3) {
  const gaps = [];
  for (const d of snapshotDomains) {
    for (const q of d.questions) {
      const r = responses[q.id];
      if (!r || r.status !== 'approved' || typeof r.finalScore !== 'number') continue;
      if (r.finalScore >= threshold) continue;
      const impact = (q.weight || 1) * (threshold - r.finalScore); // الأثر
      const effort = r.finalScore <= 1 ? 3 : r.finalScore < 2 ? 2 : 1; // تقدير الجهد
      gaps.push({
        questionId: q.id, domainId: d.id, domainName: d.name,
        capability: q.capability, text: q.text,
        score: r.finalScore, target: threshold,
        impact: round1(impact), effort,
        priority: r.finalScore <= 1 ? 'حرجة' : r.finalScore < 2 ? 'عالية' : 'متوسطة',
      });
    }
  }
  return gaps.sort((a, b) => b.impact - a.impact);
}

export const label = (n) => n == null ? '—' : n.toFixed(1);

// توزيع الدرجات داخل مجاٍل (لإظهار التشتت لا المتوسط فقط)
export function distribution(questions, responses) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const q of questions) {
    const r = responses[q.id];
    if (isCounted(r)) counts[r.finalScore]++;
  }
  return counts;
}

// فجوة الإدراك: متوسط أسئلة الإدراك مقابل متوسط الأدلة/التطبيق داخل المجال
export function perceptionGap(snapshotDomains, responses) {
  return snapshotDomains.map(d => {
    const avg = (types) => {
      const qs = d.questions.filter(q => types.includes(q.type) && isCounted(responses[q.id]));
      if (!qs.length) return null;
      return round1(qs.reduce((s, q) => s + responses[q.id].finalScore, 0) / qs.length);
    };
    const perception = avg(['perception']);
    const documented = avg(['documentation', 'application', 'results']);
    return {
      id: d.id, name: d.name, icon: d.icon, perception, documented,
      gap: (perception != null && documented != null) ? round1(perception - documented) : null,
    };
  });
}

// تفصيل مجاٍل: كل سؤال بدرجته وأدلته وملاحظة المراجع (تفسير «لماذا هذه الدرجة؟»)
export function domainDetail(domain, responses) {
  return domain.questions.map(q => {
    const r = responses[q.id] || {};
    return {
      capability: q.capability, text: q.text, type: q.type,
      score: r.finalScore ?? null, evidenceCount: (r.evidence || []).length,
      reviewNote: r.reviewNote || '', confidence: r.confidence ?? null,
    };
  });
}
