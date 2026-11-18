/**
 * Գնահատման շարժիչ. կիրառում է կանոնները բոլոր չորս ուղղությունների փաստաթղթերի վրա։
 *
 *  • COM-02  կանոնը կիրառվում է միայն իր ուղղության փաստաթղթերի վրա
 *  • COM-05/07 կառուցիչի կանոնները կարող են օգտագործել այլ կանոնների արդյունքներ (շղթայավորում).
 *            գնահատվում են կախվածությունների հերթականությամբ, ցիկլերը հայտնաբերվում են
 *  • COM-14  արտաքին տվյալը հարցվում է միայն այն կանոնի համար, որն այն օգտագործում է, և մեկ փաստաթղթի
 *            գնահատման ընթացքում կրկին չի հարցվում (ExternalContext)
 *  • COM-16  արտաքին պատասխանը պահվում է արդյունքի հետ (snapshots)
 *  • COM-17  անհասանելի աղբյուրի դեպքում կանոնը «չի գնահատվել»
 *  • COM-18  հայտարարագրերի համախառն միավոր, մյուս ուղղություններում՝ «առնվազն մեկ կանոն»
 *  • COM-20  ձեռքով ռիսկային նշումներ
 *  • DEC-04  հայտարարագրի երկու հաշվարկ՝ առանձին և ընտանիքի կազմով
 *  • DEC-10  ճշգրտումներից առաջ և հետո արդյունքներ
 */
import { current, byInstance, children, detailRows, sectionOf, profileChildren, profileName, liveProfileOf, liveProfileBySsn } from '../data/epd/repository.js';
import { lk, WF, DECLARATION_TYPE, DECLARANT_TYPE, INTEGRITY_STUDY_STATE } from '../data/epd/classifiers.js';
import { BUILTIN_RULES } from '../rules/catalog.js';
import { PARTY_POLICY } from '../rules/parties.js';
import { STATUS } from '../rules/common.js';
import { computeExpense } from './annualExpense.js';
import { variableValue, variableDefByKey } from './variables.js';
import { parse, evaluate as evalExpr, dependencies, NotEvaluated, truthy } from './expression.js';
import { METRICS } from './metrics.js';
import { ExternalContext } from '../adapters/index.js';
import { ServiceUnavailableError, setOutages, batch } from '../adapters/transport.js';

// ───────────────────────────── կանոնների կազմաձևում

/** Կիրառվող կանոնների ցանկ՝ ներկառուցված (կազմաձևված) + կառուցիչով ստեղծված */
export function effectiveRules(state) {
  const cfg = state.ruleConfig || {};
  const builtins = BUILTIN_RULES.map((r) => ({
    ...r,
    enabled: cfg[r.id]?.enabled ?? true,
    weight: r.direction === 'declarations' ? cfg[r.id]?.weight ?? r.weight : undefined,
    bindings: { ...Object.fromEntries((r.params || []).map((p) => [p.key, p.default])), ...(cfg[r.id]?.params || {}) },
  }));
  const copies = (state.customRules || []).filter((c) => c.kind === 'copy').map((c) => {
    const base = BUILTIN_RULES.find((b) => b.id === c.base);
    if (!base) return null;
    return { ...base, id: c.id, title: c.title, kind: 'copy', base: c.base, srsRef: `Կրկնօրինակ՝ ${base.id} (${base.srsRef})`, enabled: c.enabled ?? true, weight: base.direction === 'declarations' ? c.weight ?? base.weight : undefined, bindings: { ...Object.fromEntries((base.params || []).map((p) => [p.key, p.default])), ...(c.params || {}) } };
  }).filter(Boolean);
  const custom = (state.customRules || []).filter((c) => c.kind === 'expression').map((c) => {
    let ast = null;
    let error = null;
    let deps = null;
    try { ast = parse(c.expression); deps = dependencies(ast); } catch (e) { error = e.message; }
    return { ...c, kind: 'expression', srsRef: 'Ստեղծված է կառուցիչով (COM-01)', ast, deps, parseError: error, enabled: c.enabled ?? true, weight: c.direction === 'declarations' ? Number(c.weight) || 0 : undefined };
  });
  return [...builtins, ...copies, ...custom];
}

