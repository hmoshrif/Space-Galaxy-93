// ═══════════════════════════════════════════════════════════════════════════
// المخزن — الحالة + التخزين المحلي + تجميد الـ Snapshot + سجل التدقيق (P4/P6)
// (نسخة v1: تخزين محلي؛ في الإنتاج يُستبدَل بـ API + PostgreSQL متعدد المستأجرين)
// ═══════════════════════════════════════════════════════════════════════════
import { DOMAINS, MODEL_VERSION, SCORING_VERSION, ASSESSMENT_TYPES } from './model.js';

const KEY = 'nudj_state_v1';
let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* تجاهل */ }
  return { org: null, assessment: null, audit: [] };
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getState() { return state; }

// معرّف بسيط ثابت التسلسل (بدون Math.random لضمان قابلية التتبّع)
let _seq = 0;
const uid = (p) => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

// سجل تدقيق Append-only (P6)
export function audit(action, detail) {
  state.audit = state.audit || [];
  state.audit.push({ id: uid('a'), at: new Date().toISOString(), action, detail });
  persist();
}

// ─── إنشاء المؤسسة ───
export function createOrg(name, sector) {
  state.org = { id: uid('org'), name, sector, createdAt: new Date().toISOString() };
  audit('create_org', { name, sector });
  persist();
}

// ─── إطلاق تقييم: يُجمّد Snapshot من النموذج + إصدار المعادلة (P4) ───
export function createAssessment(config) {
  const snapshot = JSON.parse(JSON.stringify(DOMAINS)); // نسخة ثابتة
  state.assessment = {
    id: uid('asmt'),
    name: config.name,
    config,                                  // معالج الإعداد: الهدف/الإدارات/المراجع/التاريخ/السرية
    modelVersion: MODEL_VERSION,
    scoringVersion: SCORING_VERSION,
    weights: Object.fromEntries(
      Object.entries(ASSESSMENT_TYPES).map(([k, v]) => [k, v.weight])),
    snapshot,                                // Snapshot المجمّد
    responses: {},                           // questionId -> response
    createdAt: new Date().toISOString(),
    status: 'in_progress',
  };
  audit('create_assessment', { name: config.name, modelVersion: MODEL_VERSION });
  persist();
  return state.assessment;
}

// ─── حفظ إجابة (حفظ تلقائي) — قبل المراجعة ───
export function saveResponse(qId, patch) {
  const a = state.assessment; if (!a) return;
  const prev = a.responses[qId] || { questionId: qId, status: 'draft', evidence: [] };
  a.responses[qId] = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  persist();
}

export function addEvidence(qId, ev) {
  const a = state.assessment; if (!a) return;
  const r = a.responses[qId] || { questionId: qId, status: 'draft', evidence: [] };
  r.evidence = r.evidence || [];
  r.evidence.push({ id: uid('ev'), ...ev, addedAt: new Date().toISOString() });
  a.responses[qId] = r;
  audit('add_evidence', { qId, title: ev.title });
  persist();
}

// ─── تقديم للمراجعة ───
export function submitForReview(qId) {
  const a = state.assessment; if (!a) return;
  const r = a.responses[qId]; if (!r) return;
  r.status = 'submitted';
  audit('submit_review', { qId, proposedScore: r.proposedScore });
  persist();
}

// ─── قرار المراجع: اعتماد أو إعادة (P2) — يخزّن الدرجة قبل/بعد ───
export function reviewDecision(qId, decision, finalScore, note) {
  const a = state.assessment; if (!a) return;
  const r = a.responses[qId]; if (!r) return;
  r.reviewedBefore = r.proposedScore;
  if (decision === 'approve') {
    r.status = 'approved';
    r.finalScore = typeof finalScore === 'number' ? finalScore : r.proposedScore;
    r.approvedAt = new Date().toISOString();
  } else {
    r.status = 'returned';
    r.finalScore = undefined;
  }
  r.reviewNote = note || '';
  audit('review_decision', { qId, decision, before: r.reviewedBefore, after: r.finalScore });
  persist();
}

// ─── إجراءات التحسين (Backlog) ───
export function addAction(action) {
  const a = state.assessment; if (!a) return;
  a.actions = a.actions || [];
  const item = { id: uid('act'), status: 'لم تبدأ', createdAt: new Date().toISOString(), ...action };
  a.actions.push(item);
  audit('add_action', { title: action.title, priority: action.priority });
  persist();
  return item;
}

export function updateAction(id, patch) {
  const a = state.assessment; if (!a) return;
  const it = (a.actions || []).find(x => x.id === id); if (!it) return;
  Object.assign(it, patch);
  audit('update_action', { id, patch });
  persist();
}

// ─── إعادة التعيين (للتجربة) ───
export function reset() {
  state = { org: null, assessment: null, audit: [] };
  persist();
}

export { uid };
