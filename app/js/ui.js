// ═══════════════════════════════════════════════════════════════════════════
// طبقة العرض والتوجيه — الشاشات الست + شريط التنقّل + الحفظ التلقائي
// ═══════════════════════════════════════════════════════════════════════════
import * as store from './store.js';
import { DOMAINS, ASSESSMENT_TYPES, EVIDENCE_TYPES, RUBRIC } from './model.js';
import { computeScores, deriveGaps, label } from './scoring.js';
import { heatmap, radar, impactEffort, weightBars, maturityColor } from './charts.js';
import { seedDemo } from './seed.js';

const app = () => document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ─── التوجيه ───
const routes = {
  '': dashboardView, 'setup': setupView, 'assess': assessView,
  'review': reviewView, 'results': resultsView, 'plan': planView, 'audit': auditView,
};

function router() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [route, param] = hash.split('/');
  const view = routes[route] || dashboardView;
  renderShell();
  view(param);
  markActiveNav(route);
  window.scrollTo(0, 0);
}

function markActiveNav(route) {
  $$('.nav a').forEach(a => a.classList.toggle('active',
    a.getAttribute('href') === `#/${route}` || (route === '' && a.getAttribute('href') === '#/')));
}

// ─── الهيكل العام (شريط علوي + تنقّل) ───
function renderShell() {
  const s = store.getState();
  const a = s.assessment;
  const progress = a ? completeness(a) : 0;
  app().innerHTML = `
    <header class="topbar">
      <div class="brand"><span class="logo">◆</span><b>نضج</b><small>منصة إدارة النضج المؤسسي</small></div>
      <div class="top-right">
        ${a ? `<span class="save-chip" id="saveChip">تم الحفظ ✓</span>` : ''}
        <button class="btn-ghost" id="themeBtn" title="الوضع الليلي/النهاري">🌓</button>
      </div>
    </header>
    <nav class="nav" aria-label="التنقّل الرئيسي">
      <a href="#/">لوحة المؤسسة</a>
      <a href="#/assess">التقييم</a>
      <a href="#/review">المراجعة والاعتماد</a>
      <a href="#/results">النتائج</a>
      <a href="#/plan">خطة التحسين</a>
      <a href="#/audit">سجل التدقيق</a>
    </nav>
    <main id="view" class="view">${a ? `<div class="progress-strip"><div class="progress-bar" style="width:${progress}%"></div><span>الإنجاز ${progress}%</span></div>` : ''}</main>
    <footer class="foot">v1 MVP · عربي RTL · WCAG 2.2 AA · تخزين محلي — النسخة الإنتاجية تعمل على Next.js + PostgreSQL متعدد المستأجرين</footer>`;
  $('#themeBtn').onclick = toggleTheme;
}

const viewEl = () => document.getElementById('view');
function setView(html) { viewEl().insertAdjacentHTML('beforeend', `<div class="page">${html}</div>`); }

function completeness(a) {
  const total = a.snapshot.flatMap(d => d.questions).length;
  const done = Object.values(a.responses).filter(r => r.status === 'approved').length;
  return Math.round((done / total) * 100);
}

// ═══════════════ 1) لوحة المؤسسة ═══════════════
function dashboardView() {
  const s = store.getState();
  if (!s.org) return onboardingView();
  const a = s.assessment;
  setView(`
    <div class="hero">
      <div>
        <h1>${esc(s.org.name)}</h1>
        <p class="muted">${esc(s.org.sector)} · لوحة إدارة النضج المؤسسي</p>
      </div>
      <div class="hero-actions">
        ${a ? `<a class="btn" href="#/results">عرض النتائج</a>` : `<a class="btn" href="#/setup">إنشاء تقييم</a>`}
      </div>
    </div>
    ${a ? assessmentCard(a) : `<div class="empty">لا يوجد تقييم بعد. <a href="#/setup">ابدأ الآن ←</a></div>`}
    <section class="loop-diagram">
      <h3>دورة القيمة</h3>
      <div class="loop">
        ${['قياس النضج', 'إثبات بالأدلة', 'اكتشاف الفجوات', 'خطة تحسين', 'متابعة التنفيذ', 'إعادة القياس']
      .map(x => `<span class="loop-step">${x}</span>`).join('<span class="loop-arrow">←</span>')}
      </div>
    </section>`);
}

