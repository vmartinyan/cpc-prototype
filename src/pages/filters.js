/** Ընդհանուր զտման տրամաբանություն (COM-22) */
export function applyFilters(units, f, { text, year, risky, flagged, hasRule }) {
  const q = f.q.trim().toLocaleLowerCase('hy');
  return units.filter((u) => {
    if (q && !text(u).toLocaleLowerCase('hy').includes(q)) return false;
    if (f.year && String(year(u)) !== String(f.year)) return false;
    if (f.risk === 'risky' && !risky(u)) return false;
    if (f.risk === 'flagged' && !flagged(u)) return false;
    if (f.risk === 'clean' && flagged(u)) return false;
    if (f.rule && !hasRule(u, f.rule)) return false;
    return true;
  });
}

export const firedIds = (results) => Object.values(results || {}).filter((r) => r.status === 'fired').map((r) => r.ruleId);

export function downloadCsv(filename, header, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
