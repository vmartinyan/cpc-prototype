/**
 * Հայտարարագրերի գնահատման պահված արդյունքներ (վերագնահատում)։
 * Իրական միջավայրում գնահատումը ռեսուրսատար է, ուստի այն կենդանի չէ. արդյունքը պահվում է և թարմացվում է
 * «Վերագնահատում» կոճակով (կամ գիշերային ավտոմատ գործընթացով, որը նախատիպում չկա)։
 *   • կանոնների, փոփոխականների, տույժերի, արտաքին տվյալների փոփոխությունը պահված արդյունքը չի փոխում.
 *     հայտարարագիրը նշվում է «պահանջվում է վերագնահատում»
 *   • նոր հայտարարագիրը (որի համար պահված արդյունք չկա) գնահատվում է ավտոմատ
 *   • կոնկրետ հայտարարագրի ձեռքով նշումը վերագնահատում է հենց այդ հայտարարագիրը. ճշգրտումներից (DEC-10) հետո
 *     հայտարարագիրը վերագնահատվում է «Վերագնահատել» կոճակով («Հայտարարագրի ճշգրտումներ» ներդիր)
 */

/** Կանոնների արդյունքների համառոտ նկարագիր՝ պահված և կենդանի գնահատումները համեմատելու համար */
export function resultSignature(unit) {
  return JSON.stringify((unit.scopes || []).map((s) => [s.key, s.score, Object.values(s.results || {}).map((r) => `${r.ruleId}:${r.status}:${r.weight ?? ''}`).sort()]));
}

/** Հայտարարագրի «տեղական» գործողություններ (ձեռքով նշումներ). փոխվելու դեպքում վերագնահատվում է ավտոմատ */
export function localSignature(unit) {
  return JSON.stringify((unit.manual || []).map((m) => [m.id, m.weight, m.scope || 'individual']));
}

/** Հայտարարագրի ճշգրտումներ (DEC-10). փոխվելու դեպքում պահանջվում է վերագնահատում, նույնիսկ եթե արդյունքը չի փոխվում */
export const correctionsSignature = (unit) => JSON.stringify(Object.fromEntries(Object.entries(unit.corrections || {}).map(([k, c]) => [k, Object.fromEntries(Object.entries(c).filter(([f]) => !f.startsWith('_')))])));

/** Պահվող արդյունք (JSON-ով պահվող տվյալներ միայն) */
export function snapshotOf(unit, { at, by, auto = false }) {
  return {
    at, by, auto,
    sig: resultSignature(unit),
    localSig: localSignature(unit),
    corrSig: correctionsSignature(unit),
    score: unit.score,
    risky: unit.risky,
    scopes: (unit.scopes || []).map((s) => ({ key: s.key, results: s.results, score: s.score, risky: s.risky })),
  };
}

/** Կենդանի միավոր + պահված արդյունք → ցուցադրվող միավոր */
export function withStored(unit, ev) {
  if (!ev) return { ...unit, evaluation: null, stale: false };
  const scopes = (unit.scopes || []).map((s) => {
    const st = ev.scopes.find((x) => x.key === s.key);
    return st ? { ...s, results: st.results, score: st.score, risky: st.risky } : s;
  });
  return { ...unit, scopes, score: ev.score, risky: ev.risky, evaluation: { at: ev.at, by: ev.by, auto: ev.auto }, stale: ev.sig !== resultSignature(unit) || (ev.corrSig !== undefined && ev.corrSig !== correctionsSignature(unit)), live: unit };
}

/** Միավորներ, որոնք պետք է գնահատվեն ավտոմատ. պահված արդյունք չունեն կամ փոխվել են դրանց տեղական գործողությունները */
export function autoEvaluations(units, stored, { at, by }) {
  const patch = {};
  for (const u of units) {
    const ev = stored?.[u.id];
    if (!ev) patch[u.id] = snapshotOf(u, { at, by: 'Ավտոմատ (նոր հայտարարագիր)', auto: true });
    else if (ev.localSig !== localSignature(u)) patch[u.id] = snapshotOf(u, { at, by, auto: true });
  }
  return patch;
}