function assessmentCard(a) {
  const { overall } = computeScores(a.snapshot, a.responses);
  const gaps = deriveGaps(a.snapshot, a.responses);
  return `<div class="cards">
    ${stat('الدرجة الإجمالية', label(overall.score), maturityColor(overall.score))}
    ${stat('نسبة الاكتمال', overall.completeness + '%')}
    ${stat('تغطية الأدلة', overall.evidenceCoverage + '%')}
    ${stat('أكبر الفجوات', gaps.length)}
  </div>
  <div class="card">
    <div class="row-between"><b>${esc(a.name)}</b><span class="badge">${esc(a.config.confidentiality || '')}</span></div>
    <p class="muted small">النموذج: ${esc(a.modelVersion)} · المعادلة: ${esc(a.scoringVersion)} · المراجع: ${esc(a.config.reviewer || '—')}</p>
    <div class="btn-row">
      <a class="btn-sm" href="#/assess">متابعة الإجابة</a>
      <a class="btn-sm ghost" href="#/review">المراجعة</a>
      <a class="btn-sm ghost" href="#/plan">خطة التحسين</a>
    </div>
  </div>`;
}

function stat(label, value, color) {
  return `<div class="stat"><span class="stat-val" style="${color ? `color:${color}` : ''}">${value}</span><span class="stat-lbl">${label}</span></div>`;
}

// ─── التهيئة (Onboarding) ───
function onboardingView() {
  setView(`
    <div class="onboarding">
      <h1>ابدأ رحلة النضج المؤسسي</h1>
      <p class="muted">أنشئ مؤسستك أو استعرض تجربة جاهزة.</p>
      <form id="orgForm" class="form-card">
        <label>اسم المؤسسة<input name="name" required placeholder="مثال: هيئة الأداء المؤسسي"></label>
        <label>القطاع
          <select name="sector"><option>جهة حكومية</option><option>شبه حكومية</option><option>شركة كبيرة</option><option>جهة استشارية</option></select>
        </label>
        <div class="btn-row">
          <button class="btn" type="submit">إنشاء المؤسسة</button>
          <button class="btn ghost" type="button" id="demoBtn">تجربة عرض جاهزة ▶</button>
        </div>
      </form>
    </div>`);
  $('#orgForm').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    store.createOrg(f.get('name'), f.get('sector'));
    location.hash = '#/setup';
  };
  $('#demoBtn').onclick = () => { seedDemo(); location.hash = '#/results'; };
}

// ═══════════════ 2) إعداد التقييم (معالج) ═══════════════
function setupView() {
  const s = store.getState();
  if (!s.org) return (location.hash = '#/');
  setView(`
    <h1>إعداد التقييم</h1>
    <p class="muted">معالج قصير يبني رحلة مناسبة بدل عرض النموذج الكامل للجميع.</p>
    <form id="setupForm" class="form-card wizard">
      <label>اسم التقييم<input name="name" required value="تقييم نضج إدارة الاستراتيجية والأداء — الدورة الأولى"></label>
      <label>الهدف من التقييم<input name="goal" placeholder="قياس النضج وتحديد أولويات التحسين"></label>
      <div class="grid2">
        <label>نوع التقييم<select name="kind"><option>تقييم ذاتي</option><option>تقييم مستقل</option></select></label>
        <label>السرية<select name="confidentiality"><option>مشترك</option><option>سري</option></select></label>
      </div>
      <label>الإدارات المشمولة<input name="departments" placeholder="مكتب الاستراتيجية، إدارة الأداء…"></label>
      <div class="grid2">
        <label>مالك الأدلة<input name="evidenceOwner" placeholder="مكتب الاستراتيجية"></label>
        <label>المراجع المعتمِد<input name="reviewer" placeholder="مدير إدارة الأداء"></label>
      </div>
      <label>التاريخ المستهدف<input name="targetDate" type="date"></label>
      <div class="note-box">النموذج: <b>3 مجالات</b> · <b>${DOMAINS.flatMap(d => d.questions).length} سؤالاً</b> · سيُجمَّد Snapshot ثابت عند الإطلاق.</div>
      <button class="btn" type="submit">إطلاق التقييم →</button>
    </form>`);
  $('#setupForm').onsubmit = (e) => {
    e.preventDefault();
    const cfg = Object.fromEntries(new FormData(e.target));
    store.createAssessment(cfg);
    location.hash = '#/assess';
  };
}

