// ═══════════════════════════════════════════════════════════════════════════
// بيانات تجريبية — تُنشئ مؤسسة وتقييماً مكتملاً ومعتمَداً لعرض دورة القيمة فوراً
// ═══════════════════════════════════════════════════════════════════════════
import * as store from './store.js';
import { ALL_QUESTIONS } from './model.js';

// درجات واقعية متفاوتة لإظهار فجوات ونضج
const DEMO_SCORES = {
  q1: 4, q2: 2, q3: 3, q4: 3,
  q5: 3, q6: 2, q7: 4, q8: 3, q9: 2,
  q10: 3, q11: 1, q12: 2, q13: 2,
};

const DEMO_EVIDENCE = {
  q1: { title: 'الخطة الاستراتيجية 2024-2027', type: 'سياسة أو إجراء', owner: 'مكتب الاستراتيجية', date: '2024-01-15' },
  q5: { title: 'دليل بطاقات المؤشرات', type: 'لقطة لوحة معلومات', owner: 'إدارة الأداء', date: '2024-03-10' },
  q7: { title: 'محاضر مراجعة الأداء الربعية', type: 'محضر اجتماع', owner: 'إدارة الأداء', date: '2024-06-01' },
  q11: { title: 'سجل مبادرات التحسين', type: 'سجل تنفيذ', owner: 'مكتب التميز', date: '2024-05-20' },
};

export function seedDemo() {
  store.reset();
  store.createOrg('هيئة الأداء المؤسسي (عرض تجريبي)', 'جهة حكومية');
  store.createAssessment({
    name: 'تقييم نضج إدارة الاستراتيجية والأداء — الدورة الأولى',
    goal: 'قياس النضج وتحديد أولويات التحسين',
    kind: 'تقييم ذاتي',
    departments: 'مكتب الاستراتيجية، إدارة الأداء، مكتب التميز',
    evidenceOwner: 'مكتب الاستراتيجية',
    reviewer: 'مدير إدارة الأداء',
    targetDate: '2026-10-30',
    confidentiality: 'مشترك',
  });

  for (const q of ALL_QUESTIONS) {
    const score = DEMO_SCORES[q.id];
    store.saveResponse(q.id, {
      proposedScore: score,
      comment: 'تقييم مبني على مراجعة الأدلة المتاحة.',
      confidence: score >= 3 ? 4 : 3,
    });
    if (DEMO_EVIDENCE[q.id]) store.addEvidence(q.id, DEMO_EVIDENCE[q.id]);
    store.submitForReview(q.id);
    // المراجع يعتمد الدرجة (بعضها بتعديل طفيف للواقعية)
    store.reviewDecision(q.id, 'approve', score, 'مطابق للأدلة.');
  }

  // مبادرة تحسين نموذجية
  store.addAction({
    title: 'توثيق سلسلة الأهداف والمؤشرات وربطها بالمبادرات',
    gapCapability: 'مواءمة الأهداف',
    priority: 'حرجة',
    owner: 'مدير الاستراتيجية',
    due: '2026-10-15',
    kpi: 'نسبة الأهداف المرتبطة بمؤشرات ≥ 90%',
    evidenceRequired: 'مصفوفة مواءمة معتمدة',
  });
}