/** Կառուցիչի կանոնների կախվածությունների հերթականություն (Kahn), ցիկլերի հայտնաբերում */
function topoOrder(rules) {
  const ids = new Set(rules.map((r) => r.id));
  const indeg = new Map(rules.map((r) => [r.id, 0]));
  const out = new Map(rules.map((r) => [r.id, []]));
  for (const r of rules) for (const d of r.deps?.rule || []) if (ids.has(d)) { indeg.set(r.id, indeg.get(r.id) + 1); out.get(d).push(r.id); }
  const queue = rules.filter((r) => indeg.get(r.id) === 0).map((r) => r.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const n of out.get(id)) { indeg.set(n, indeg.get(n) - 1); if (indeg.get(n) === 0) queue.push(n); }
  }
  const cyclic = rules.filter((r) => !order.includes(r.id)).map((r) => r.id);
  return { order: order.map((id) => rules.find((r) => r.id === id)), cyclic };
}

// ───────────────────────────── կանոնների կատարում մեկ միավորի վրա

function runRules(rules, unit, { direction, level, state, refDate, ext }) {
  const results = {};
  const vars = state.variables || {};
  const applicable = rules.filter((r) => r.enabled && r.direction === direction && (!level || (r.level || defaultLevel(direction)) === level));

  const wrapExt = (snaps) => ({ get: (...a) => ext.get(...a), snap: (s) => snaps.push(...(Array.isArray(s) ? s : [s])) });

  const finish = (rule, res, snaps) => {
    results[rule.id] = { ruleId: rule.id, ...res, snapshots: snaps, weight: rule.weight };
  };
  const fail = (rule, e, snaps) => {
    if (e instanceof ServiceUnavailableError) return finish(rule, { status: STATUS.notEvaluated, values: [], explanation: `${e.message}. Կանոնը կգնահատվի աղբյուրի վերականգնումից հետո (COM-17)` }, snaps);
    if (e instanceof NotEvaluated) return finish(rule, { status: STATUS.notEvaluated, values: e.values || [], explanation: e.reason }, snaps);
    return finish(rule, { status: STATUS.notEvaluated, values: [], explanation: `Սխալ. ${e.message}`, error: true }, snaps);
  };

  // 1) ներկառուցված կանոններ և դրանց կրկնօրինակներ
  for (const rule of applicable.filter((r) => r.kind === 'builtin' || r.kind === 'copy')) {
    const snaps = [];
    const x = wrapExt(snaps);
    const api = {
      ext: x,
      snap: x.snap,
      param(key) {
        const p = (rule.params || []).find((pp) => pp.key === key);
        const b = rule.bindings?.[key];
        if (b === null || b === undefined || (b.value === undefined && !b.var) || b.value === '' || b.value === null) throw new NotEvaluated(`Կանոնի «${p?.label || key}» պարամետրը սահմանված չէ`);
        if (b.var) {
          const val = variableValue(vars, b.var, refDate);
          if (val === null) throw new NotEvaluated(`Համակարգային փոփոխականը «${variableDefByKey[b.var]?.label || b.var}» սահմանված չէ (SRS բաժին 9)`);
          return val;
        }
        return b.value;
      },
    };
    try { finish(rule, rule.evaluate(unit, api), snaps); } catch (e) { fail(rule, e, snaps); }
  }

  // 2) կառուցիչով ստեղծված կանոններ (շղթայավորում)
  const custom = applicable.filter((r) => r.kind === 'expression');
  const { order, cyclic } = topoOrder(custom);
  for (const id of cyclic) {
    const rule = custom.find((r) => r.id === id);
    finish(rule, { status: STATUS.notEvaluated, values: [], explanation: 'Ցիկլային կախվածություն այլ կանոնների հետ (COM-05)', error: true }, []);
  }
  const M = METRICS[direction];
  for (const rule of order) {
    const snaps = [];
    if (rule.parseError) { finish(rule, { status: STATUS.notEvaluated, values: [], explanation: `Արտահայտության սխալ. ${rule.parseError}`, error: true }, snaps); continue; }
    const x = wrapExt(snaps);
    try {
      const { value, trace } = evalExpr(rule.ast, {
        resolve(ns, name) {
          if (ns === 'doc') {
            const m = M.doc.find((d) => d.key === name);
            if (!m) throw new Error(`Անծանոթ դաշտ doc.${name}`);
            return m.get(unit);
          }
          if (ns === 'ext') {
            const m = M.ext.find((d) => d.key === name);
            if (!m) throw new Error(`Անծանոթ արտաքին տվյալ ext.${name}`);
            return m.get(unit, x);
          }
          if (ns === 'var') {
            const val = variableValue(vars, name, refDate);
            if (val === null) throw new NotEvaluated(`Համակարգային փոփոխականը «${variableDefByKey[name]?.label || name}» սահմանված չէ`);
            return val;
          }
          if (ns === 'rule') {
            const r = results[name];
            if (!r) throw new NotEvaluated(`Կանոնը ${name} չկա, անջատված է կամ կիրառելի չէ այս մակարդակում`);
            if (r.status === STATUS.notEvaluated) throw new NotEvaluated(`Կախված կանոնը ${name} չի գնահատվել`);
            return r.status === STATUS.fired ? 1 : 0;
          }
          throw new Error(ns);
        },
        table(name) { return unit.table ? unit.table(name) : []; },
      });
      const values = [...trace.entries()].map(([k, val]) => ({ label: labelFor(direction, k), value: typeof val === 'boolean' ? (val ? 1 : 0) : val, kind: 'num' }));
      finish(rule, truthy(value) ? { status: STATUS.fired, values, explanation: `Պայմանը բավարարվել է. ${rule.expression}` } : { status: STATUS.notFired, values, explanation: `Պայմանը չի բավարարվել. ${rule.expression}` }, snaps);
    } catch (e) { fail(rule, e, snaps); }
  }
  return results;
}