// ═══════════════ 3) شاشة الإجابة (سؤال واحد + قائمة جانبية) ═══════════════
let currentQ = null;
function assessView() {
  const a = store.getState().assessment;
  if (!a) return (location.hash = '#/');
  const questions = a.snapshot.flatMap(d => d.questions.map(q => ({ ...q, domainName: d.name, icon: d.icon })));
  if (!currentQ || !questions.find(q => q.id === currentQ)) currentQ = questions[0].id;
  const q = questions.find(x => x.id === currentQ);
  const r = a.responses[q.id] || { evidence: [] };
  const idx = questions.findIndex(x => x.id === currentQ);

  setView(`
    <div class="assess-layout">
      <aside class="q-sidebar" aria-label="قائمة الأسئلة">
        ${a.snapshot.map(d => `
          <div class="q-group"><h4>${d.icon} ${esc(d.name)}</h4>
            ${d.questions.map(qq => {
    const st = a.responses[qq.id]?.status;
    const dot = st === 'approved' ? '✓' : st === 'submitted' ? '●' : a.responses[qq.id]?.proposedScore ? '◐' : '○';
    return `<button class="q-link ${qq.id === currentQ ? 'active' : ''}" data-q="${qq.id}">
                <span class="q-dot">${dot}</span> ${esc(qq.capability)}</button>`;
  }).join('')}
          </div>`).join('')}
      </aside>
      <section class="q-main">
        <div class="q-head">
          <span class="chip">${q.icon} ${esc(q.domainName)}</span>
          <span class="chip type-${q.type}">${ASSESSMENT_TYPES[q.type].label}</span>
          <span class="muted small">${idx + 1} / ${questions.length}</span>
        </div>
        <h2 class="q-text">${esc(q.text)}</h2>
        <details class="rubric"><summary>معايير المستويات والأدلة المقبولة</summary>
          <ol class="rubric-list">${[1, 2, 3, 4, 5].map(l => `<li><b>المستوى ${l}:</b> ${esc(q.criteria[l])}</li>`).join('')}</ol>
          <p class="small muted">الأدلة المقبولة: ${q.evidence.map(esc).join(' · ')}</p>
        </details>

        <div class="score-row" role="radiogroup" aria-label="الدرجة">
          ${[1, 2, 3, 4, 5].map(l => `<button class="score-btn ${r.proposedScore === l ? 'sel' : ''}" data-score="${l}" title="${esc(RUBRIC[l])}">${l}</button>`).join('')}
          <button class="score-btn na ${r.proposedScore === 'na' ? 'sel' : ''}" data-score="na">لا ينطبق</button>
          <button class="score-btn na ${r.proposedScore === 'dk' ? 'sel' : ''}" data-score="dk">لا أعرف</button>
        </div>

        <div class="grid2">
          <label>مستوى الثقة (1-5)<input type="number" min="1" max="5" id="conf" value="${r.confidence || ''}"></label>
          <label>حالة الإجابة<input value="${statusLabel(r.status)}" disabled></label>
        </div>
        <label>تفسير المقيّم / تعليق<textarea id="comment" rows="2" placeholder="لماذا هذه الدرجة؟">${esc(r.comment || '')}</textarea></label>

        <div class="evidence-box">
          <div class="row-between"><b>الأدلة (${(r.evidence || []).length})</b></div>
          <ul class="ev-list">${(r.evidence || []).map(ev => `<li><b>${esc(ev.title)}</b> <span class="badge sm">${esc(ev.type)}</span> <span class="muted small">${esc(ev.owner || '')} · ${esc(ev.date || '')}</span></li>`).join('') || '<li class="muted small">لا أدلة بعد</li>'}</ul>
          <button class="btn-sm ghost" id="addEvBtn">+ إضافة دليل</button>
          <div id="evForm" class="ev-form" hidden>
            <input id="evTitle" placeholder="عنوان الدليل">
            <select id="evType">${EVIDENCE_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
            <input id="evOwner" placeholder="مالك الدليل">
            <input id="evDate" type="date">
            <button class="btn-sm" id="evSave">حفظ الدليل</button>
          </div>
        </div>

        <div class="q-nav">
          <button class="btn ghost" id="prevBtn" ${idx === 0 ? 'disabled' : ''}>→ السابق</button>
          <button class="btn ghost" id="laterBtn">حفظ والعودة لاحقاً</button>
          <button class="btn" id="nextBtn">حفظ ومتابعة ←</button>
          ${r.proposedScore && r.status !== 'approved' ? `<button class="btn accent" id="submitBtn">تقديم للمراجعة</button>` : ''}
        </div>
      </section>
    </div>`);

  // أحداث
  $$('.q-link').forEach(b => b.onclick = () => { autosave(q.id); currentQ = b.dataset.q; assessRerender(); });
  $$('.score-btn').forEach(b => b.onclick = () => {
    const v = b.dataset.score;
    store.saveResponse(q.id, { proposedScore: v === 'na' || v === 'dk' ? v : +v });
    flashSave(); assessRerender();
  });
  $('#addEvBtn').onclick = () => { $('#evForm').hidden = !$('#evForm').hidden; };
  $('#evSave').onclick = () => {
    const title = $('#evTitle').value.trim(); if (!title) return;
    store.addEvidence(q.id, { title, type: $('#evType').value, owner: $('#evOwner').value, date: $('#evDate').value });
    flashSave(); assessRerender();
  };
  $('#prevBtn').onclick = () => { autosave(q.id); currentQ = questions[idx - 1].id; assessRerender(); };
  $('#nextBtn').onclick = () => { autosave(q.id); if (idx < questions.length - 1) { currentQ = questions[idx + 1].id; assessRerender(); } else location.hash = '#/review'; };
  $('#laterBtn').onclick = () => { autosave(q.id); location.hash = '#/'; };
  const sub = $('#submitBtn'); if (sub) sub.onclick = () => { autosave(q.id); store.submitForReview(q.id); flashSave(); location.hash = '#/review'; };
}

