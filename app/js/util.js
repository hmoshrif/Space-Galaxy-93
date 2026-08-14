// ═══════════════════════════════════════════════════════════════════════════
// أدوات مشتركة — بلا اعتماديات
// ═══════════════════════════════════════════════════════════════════════════

// بصمة SHA-256 لملف (لكشف الدليل المكرر)
export async function sha256(arrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function fmtBytes(n) {
  if (n < 1024) return n + ' ب';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' ك.ب';
  return (n / 1024 / 1024).toFixed(1) + ' م.ب';
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

// هل الدليل منتهي الصلاحية؟
export const isExpired = (validUntil) => !!validUntil && validUntil < todayISO();

// قراءة ملف كـ ArrayBuffer + DataURL (للمعاينة)
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(r.result);
    r.readAsArrayBuffer(file);
  });
}
export function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(r.result);
    r.readAsDataURL(file);
  });
}

export const isImage = (type) => /^image\//.test(type || '');
export const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024; // 2 م.ب حد المعاينة المحلية
