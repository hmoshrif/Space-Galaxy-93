// ═══════════════════════════════════════════════════════════════════════════
// الأدوار والصلاحيات (P6/بند 11) — لا يرى الجميع الواجهة نفسها
// كل دور يحدد الشاشات المرئية والإجراءات المسموحة.
// ═══════════════════════════════════════════════════════════════════════════
export const ROLES = {
  org_admin: {
    label: 'مدير المؤسسة', icon: '🏛️',
    nav: ['', 'assess', 'review', 'results', 'compare', 'plan', 'report', 'audit'],
    can: { answer: true, review: true, editPlan: true, setup: true },
  },
  assessor: {
    label: 'المقيّم', icon: '✍️',
    nav: ['', 'assess', 'results'],
    can: { answer: true, review: false, editPlan: false, setup: false },
  },
  reviewer: {
    label: 'المراجع', icon: '✅',
    nav: ['', 'review', 'results'],
    can: { answer: false, review: true, editPlan: false, setup: false },
  },
  executive: {
    label: 'المدير التنفيذي', icon: '📈',
    nav: ['', 'results', 'compare', 'report'],
    can: { answer: false, review: false, editPlan: false, setup: false },
  },
  auditor: {
    label: 'المدقق', icon: '🔍',
    nav: ['', 'results', 'audit'],
    can: { answer: false, review: false, editPlan: false, setup: false },
  },
};

export const NAV_ITEMS = {
  '': 'لوحة المؤسسة', assess: 'التقييم', review: 'المراجعة والاعتماد',
  results: 'النتائج', compare: 'المقارنة الزمنية', plan: 'خطة التحسين',
  report: 'التقرير التنفيذي', audit: 'سجل التدقيق',
};

export function canRole(role, action) { return !!ROLES[role]?.can[action]; }
export function roleNav(role) { return ROLES[role]?.nav || ROLES.org_admin.nav; }