function autosave(qId) {
  const conf = $('#conf'), comment = $('#comment');
  if (conf || comment) store.saveResponse(qId, { confidence: conf?.value ? +conf.value : undefined, comment: comment?.value || '' });
}
function assessRerender() { viewEl().innerHTML = ''; renderShellStrip(); assessView(); }
function renderShellStrip() {
  const a = store.getState().assessment;
  if (a) viewEl().innerHTML = `<div class="progress-strip"><div class="progress-bar" style="width:${completeness(a)}%"></div><span>الإنجاز ${completeness(a)}%</span></div>`;
}
function statusLabel(s) { return ({ draft: 'مسودة', submitted: 'قيد المراجعة', approved: 'معتمَدة', returned: 'مُعادة' })[s] || 'لم تبدأ'; }
function flashSave() { const c = $('#saveChip'); if (c) { c.textContent = 'تم الحفظ ✓'; c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 600); } }

// ═══════════════ 4) المراجعة والاعتماد ═══════════════
function reviewView() {
  const a = store.getState().assessment;
  if (!a) return (location.hash = '#/');
  const items = a.snapshot.flatMap(d => d.questions.map(q => ({ ...q, domainName: d.name })));
  setView(`
    <h1>المراجعة والاعتماد</h1>
    <p class="muted">المراجع يعتمد الدرجة أو يعيدها. الدرجة قبل/بعد تُحفظ في سجل التدقيق (P2).</p>
    <div class="review-list">
      ${items.map(q => {
    const r = a.responses[q.id] || {};
    const canReview = r.status === 'submitted';
    return `<div class="review-item ${r.status || ''}">
          <div class="ri-head">
            <span class="chip type-${q.type}">${ASSESSMENT_TYPES[q.type].label}</span>
            <b>${esc(q.capability)}</b>
            <span class="status-tag st-${r.status || 'none'}">${statusLabel(r.status)}</span>
          </div>
          <p class="small">${esc(q.text)}</p>
          <div class="ri-meta">الدرجة المقترحة: <b>${r.proposedScore ?? '—'}</b> · الثقة: ${r.confidence ?? '—'} · الأدلة: ${(r.evidence || []).length}${r.finalScore != null ? ` · <span class="approved-score">المعتمَدة: ${r.finalScore}</span>` : ''}</div>
          ${canReview ? `<div class="ri-actions">
            <input type="number" min="1" max="5" class="mini" id="fs_${q.id}" value="${typeof r.proposedScore === 'number' ? r.proposedScore : ''}" placeholder="الدرجة">
            <button class="btn-sm" data-approve="${q.id}">اعتماد</button>
            <button class="btn-sm ghost" data-return="${q.id}">إعادة</button>
          </div>` : ''}
        </div>`;
  }).join('')}
    </div>`);
  $$('[data-approve]').forEach(b => b.onclick = () => {
    const id = b.dataset.approve; const fs = $(`#fs_${id}`).value;
    store.reviewDecision(id, 'approve', fs ? +fs : undefined, 'معتمَد.'); reviewView2();
  });
  $$('[data-return]').forEach(b => b.onclick = () => { store.reviewDecision(b.dataset.return, 'return', null, 'يحتاج دليلاً إضافياً.'); reviewView2(); });
}
function reviewView2() { viewEl().innerHTML = ''; renderShellStrip(); reviewView(); }

