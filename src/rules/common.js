/**
 * Կանոնների ընդհանուր օգնականներ։
 * Կանոնի արդյունքի կարգավիճակներ.
 *   fired           — կանոնը աշխատել է (ռիսկային նշում)
 *   not_fired       — կանոնը չի աշխատել
 *   not_evaluated   — չի գնահատվել (արտաքին աղբյուրն անհասանելի է, COM-17, կամ փոփոխականը սահմանված չէ)
 *   not_applicable  — կիրառելի չէ (օր.՝ թեկնածուն հայտարարատու չէ)
 */
export const STATUS = { fired: 'fired', notFired: 'not_fired', notEvaluated: 'not_evaluated', notApplicable: 'not_applicable' };

export const STATUS_LABEL = {
  fired: 'Աշխատել է',
  not_fired: 'Չի աշխատել',
  not_evaluated: 'Չի գնահատվել',
  not_applicable: 'Կիրառելի չէ',
};

export const DIRECTIONS = {
  declarations: 'Հայտարարագրեր',
  parties: 'Կուսակցություններ',
  gifts: 'Նվերների ձևաթղթեր',
  integrity: 'Բարեվարքություն',
};

export const v = {
  amd: (label, value) => ({ label, value, kind: 'amd' }),
  num: (label, value, unit) => ({ label, value, kind: 'num', unit }),
  text: (label, value) => ({ label, value, kind: 'text' }),
  bool: (label, value) => ({ label, value, kind: 'bool' }),
};

export const fired = (values, explanation, extra) => ({ status: STATUS.fired, values, explanation, ...extra });
export const notFired = (values, explanation, extra) => ({ status: STATUS.notFired, values, explanation, ...extra });
export const notApplicable = (explanation, values = []) => ({ status: STATUS.notApplicable, values, explanation });

/** Անվան նորմալացում համադրման համար. փոքրատառ, առանց չակերտների և ավելորդ բացատների (Q-41՝ ճշգրիտ համընկնում) */
export function normName(s) {
  return (s || '')
    .toLocaleLowerCase('hy')
    .replace(/[«»"'“”„]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
/** Անուն-ազգանվան համադրում՝ անկախ հերթականությունից */
export function samePersonName(a, b) {
  const ta = normName(a).split(' ').filter(Boolean).sort().join(' ');
  const tb = normName(b).split(' ').filter(Boolean).sort().join(' ');
  return ta && ta === tb;
}

/** Բանալի բառերի որոնում տեքստային դաշտերում (INT-06). վերադարձնում է գտնված բառերը և դաշտերը */
export function findKeywords(rows, fields, keywords, tableLabel) {
  const hits = [];
  for (const r of rows)
    for (const f of fields) {
      const text = r[f];
      if (!text) continue;
      const low = text.toLocaleLowerCase('hy');
      for (const kw of keywords) if (kw && low.includes(kw.toLocaleLowerCase('hy'))) hits.push({ keyword: kw, field: `${tableLabel}.${f}`, text });
    }
  return hits;
}

export const fmtAmd = (n) => (n === null || n === undefined || Number.isNaN(n) ? '—' : `${Math.round(n).toLocaleString('hy-AM')} ֏`);