const defaultLevel = (direction) => ({ declarations: 'scope', gifts: 'gift', parties: 'person', integrity: 'questionnaire' }[direction]);

function labelFor(direction, key) {
  const [ns, name] = key.split(/\.(.+)/);
  const m = METRICS[direction]?.[ns]?.find((d) => d.key === name);
  if (m) return `${key} — ${m.label}`;
  if (ns === 'var') return `${key} — ${variableDefByKey[name]?.label || ''}`;
  return key;
}

const manualFor = (state, direction, unitId) => (state.manualFlags || []).filter((f) => f.direction === direction && f.unitId === unitId);

// ───────────────────────────── հայտարարագրեր

const { declaration: DWF } = WF;

/** Անձի (կենդանի պրոֆիլի instanceid) ընթացիկ, ներկայացված տարեկան հայտարարագրերը */
export function declarationsOfPerson(liveInstanceId) {
  return current('de_declaration').filter((d) => d.originaldeclarant === liveInstanceId && d.wfstateid !== DWF.draft && d.declarationtype === DECLARATION_TYPE.yearly);
}

function buildDeclarationScopes(d, corrections) {
  const linked = current('de_declaration').filter((x) => x.parentdeclaration === d.instanceid);
  const fam = profileChildren('de_profilefamilymembers', d.declarant);
  const scopes = [];
  const mk = (s) => ({ ...s, year: d.year, exp: computeExpense(s.decls, s.filter, corrections), table: null });
  scopes.push(mk({ key: `ind:${d.originaldeclarant}`, kind: 'individual', label: `${profileName(d.originaldeclarant)} (հայտարարատու, առանձին)`, decls: [d], filter: (r) => r.familymembertype === null, persons: 1, profiles: [d.originaldeclarant] }));
  for (const l of linked) {
    const t = fam.find((f) => liveProfileOf(byInstance('de_profile', f.profile))?.instanceid === l.originaldeclarant)?.type;
    scopes.push(mk({ key: `ind:${l.originaldeclarant}`, kind: 'individual', label: `${profileName(l.originaldeclarant)} (${lk('c_familymembertype', t) || 'ընտանիքի անդամ'}, առանձին հայտարարագիր)`, decls: [l], filter: (r) => r.familymembertype === null, persons: 1, profiles: [l.originaldeclarant] }));
  }
  if (fam.length) {
    const memberLive = fam.map((f) => liveProfileOf(byInstance('de_profile', f.profile))?.instanceid).filter(Boolean);
    scopes.push(mk({ key: 'family', kind: 'family', label: `Ընտանիքի ընդհանուր կազմ (${fam.length + 1} անձ)`, decls: [d, ...linked], filter: () => true, persons: fam.length + 1, profiles: [d.originaldeclarant, ...memberLive] }));
  }
  for (const s of scopes) s.table = (name) => s.exp.rows(name);
  return { scopes, linked, fam };
}