// ═══════════════ 5) النتائج التنفيذية ═══════════════
function resultsView() {
  const a = store.getState().assessment;
  if (!a) return (location.hash = '#/');
  const res = computeScores(a.snapshot, a.responses);
  const gaps = deriveGaps(a.snapshot, a.responses);
  const o = res.overall;
  setView(`
    <div class="row-between"><h1>النتائج التنفيذية</h1><button class="btn-sm ghost" id="printBtn">🖨️ تقرير PDF</button></div>
    <div class="cards">
      ${stat('الدرجة الإجمالية', label(o.score), maturityColor(o.score))}
      ${stat('مستوى الثقة', label(o.confidence))}
      ${stat('تغطية الأدلة', o.evidenceCoverage + '%')}
      ${stat('الأسئلة المعتمَدة', `${o.counted}/${o.answerable}`)}
    </div>

    <div class="two-col">
      <section class="card"><h3>خريطة النضج الحرارية</h3>${heatmap(res.domains)}</section>
      <section class="card"><h3>المخطط الراداري</h3>${radar(res.domains)}</section>
    </div>

    <section class="card"><h3>شفافية الحساب — أوزان الأنواع</h3>
      <p class="muted small">النضج = ${Object.entries(ASSESSMENT_TYPES).map(([k, v]) => `${Math.round(v.weight * 100)}% ${v.label}`).join(' + ')}</p>
      <div class="weight-bars">${weightBars(a.weights, o.breakdown, ASSESSMENT_TYPES)}</div>
    </section>

    <div class="two-col">
      <section class="card"><h3>أكبر ${Math.min(5, gaps.length)} فجوات</h3>
        <ol class="gap-list">${gaps.slice(0, 5).map(g => `<li><span class="prio prio-${g.priority}">${g.priority}</span> <b>${esc(g.capability)}</b> <span class="muted small">(${esc(g.domainName)} · درجة ${g.score})</span></li>`).join('') || '<li class="muted">لا فجوات 🎉</li>'}</ol>
        ${gaps.length ? `<a class="btn-sm" href="#/plan">تحويل الفجوات إلى خطة ←</a>` : ''}
      </section>
      <section class="card"><h3>مصفوفة الأثر مقابل الجهد</h3>${impactEffort(gaps)}</section>
    </div>

    <section class="card domains-detail"><h3>تفصيل المجالات</h3>
      ${res.domains.map(d => `<div class="dd-row"><span>${d.icon} ${esc(d.name)}</span>
        <div class="dd-bar"><div style="width:${d.score / 5 * 100}%;background:${maturityColor(d.score)}"></div></div>
        <b style="color:${maturityColor(d.score)}">${label(d.score)}</b></div>`).join('')}
    </section>`);
  $('#printBtn').onclick = () => window.print();
}

