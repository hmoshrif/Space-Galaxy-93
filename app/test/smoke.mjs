// ═══════════════════════════════════════════════════════════════════════════
// اختبار دخان منطقي لدورة القيمة — يُشغَّل في CI (يخرج بحالة != 0 عند الفشل)
// يستبدل واجهات المتصفح (localStorage) ويتحقق من: التقييم ← الأدلة ← الاعتماد
// ← الاحتساب الشفاف ← الفجوات ← تاريخ الدورات.
// ═══════════════════════════════════════════════════════════════════════════
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

let failures = 0;
const assert = (cond, msg) => {
  if (cond) { console.log('  ✓ ' + msg); }
  else { console.error('  ✗ FAIL: ' + msg); failures++; }
};

const base = new URL('../js/', import.meta.url).href;
const storeMod = await import(base + 'store.js');
const { seedDemo } = await import(base + 'seed.js');
const { computeScores, deriveGaps, perceptionGap, distribution } = await import(base + 'scoring.js');
const { ROLES, roleNav } = await import(base + 'roles.js');

console.log('› تهيئة العرض التجريبي');
seedDemo();
const s = storeMod.getState();
const a = s.assessment;

assert(!!s.org, 'أُنشئت المؤسسة');
assert(!!a && a.snapshot.length === 3, 'أُطلق التقييم بـ 3 مجالات مجمّدة (Snapshot)');
assert(a.modelVersion && a.scoringVersion, 'خُزّن إصدار النموذج والمعادلة (P4)');
assert(Object.keys(a.responses).length === 13, 'سُجّلت 13 إجابة');

const approved = Object.values(a.responses).filter(r => r.status === 'approved');
assert(approved.length === 13, 'اعتُمدت كل الإجابات من المراجع (P2)');
assert(approved.every(r => typeof r.finalScore === 'number'), 'لكل إجابة معتمَدة درجة نهائية');

const res = computeScores(a.snapshot, a.responses);
assert(res.overall.score >= 1 && res.overall.score <= 5, `الدرجة الإجمالية ضمن 1..5 (=${res.overall.score})`);
assert(res.overall.completeness === 100, 'نسبة الاكتمال 100%');
assert(res.domains.length === 3, 'حُسبت درجات المجالات الثلاثة');
const b = res.overall.breakdown;
assert(['documentation', 'application', 'perception', 'results'].every(k => k in b), 'تفصيل الأنواع الأربعة موجود (شفافية P3)');

const gaps = deriveGaps(a.snapshot, a.responses);
assert(gaps.length > 0, `اشتُقّت الفجوات آلياً (=${gaps.length})`);
assert(gaps[0].impact >= gaps[gaps.length - 1].impact, 'الفجوات مرتّبة تنازلياً حسب الأثر');
assert(gaps.some(g => g.priority === 'حرجة'), 'رُصدت فجوة حرجة واحدة على الأقل');

const pg = perceptionGap(a.snapshot, a.responses);
assert(pg.length === 3, 'حُسبت فجوة الإدراك لكل مجال');

const dist = distribution(a.snapshot[0].questions, a.responses);
assert(Object.values(dist).reduce((x, y) => x + y, 0) > 0, 'توزيع الدرجات غير فارغ');

assert(storeMod.getHistory().length >= 2, 'تاريخ الدورات يحوي دورتين للمقارنة الزمنية');
assert((a.actions || []).length >= 1, 'أُنشئت مبادرة تحسين واحدة على الأقل');
assert(storeMod.getState().audit.length > 0, 'سجل التدقيق يسجّل الأحداث (P6)');

assert(roleNav('executive').includes('report') && !roleNav('assessor').includes('review'),
  'الأدوار تحجب الشاشات بشكل صحيح');
assert(Object.keys(ROLES).length === 5, 'خمسة أدوار معرّفة');

console.log('› استبيان الإدراك المجهول ورفع الأدلة');
const token = a.surveyToken;
assert(!!token && !!storeMod.findAssessmentByToken(token), 'رمز مشاركة الاستبيان صالح');
const pQ = a.snapshot.flatMap(d => d.questions).filter(q => q.type === 'perception')[0];
storeMod.submitPerception(token, { [pQ.id]: 5 });
storeMod.submitPerception(token, { [pQ.id]: 4 });
assert(storeMod.perceptionCount() === 2, 'سُجّل ردّان مجهولان');
const pgWith = perceptionGap(a.snapshot, a.responses, a.perceptionSubmissions);
assert(pgWith.some(g => g.sampleSize === 2), 'فجوة الإدراك تعكس حجم العينة المجهولة');
// الدليل المكرر: البذرة تُرفق دليلاً لـ q1
const anyEv = Object.values(a.responses).flatMap(r => r.evidence || [])[0];
assert(anyEv === undefined || storeMod.findDuplicateEvidence('sha-غير-موجودة') === null, 'كشف المكرر لا يعطي إيجابيات كاذبة');

console.log(`\n${failures === 0 ? '✅ نجحت كل الفحوص' : `❌ فشل ${failures} فحصاً`}`);
process.exit(failures === 0 ? 0 : 1);