function evaluateDeclarations(state, rules) {
  const units = [];
  // Գնահատման միավոր՝ պաշտոնատար անձի (և կուսակցության ղեկավարի) տարեկան հայտարարագիրը. ընտանիքի անդամների հայտարարագրերը կապվում են parentdeclaration-ով (DEC-05)
  const roots = current('de_declaration').filter((d) => d.declarationtype === DECLARATION_TYPE.yearly && d.declaranttype !== DECLARANT_TYPE.family);
  for (const d of roots) {
    const base = { id: d.instanceid, code: d.code, decl: d, profile: byInstance('de_profile', d.originaldeclarant), year: d.year };
    if (d.wfstateid === DWF.draft) {
      units.push({ ...base, draft: true, overdue: current('de_declarationoverdueact').filter((a) => a.declarationnumber === d.code), scopes: [], score: null, risky: false, manual: manualFor(state, 'declarations', d.instanceid), linked: [] });
      continue;
    }
    const refDate = `${d.year}-12-31`;
    const threshold = variableValue(state.variables || {}, 'dec_threshold', refDate);
    const maxManual = variableValue(state.variables || {}, 'manual_max_weight', refDate) ?? 25;
    const manual = manualFor(state, 'declarations', d.instanceid).map((m) => ({ ...m, weight: Math.min(Number(m.weight) || 0, maxManual) }));
    const manualWeight = manual.reduce((s, m) => s + m.weight, 0);

    const run = (corrections) => {
      const built = buildDeclarationScopes(d, corrections);
      const ext = new ExternalContext({ direction: 'declarations', unit: d.code });
      for (const s of built.scopes) {
        s.results = runRules(rules, s, { direction: 'declarations', level: 'scope', state, refDate, ext });
        s.score = Object.values(s.results).filter((r) => r.status === STATUS.fired).reduce((a, r) => a + (Number(r.weight) || 0), 0) + manualWeight;
        s.risky = threshold !== null && s.score >= threshold;
      }
      return built;
    };
    const ids = new Set([d.instanceid, ...current('de_declaration').filter((x) => x.parentdeclaration === d.instanceid).map((x) => x.instanceid)]);
    const myCorrections = Object.fromEntries(Object.entries(state.corrections || {}).filter(([, c]) => ids.has(c._declaration)));
    const cur = run(state.corrections || {});
    const original = Object.keys(myCorrections).length ? run({}) : null;
    const score = Math.max(...cur.scopes.map((s) => s.score));
    units.push({ ...base, ...cur, original, corrections: myCorrections, threshold, manual, manualWeight, score, risky: cur.scopes.some((s) => s.risky) });
  }
  return units;
}

// ───────────────────────────── նվերներ

