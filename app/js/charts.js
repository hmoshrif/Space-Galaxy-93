// ═══════════════════════════════════════════════════════════════════════════
// رسوم SVG بلا مكتبات خارجية — متوافقة مع RTL والوضعين الفاتح/الداكن
// ألوان الحالة عبر متغيرات CSS لضمان تباين WCAG.
// ═══════════════════════════════════════════════════════════════════════════

// لون النضج حسب الدرجة (0..5)
export function maturityColor(score) {
  if (score >= 4) return 'var(--c-good)';
  if (score >= 3) return 'var(--c-ok)';
  if (score >= 2) return 'var(--c-warn)';
  return 'var(--c-bad)';
}

// خريطة حرارية للمجالات
export function heatmap(domains) {
  const cells = domains.map(d => {
    const s = d.score || 0;
    return `<div class="heat-cell" style="--v:${s}" title="${d.name}: ${s.toFixed(1)}">
      <span class="heat-icon">${d.icon || ''}</span>
      <span class="heat-name">${d.name}</span>
      <strong class="heat-score" style="color:${maturityColor(s)}">${s.toFixed(1)}</strong>
    </div>`;
  }).join('');
  return `<div class="heatmap">${cells}</div>`;
}

// Radar Chart معتدل
export function radar(domains, max = 5) {
  const n = domains.length;
  if (n < 3) return '<p class="muted">يتطلب 3 مجالات على الأقل.</p>';
  const cx = 150, cy = 150, R = 110;
  const angle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

  let rings = '';
  for (let g = 1; g <= max; g++) {
    const pts = domains.map((_, i) => pt(i, R * g / max).map(v => v.toFixed(1)).join(',')).join(' ');
    rings += `<polygon points="${pts}" class="radar-ring"/>`;
  }
  const dataPts = domains.map((d, i) => pt(i, R * (d.score || 0) / max).map(v => v.toFixed(1)).join(',')).join(' ');
  const labels = domains.map((d, i) => {
    const [x, y] = pt(i, R + 22);
    return `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" class="radar-label"
      text-anchor="middle">${d.icon || ''}</text>`;
  }).join('');
  const dots = domains.map((d, i) => {
    const [x, y] = pt(i, R * (d.score || 0) / max);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${maturityColor(d.score || 0)}"/>`;
  }).join('');

  return `<svg viewBox="0 0 300 300" class="radar" role="img" aria-label="مخطط راداري للنضج">
    ${rings}
    <polygon points="${dataPts}" class="radar-data"/>
    ${dots}${labels}
  </svg>`;
}

// مصفوفة الأثر مقابل الجهد
export function impactEffort(gaps) {
  if (!gaps.length) return '<p class="muted">لا فجوات — أداء ناضج ✅</p>';
  const W = 320, H = 260, pad = 34;
  const maxImpact = Math.max(...gaps.map(g => g.impact), 1);
  const x = (effort) => pad + (effort - 0.5) / 3 * (W - pad * 2);
  const y = (impact) => H - pad - (impact / maxImpact) * (H - pad * 2);
  const dots = gaps.map((g, i) => {
    const cx = x(g.effort), cy = y(g.impact);
    return `<g><circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="9"
      fill="${g.priority === 'حرجة' ? 'var(--c-bad)' : g.priority === 'عالية' ? 'var(--c-warn)' : 'var(--c-ok)'}"
      opacity="0.85"><title>${g.capability} (أثر ${g.impact} / جهد ${g.effort})</title></circle>
      <text x="${cx.toFixed(0)}" y="${(cy + 4).toFixed(0)}" class="ie-num" text-anchor="middle">${i + 1}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="ie" role="img" aria-label="مصفوفة الأثر مقابل الجهد">
    <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" class="axis"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H - pad}" class="axis"/>
    <text x="${W - pad}" y="${H - pad + 20}" class="axis-lbl" text-anchor="end">الجهد ←</text>
    <text x="${pad - 6}" y="${pad - 8}" class="axis-lbl">↑ الأثر</text>
    ${dots}
  </svg>`;
}

// أشرطة أوزان الأنواع (شفافية الحساب)
export function weightBars(weights, breakdown, typeMeta) {
  return Object.entries(weights).map(([k, w]) => {
    const meta = typeMeta[k];
    const val = breakdown ? breakdown[k] : null;
    return `<div class="wb-row">
      <span class="wb-label">${meta.label} <small>(${Math.round(w * 100)}%)</small></span>
      <div class="wb-track"><div class="wb-fill" style="width:${val ? (val / 5 * 100) : 0}%"></div></div>
      <span class="wb-val">${val != null ? val.toFixed(1) : '—'}</span>
    </div>`;
  }).join('');
}