// ═══════════════ 6) خطة التحسين (Backlog) ═══════════════
function planView() {
  const a = store.getState().assessment;
  if (!a) return (location.hash = '#/');
  const gaps = deriveGaps(a.snapshot, a.responses);
  const actions = a.actions || [];
  const openGaps = gaps.filter(g => !actions.find(ac => ac.gapCapability === g.capability));
  setView(`
    <h1>خطة التحسين</h1>
    <p class="muted">حوّل الفجوات إلى مبادرات بمسؤول وموعد ومؤشر نجاح ودليل إغلاق.</p>

    ${openGaps.length ? `<section class="card"><h3>فجوات جاهزة للتحويل</h3>
      <div class="gap-convert">${openGaps.map(g => `<div class="gc-row">
        <div><span class="prio prio-${g.priority}">${g.priority}</span> <b>${esc(g.capability)}</b> <span class="muted small">درجة ${g.score} → هدف ${g.target}</span></div>
        <button class="btn-sm" data-gap="${g.questionId}">تحويل إلى مبادرة +</button></div>`).join('')}</div>
    </section>` : ''}

    <section class="card"><h3>سجل المبادرات (${actions.length})</h3>
      <table class="backlog"><thead><tr><th>المبادرة</th><th>الأولوية</th><th>المسؤول</th><th>الموعد</th><th>مؤشر النجاح</th><th>الحالة</th></tr></thead>
      <tbody>${actions.map(ac => `<tr>
        <td><b>${esc(ac.title)}</b><br><span class="muted small">دليل الإغلاق: ${esc(ac.evidenceRequired || '—')}</span></td>
        <td><span class="prio prio-${ac.priority}">${esc(ac.priority)}</span></td>
        <td>${esc(ac.owner || '—')}</td><td>${esc(ac.due || '—')}</td><td class="small">${esc(ac.kpi || '—')}</td>
        <td><select class="mini status-sel" data-act="${ac.id}">
          ${['لم تبدأ', 'قيد التنفيذ', 'قيد المراجعة', 'مغلقة'].map(s => `<option ${ac.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></td></tr>`).join('') || '<tr><td colspan="6" class="muted">لا مبادرات بعد</td></tr>'}</tbody></table>
    </section>`);

  $$('[data-gap]').forEach(b => b.onclick = () => {
    const g = gaps.find(x => x.questionId === b.dataset.gap);
    store.addAction({
      title: `معالجة فجوة: ${g.capability}`, gapCapability: g.capability, priority: g.priority,
      owner: '', due: '', kpi: `رفع درجة «${g.capability}» إلى ${g.target}`, evidenceRequired: 'دليل معتمد',
    });
    planView2();
  });
  $$('.status-sel').forEach(s => s.onchange = () => { store.updateAction(s.dataset.act, { status: s.value }); });
}
function planView2() { viewEl().innerHTML = ''; renderShellStrip(); planView(); }

// ═══════════════ سجل التدقيق ═══════════════
function auditView() {
  const s = store.getState();
  setView(`<h1>سجل التدقيق (Append-only)</h1>
    <p class="muted">كل قرار وتعديل واعتماد مُسجَّل — أساس الحوكمة والامتثال.</p>
    <table class="audit"><thead><tr><th>الوقت</th><th>الإجراء</th><th>التفاصيل</th></tr></thead>
    <tbody>${(s.audit || []).slice().reverse().map(e => `<tr><td class="small ltr">${new Date(e.at).toLocaleString('ar-SA')}</td><td><span class="badge sm">${esc(e.action)}</span></td><td class="small">${esc(JSON.stringify(e.detail))}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">لا سجلات</td></tr>'}</tbody></table>`);
}

// ─── الوضع الليلي ───
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('nudj_theme', next); } catch (e) {}
}
(function initTheme() {
  try { const t = localStorage.getItem('nudj_theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
})();

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