function evaluateGifts(state, rules) {
  const gifts = current('de_gift').filter((g) => g.wfstateid !== WF.gift.draft);
  const key = (g) => `${g.originalprofile}|${g.receiptyear}`;
  const count = {};
  const value = {};
  for (const g of gifts) { count[key(g)] = (count[key(g)] || 0) + 1; value[key(g)] = (value[key(g)] || 0) + (g.amount_amd || 0); }
  // Պաշտոնի տեսակը՝ նվերի profile-ից (հրապարակված նվերի դեպքում՝ կլոն, Guide 6.2), Q-20
  const positionOf = (g) => byInstance('de_profile', g.profile)?.positiontype ?? null;
  const peerKey = (g) => `${positionOf(g)}|${g.giftsubclassification}|${g.receiptyear}`;
  const peers = {};
  for (const g of gifts) if (g.amount_amd > 0 && g.giftsubclassification) (peers[peerKey(g)] ||= []).push(g.amount_amd);

  return gifts.map((g) => {
    const recipient = byInstance('de_profile', g.originalprofile);
    const decls = declarationsOfPerson(g.originalprofile);
    const recipientContracts = decls.flatMap((d) => detailRows(d, 'de_contractsupon5mlndetails'));
    const related = [];
    const addRel = (name, relation) => { if (!related.some((r) => r.name === name)) related.push({ name, relation }); };
    for (const d of decls) {
      for (const f of profileChildren('de_profilefamilymembers', d.declarant)) {
        const p = byInstance('de_profile', f.profile);
        if (p) addRel(`${p.firstname} ${p.lastname}`, lk('c_familymembertype', f.type));
      }
      for (const r of profileChildren('de_profilerelatives', d.declarant)) addRel(`${r.firstname} ${r.lastname}`, lk('c_relativetype', r.relativetype));
    }
    const pk = peerKey(g);
    const evaluation = current('de_giftpriceevaluation').find((e) => e.gift === g.instanceid) || null;
    const unit = {
      id: g.instanceid,
      code: g.code,
      gift: g,
      recipient,
      positiontype: positionOf(g),
      year: g.receiptyear,
      recipientContracts,
      recipientRelated: related,
      agg: {
        countYear: count[key(g)] || 0,
        countPrevYear: count[`${g.originalprofile}|${g.receiptyear - 1}`] || 0,
        valueYear: value[key(g)] || 0,
        valuePrevYear: value[`${g.originalprofile}|${g.receiptyear - 1}`] || 0,
        peerMin: peers[pk] ? Math.min(...peers[pk]) : null,
        peerCount: peers[pk]?.length || 0,
      },
      evaluation,
      evaluationSources: evaluation ? children('de_giftpriceevaluationsource', evaluation.entityid) : [],
    };
    const ext = new ExternalContext({ direction: 'gifts', unit: g.code });
    unit.results = runRules(rules, unit, { direction: 'gifts', level: 'gift', state, refDate: g.receiptdate, ext });
    unit.manual = manualFor(state, 'gifts', g.instanceid);
    unit.firedCount = Object.values(unit.results).filter((r) => r.status === STATUS.fired).length;
    unit.risky = unit.firedCount > 0 || unit.manual.length > 0;
    return unit;
  });
}

// ───────────────────────────── կուսակցություններ

function evaluateParties(state, rules) {
  const reports = current('de_report').filter(PARTY_POLICY.reportFilter);
  const partyOf = (r) => byInstance('de_party', r.originalparty);
  const persons = new Map();
  for (const rep of reports)
    for (const src of PARTY_POLICY.paymentSources)
      for (const row of detailRows(rep, src.table)) {
        const k = `${rep.year}|${PARTY_POLICY.personKey(row)}`;
        if (!persons.has(k)) persons.set(k, { id: k, year: rep.year, key: PARTY_POLICY.personKey(row), identifier: (row.identitydocumentnumber || '').trim() || null, names: [], payments: [] });
        const p = persons.get(k);
        if (!p.names.includes(row.fullname)) p.names.push(row.fullname);
        p.payments.push({ table: src.table, label: src.label, kind: src.kind, amount: Number(row[src.amountField]) || 0, date: row.date, reportId: rep.instanceid, partyId: rep.originalparty, partyName: partyOf(rep)?.name, row });
      }
  const personUnits = [...persons.values()].map((p) => {
    p.total = p.payments.reduce((s, x) => s + x.amount, 0);
    p.sumBy = p.payments.reduce((acc, x) => ({ ...acc, [x.kind]: (acc[x.kind] || 0) + x.amount }), {});
    // անձը EPD-ում հայտարարատու է (կանոն 2-ի համատեքստ, չիրականացված)
    const live = p.identifier ? liveProfileBySsn(p.identifier) : null;
    p.declarantProfile = live && declarationsOfPerson(live.instanceid).length ? live : null;
    const ext = new ExternalContext({ direction: 'parties', unit: p.id });
    p.results = runRules(rules, p, { direction: 'parties', level: 'person', state, refDate: `${p.year}-12-31`, ext });
    p.manual = manualFor(state, 'parties', p.id);
    p.firedCount = Object.values(p.results).filter((r) => r.status === STATUS.fired).length;
    p.risky = p.firedCount > 0 || p.manual.length > 0;
    return p;
  });
  const reportUnits = reports.map((r) => {
    const cashflow = sectionOf('de_reportcashflow', r);
    const incomes = sectionOf('de_reportincomes', r);
    const unit = {
      id: r.instanceid, code: r.code, report: r, year: r.year, party: partyOf(r),
      cashflow,
      totals: incomes,
      incomesTotal: detailRows(r, 'de_reportcashflowincomes').reduce((s, x) => s + (x.amount || 0), 0),
    };
    const ext = new ExternalContext({ direction: 'parties', unit: r.code });
    unit.results = runRules(rules, unit, { direction: 'parties', level: 'report', state, refDate: `${r.year}-12-31`, ext });
    unit.manual = manualFor(state, 'parties', r.instanceid);
    unit.firedCount = Object.values(unit.results).filter((x) => x.status === STATUS.fired).length;
    return unit;
  });
  const parties = reportUnits.map((ru) => {
    const ps = personUnits.filter((p) => p.year === ru.year && p.payments.some((x) => x.reportId === ru.id));
    const riskyPersons = ps.filter((p) => p.risky);
    return {
      id: ru.id, code: ru.code, partyId: ru.party?.instanceid, name: ru.party?.name, year: ru.year, reportUnit: ru, persons: ps, riskyPersons,
      risky: PARTY_POLICY.isPartyRisky({ riskyPersons: riskyPersons.length, reportFired: ru.firedCount, manual: ru.manual.length }),
    };
  });
  return { persons: personUnits, reports: reportUnits, parties };
}

// ───────────────────────────── բարեվարքություն

function evaluateIntegrity(state, rules) {
  return current('de_integrity').filter((q) => q.wfstateid === INTEGRITY_STUDY_STATE).map((iq) => {
    const prof = byInstance('de_profile', iq.originalprofile);
    const unit = {
      id: iq.instanceid,
      code: iq.code,
      integrity: iq,
      profile: prof,
      year: iq.year,
      liability: sectionOf('de_integrityliability', iq),
      interests: sectionOf('de_integrityinterests', iq),
      rows: (t) => detailRows(iq, t),
      table: (t) => detailRows(iq, t),
      // Համեմատություն հայտարարագրերի հետ (INT-05). անձը կապվում է կենդանի պրոֆիլով (originalprofile = originaldeclarant)
      declarations: declarationsOfPerson(iq.originalprofile).filter((d) => d.declaranttype !== DECLARANT_TYPE.family),
      declRows: (t, decl) => detailRows(decl, t),
      declSection: (t, decl) => sectionOf(t, decl),
      declProfileRows: (t, decl) => profileChildren(t, decl.declarant),
      profileName,
    };
    const ext = new ExternalContext({ direction: 'integrity', unit: iq.code });
    unit.results = runRules(rules, unit, { direction: 'integrity', level: 'questionnaire', state, refDate: iq.submissiondate, ext });
    unit.manual = manualFor(state, 'integrity', iq.instanceid);
    unit.firedCount = Object.values(unit.results).filter((r) => r.status === STATUS.fired).length;
    unit.risky = unit.firedCount > 0 || unit.manual.length > 0;
    return unit;
  });
}


// ───────────────────────────── ընդհանուր

export function evaluateAll(state) {
  setOutages(state.outages);
  return batch(() => {
    const rules = effectiveRules(state);
    return {
      at: new Date().toISOString(),
      rules,
      declarations: evaluateDeclarations(state, rules),
      gifts: evaluateGifts(state, rules),
      parties: evaluateParties(state, rules),
      integrity: evaluateIntegrity(state, rules),
    };
  });
}
