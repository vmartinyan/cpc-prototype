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
 *  • COM-20  ձեռքով ռիսկային նշումներ (հայտարարագրերում՝ DEC-R7, ըստ տարբերակի՝ հայտարարատու առանձին կամ ընտանիքի կազմ)
 *  • DEC-04  հայտարարագրի երկու հաշվարկ՝ առանձին և ընտանիքի կազմով
 *  • DEC-10  ճշգրտումներից առաջ և հետո արդյունքներ
 */
import { current, byInstance, children, detailRows, sectionOf, profileChildren, profileName, liveProfileOf, liveProfileBySsn } from '../data/epd/repository.js';
import { lk, WF, DECLARATION_TYPE, DECLARANT_TYPE, INTEGRITY_STUDY_STATE } from '../data/epd/classifiers.js';
import { BUILTIN_RULES, MANUAL_RULES } from '../rules/catalog.js';
import { PARTY_POLICY } from '../rules/parties.js';
import { STATUS } from '../rules/common.js';
import { computeExpense, effectiveFormulas } from './annualExpense.js';
import { indexPenalties, penaltyKey, isLinkable } from '../data/penalties.js';
import { variableValue, variableDefOf } from './variables.js';
import { parse, evaluate as evalExpr, dependencies, NotEvaluated, NotApplicable, truthy } from './expression.js';
import { METRICS, resolveTable } from './metrics.js';
import { print } from './conditionTree.js';
import { ExternalContext } from '../adapters/index.js';
import { ServiceUnavailableError, setOutages, batch } from '../adapters/transport.js';

// ───────────────────────────── կանոնների կազմաձևում

/**
 * Նախասահմանված կանոնի համարժեք պայմանը կառուցիչում՝ պարամետրերի կապերով
 * (այլ փոփոխականի կապը՝ var.<այլ>, ֆիքսված թվային արժեքը՝ թվով)
 */
export function builtinExpressionFor(builtin, bindings) {
  let expr = builtin.builderExpression || '';
  for (const p of builtin.params || []) {
    const b = bindings?.[p.key];
    const defVar = p.default?.var;
    if (!defVar || !b) continue;
    const re = new RegExp(`\\bvar\\.${defVar}\\b`, 'g');
    if (b.var && b.var !== defVar) expr = expr.replace(re, `var.${b.var}`);
    else if (!b.var && typeof b.value === 'number') expr = expr.replace(re, String(b.value));
  }
  return expr;
}
const normExpr = (e) => { try { return print(parse(e)); } catch { return null; } };

/** Կիրառվող կանոնների ցանկ՝ ներկառուցված (կազմաձևված) + կառուցիչով ստեղծված */
export function effectiveRules(state) {
  const cfg = state.ruleConfig || {};
  const compile = (expression) => {
    try { const ast = parse(expression); return { ast, deps: dependencies(ast), parseError: null }; } catch (e) { return { ast: null, deps: null, parseError: e.message }; }
  };
  const builtins = BUILTIN_RULES.map((r) => {
    const c = cfg[r.id] || {};
    const common = {
      id: r.id, direction: r.direction, level: r.level, srsRef: r.srsRef, requirements: r.requirements, external: r.external, partial: r.partial,
      title: c.title || r.title,
      criterion: c.criterion || r.criterion,
      enabled: c.enabled ?? r.defaultEnabled ?? true,
      weight: r.direction === 'declarations' ? c.weight ?? r.weight : undefined,
    };
    const bindings = { ...Object.fromEntries((r.params || []).map((p) => [p.key, p.default])), ...(c.params || {}) };
    // Նախասահմանված կանոնի պայմանը վերասահմանված է կառուցիչով (COM-01)
    if (c.expression) {
      // պայմանը համարժեք է սկզբնականին. հաշվարկվում է կոդով (նույն արդյունք և մանրամասն բացատրություն)
      if (r.builderExpression && normExpr(c.expression) && normExpr(c.expression) === normExpr(builtinExpressionFor(r, bindings))) return { ...r, ...common, bindings, override: true, expression: c.expression };
      // պայմանը փոխված է. արդյունքը՝ պայմանով, բացատրության տվյալները (աղյուսակներ, արժեքներ)՝ կոդից
      return { ...common, kind: 'expression', override: true, penaltyRule: r.penaltyRule, expression: c.expression, external: undefined, partial: undefined, codeRule: r, bindings, ...compile(c.expression) };
    }
    return { ...r, ...common, bindings };
  });
  const copies = (state.customRules || []).filter((c) => c.kind === 'copy').map((c) => {
    const base = BUILTIN_RULES.find((b) => b.id === c.base);
    if (!base) return null;
    return { ...base, id: c.id, title: c.title, criterion: c.criterion || base.criterion, kind: 'copy', base: c.base, srsRef: `Կրկնօրինակ՝ ${base.id} (${base.srsRef})`, enabled: c.enabled ?? true, weight: base.direction === 'declarations' ? c.weight ?? base.weight : undefined, bindings: { ...Object.fromEntries((base.params || []).map((p) => [p.key, p.default])), ...(c.params || {}) } };
  }).filter(Boolean);
  const custom = (state.customRules || []).filter((c) => c.kind === 'expression').map((c) => {
    return { ...c, kind: 'expression', srsRef: 'Ստեղծված է կառուցիչով (COM-01)', ...compile(c.expression), enabled: c.enabled ?? true, weight: c.direction === 'declarations' ? Number(c.weight) || 0 : undefined };
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
    if (e instanceof NotApplicable) return finish(rule, { status: STATUS.notApplicable, values: [], explanation: e.reason }, snaps);
    if (e instanceof NotEvaluated) return finish(rule, { status: STATUS.notEvaluated, values: e.values || [], explanation: e.reason }, snaps);
    return finish(rule, { status: STATUS.notEvaluated, values: [], explanation: `Սխալ. ${e.message}`, error: true }, snaps);
  };

  const apiFor = (rule, x) => ({
      ext: x,
      snap: x.snap,
      param(key) {
        const p = (rule.params || []).find((pp) => pp.key === key);
        const b = rule.bindings?.[key];
        if (b === null || b === undefined || (b.value === undefined && !b.var) || b.value === '' || b.value === null) throw new NotEvaluated(`Կանոնի «${p?.label || key}» պարամետրը սահմանված չէ`);
        if (b.var) {
          const val = variableValue(vars, b.var, refDate);
          if (val === null) throw new NotEvaluated(`Համակարգային փոփոխականը «${variableDefOf(state, b.var)?.label || b.var}» սահմանված չէ (SRS բաժին 9)`);
          return val;
        }
        return b.value;
      },
  });
  // 1) ներկառուցված կանոններ և դրանց կրկնօրինակներ
  for (const rule of applicable.filter((r) => r.kind === 'builtin' || r.kind === 'copy')) {
    const snaps = [];
    const x = wrapExt(snaps);
    try { finish(rule, rule.evaluate(unit, apiFor(rule, x)), snaps); } catch (e) { fail(rule, e, snaps); }
  }

  // 2) կառուցիչով ստեղծված կանոններ (շղթայավորում)
  const custom = applicable.filter((r) => r.kind === 'expression');
  const { order, cyclic } = topoOrder(custom);
  for (const id of cyclic) {
    const rule = custom.find((r) => r.id === id);
    finish(rule, { status: STATUS.notEvaluated, values: [], explanation: 'Ցիկլային կախվածություն այլ կանոնների հետ (COM-05)', error: true }, []);
  }
  const M = METRICS[direction];
  // մասնագետի սահմանած բարդ փոփոխականներ (doc.<key>). գնահատվում են իրենց բանաձևով՝ նույն փաստաթղթի համար
  const derived = derivedMap(state, direction);
  for (const rule of order) {
    const snaps = [];
    if (rule.parseError) { finish(rule, { status: STATUS.notEvaluated, values: [], explanation: `Արտահայտության սխալ. ${rule.parseError}`, error: true }, snaps); continue; }
    const x = wrapExt(snaps);
    const inner = new Map();
    const stack = new Set();
    try {
      const ctx = {
        resolve(ns, name) {
          if (ns === 'doc') {
            const m = M.doc.find((d) => d.key === name);
            if (m) return m.get(unit);
            const dv = derived.get(name);
            if (!dv) throw new Error(`Անծանոթ դաշտ doc.${name}`);
            if (stack.has(name)) throw new NotEvaluated(`Բարդ փոփոխականի ցիկլային սահմանում՝ doc.${name}`);
            stack.add(name);
            try {
              const r = evalExpr(parse(dv.expression), ctx);
              for (const [k, v] of r.trace) inner.set(k, v);
              return r.value;
            } finally { stack.delete(name); }
          }
          if (ns === 'ext') {
            const m = M.ext.find((d) => d.key === name);
            if (!m) throw new Error(`Անծանոթ արտաքին տվյալ ext.${name}`);
            return m.get(unit, x);
          }
          if (ns === 'var') {
            const val = variableValue(vars, name, refDate);
            if (val === null) throw new NotEvaluated(`Համակարգային փոփոխականը «${variableDefOf(state, name)?.label || name}» սահմանված չէ`);
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
        table(name) {
          const t = resolveTable(direction, name);
          if (!t) throw new Error(`Անծանոթ աղյուսակ «${name}»`);
          return unit.table ? unit.table(t) : [];
        },
      };
      const { value, trace } = evalExpr(rule.ast, ctx);
      for (const [k, v] of inner) if (!trace.has(k)) trace.set(k, v);
      const values = [...trace.entries()].map(([k, val]) => ({ label: labelFor(direction, k, derived, state), value: typeof val === 'boolean' ? (val ? 1 : 0) : val, kind: 'num' }));
      finish(rule, truthy(value) ? { status: STATUS.fired, values, explanation: `Պայմանը բավարարվել է. ${rule.expression}` } : { status: STATUS.notFired, values, explanation: `Պայմանը չի բավարարվել. ${rule.expression}` }, snaps);
      // կառուցիչով փոխված նախասահմանված կանոն. բացատրության տվյալները (համեմատման աղյուսակ, արժեքներ)՝ կոդով հաշվարկից
      if (rule.codeRule) {
        try {
          const code = rule.codeRule.evaluate(unit, apiFor({ params: rule.codeRule.params, bindings: rule.bindings }, x));
          const res = results[rule.id];
          const extra = (code.comparison ? code.notes : code.values) || [];
          const more = extra.filter((v) => !(typeof v.value === 'number' && values.some((e) => e.value === v.value)));
          results[rule.id] = { ...res, comparison: code.comparison, values: code.comparison ? res.values : [...values, ...more], notes: code.comparison ? [...values, ...(code.notes || [])] : undefined };
        } catch { /* կոդով հաշվարկը չի կիրառվում (օր.՝ «կիրառելի չէ»). մնում են պայմանի արժեքները */ }
      }
    } catch (e) { fail(rule, e, snaps); }
  }
  return results;
}

const defaultLevel = (direction) => ({ declarations: 'scope', gifts: 'gift', parties: 'person', integrity: 'questionnaire' }[direction]);

/** Մասնագետի սահմանած բարդ փոփոխականներ (state.derivedVars)՝ ըստ ուղղության */
export const derivedMap = (state, direction) => new Map((state.derivedVars || []).filter((d) => d.direction === direction).map((d) => [d.key, d]));

function labelFor(direction, key, derived, state) {
  const [ns, name] = key.split(/\.(.+)/);
  const m = METRICS[direction]?.[ns]?.find((d) => d.key === name);
  if (m) return `${key} — ${m.label}`;
  if (ns === 'doc' && derived?.get(name)) return `${key} — ${derived.get(name).label}`;
  if (ns === 'var') return `${key} — ${variableDefOf(state, name)?.label || ''}`;
  return key;
}

const manualFor = (state, direction, unitId) => (state.manualFlags || []).filter((f) => f.direction === direction && f.unitId === unitId);
/** DEC-R7-ի առավելագույն քաշ՝ նրա բաժինը քաշերի բաշխման մեջ (կանոնների կարգավորում, «Քաշերի բաշխում») */
export const manualMaxWeight = (state) => Number(state?.ruleConfig?.['DEC-R7']?.weight ?? MANUAL_RULES[0].weight) || 0;

/**
 * Հայտարարագրերի ակտիվ կանոնների քաշերի գումար + DEC-R7-ի առավելագույն քաշ. պետք է լինի 100 (ԿԿՀ-ի ճշտում 25.11.2026)։
 * @param rules effectiveRules(state)
 */
export const WEIGHT_TOTAL = 100;
export const declarationWeightTotal = (state, rules = effectiveRules(state)) =>
  rules.filter((r) => r.direction === 'declarations' && r.enabled).reduce((a, r) => a + (Number(r.weight) || 0), 0) + manualMaxWeight(state);

/**
 * Ձեռքով ռիսկային նշում (DEC-R7). մեկ նշում հայտարարագրի համար (Գ2-ի պայմաններում հաշվարկի ընտրություն չկա)։
 * Նախկին տվյալներում մի քանի նշման դեպքում (առանձին և ընտանիքի կազմ)՝ ավելի մեծ քաշը, հիմնավորումները միասին
 */
export function mergedManual(flags, max) {
  if (!flags.length) return null;
  return { ruleId: 'DEC-R7', weight: Math.min(Math.max(...flags.map((m) => Number(m.weight) || 0)), max), note: flags.map((m) => m.note).filter(Boolean).join('; '), ids: flags.map((m) => m.id) };
}

/**
 * Համախառն միավոր (DEC-04, Գ2, ԿԿՀ-ի ճշտում 25.11.2026). բոլոր հաշվարկներում (պաշտոնատար անձ, առանձին հայտարարագրող
 * ընտանիքի անդամներ, ընտանիքի ընդհանուր կազմ) աշխատած եզակի ցուցանիշների քաշերի գումար + DEC-R7. յուրաքանչյուր
 * ցուցանիշ հաշվվում է մեկ անգամ, ուստի քաշերի գումարը 100 լինելու դեպքում միավորը 100-ից չի անցնում
 * @returns { score, indicators: [{ ruleId, weight, scopes: [հաշվարկի անվանում], manual?, note? }] }
 */
export function combinedScore(scopes, manual) {
  const map = new Map();
  for (const sc of scopes) for (const r of Object.values(sc.results || {})) {
    if (r.status !== STATUS.fired) continue;
    if (!map.has(r.ruleId)) map.set(r.ruleId, { ruleId: r.ruleId, weight: Number(r.weight) || 0, scopes: [] });
    map.get(r.ruleId).scopes.push(sc.label);
  }
  const indicators = [...map.values()];
  if (manual) indicators.push({ ruleId: 'DEC-R7', weight: manual.weight, scopes: [], manual: true, note: manual.note });
  return { score: indicators.reduce((t, x) => t + x.weight, 0), indicators };
}

// ───────────────────────────── հայտարարագրեր

const { declaration: DWF } = WF;

/**
 * Վերլուծվում են միայն «Տարեկան» հայտարարագրերը («Պաշտոնը ստանձնելու» և «Պաշտոնը դադարեցնելու» տեսակների մոտեցումը
 * քննարկվում է)։ Մոդուլը վերցնում է բոլոր կարգավիճակները (DEC-R3, DEC-R4-ի համար). «ներկայացված» է համարվում միայն
 * հրապարակված հայտարարագիրը, և բովանդակային կանոններով գնահատվում են միայն հրապարակվածները։
 */
const isPublished = (d) => d.wfstateid === DWF.published;

/**
 * Անձի (կենդանի պրոֆիլի instanceid) ընթացիկ, ներկայացված (ոչ սևագիր) տարեկան հայտարարագրերը։
 * publishedOnly՝ միայն հրապարակվածները (հայտարարագրերի ուղղություն). մյուս ուղղությունների
 * համեմատություններում (նվերներ, կուսակցություններ, բարեվարքություն) կարգավիճակի կանոնը չի փոխվել։
 */
export function declarationsOfPerson(liveInstanceId, { publishedOnly = false } = {}) {
  return current('de_declaration').filter((d) => d.originaldeclarant === liveInstanceId && (publishedOnly ? isPublished(d) : d.wfstateid !== DWF.draft) && d.declarationtype === DECLARATION_TYPE.yearly);
}

/**
 * Ընտանիքի կազմ (DEC-04, DEC-05).
 *   • linked՝ ընտանիքի անդամների առանձին հրապարակված հայտարարագրերը (declaranttype = 2, parentdeclaration = d)
 *   • officials՝ պրոֆիլում նշված ընտանիքի անդամներ, որոնք իրենք էլ պաշտոնատար անձ են. EPD-ում նրանք ներկայացնում են միայն
 *     իրենց պաշտոնյայի հայտարարագիրը (ստուգված է EPD-ի տվյալներով. 1 522 զույգից միայն 35-ն ունեն նաև կապված հայտարարագիր).
 *     ընտանիքի կազմով հաշվարկում վերցվում է նույն տարվա հրապարակված տարեկան հայտարարագիրը, միայն իր տողերը
 *     (familymembertype դատարկ), եթե կապված հայտարարագիր չունի. պաշտոնյայի հայտարարագրում այդ անդամի տողերը
 *     (եթե կան) այդ դեպքում չեն հաշվվում՝ կրկնակի հաշվարկից խուսափելու համար
 */
export function familyComposition(d) {
  const linked = current('de_declaration').filter((x) => x.parentdeclaration === d.instanceid && isPublished(x));
  const fam = profileChildren('de_profilefamilymembers', d.declarant);
  const officials = [];
  for (const f of fam) {
    const live = liveProfileOf(byInstance('de_profile', f.profile))?.instanceid;
    if (!live || linked.some((l) => l.originaldeclarant === live)) continue;
    const od = current('de_declaration').find((x) => x.originaldeclarant === live && x.year === d.year && x.declarationtype === DECLARATION_TYPE.yearly && x.declaranttype !== DECLARANT_TYPE.family && isPublished(x));
    if (od) officials.push({ decl: od, memberProfile: f.profile, type: f.type });
  }
  const officialDecls = new Set(officials.map((o) => o.decl));
  const excludedProfiles = new Set(officials.map((o) => o.memberProfile));
  const filter = (r, decl) => (officialDecls.has(decl) ? r.familymembertype === null : decl === d ? !excludedProfiles.has(r.profile) : true);
  return { linked, fam, officials, decls: [d, ...linked, ...officials.map((o) => o.decl)], filter };
}

/**
 * Նախորդ բոլոր տարիների հրապարակված տարեկան հայտարարագրերի խնայողություն՝ Σ (եկամուտ − ընթացիկ տարեկան ծախս, 4.1) (DEC-R6 (գ)).
 * Նախորդ հայտարարագիր չլինելու դեպքում՝ 0։ Առանձին հաշվարկում՝ անձի սեփական տողերը, ընտանիքի կազմով՝ նախորդ տարիների ընտանիքի կազմը
 */
function previousSavings(person, year, corrections, family, formulas) {
  const prev = declarationsOfPerson(person, { publishedOnly: true }).filter((p) => p.year < year && (!family || p.declaranttype !== DECLARANT_TYPE.family)).sort((a, b) => a.year - b.year);
  const years = prev.map((p) => {
    const fc = family ? familyComposition(p) : null;
    const e = computeExpense(fc ? fc.decls : [p], fc ? fc.filter : (r) => r.familymembertype === null, corrections, formulas);
    return { year: p.year, code: p.code, income: e.E, expense: e.annual, savings: e.E - e.annual };
  });
  return { years, total: years.reduce((a, y) => a + y.savings, 0) };
}

function buildDeclarationScopes(d, corrections, checkFor = () => undefined, formulas) {
  const { linked, fam, officials, decls: famDecls, filter: famFilter } = familyComposition(d);
  const scopes = [];
  const mk = (s) => {
    let prev = null;
    return { ...s, year: d.year, exp: computeExpense(s.decls, s.filter, corrections, formulas), table: null,
      get prevSavings() { return (prev ||= previousSavings(s.decls[0].originaldeclarant, d.year, corrections, s.kind === 'family', formulas)); } };
  };
  scopes.push(mk({ key: `ind:${d.originaldeclarant}`, kind: 'individual', label: `${profileName(d.originaldeclarant)} (հայտարարատու, առանձին)`, decls: [d], filter: (r) => r.familymembertype === null, persons: 1, profiles: [d.originaldeclarant], penaltyCheck: checkFor(d) }));
  for (const l of linked) {
    const t = fam.find((f) => liveProfileOf(byInstance('de_profile', f.profile))?.instanceid === l.originaldeclarant)?.type;
    scopes.push(mk({ key: `ind:${l.originaldeclarant}`, kind: 'individual', label: `${profileName(l.originaldeclarant)} (${lk('c_familymembertype', t) || 'ընտանիքի անդամ'}, առանձին հայտարարագիր)`, decls: [l], filter: (r) => r.familymembertype === null, persons: 1, profiles: [l.originaldeclarant], penaltyCheck: checkFor(l) }));
  }
  if (fam.length) {
    const memberLive = fam.map((f) => liveProfileOf(byInstance('de_profile', f.profile))?.instanceid).filter(Boolean);
    scopes.push(mk({ key: 'family', kind: 'family', label: `Ընտանիքի ընդհանուր կազմ (${fam.length + 1} անձ)`, decls: famDecls, filter: famFilter, persons: fam.length + 1, profiles: [d.originaldeclarant, ...memberLive] }));
  }
  // ընտանիքի ընդհանուր կազմի հաշվարկ (DEC-R6). ընտանիքի անդամներ չլինելու դեպքում՝ հայտարարատուի հաշվարկը
  for (const s of scopes) { s.table = (name) => s.exp.rows(name); s.familyTotal = s.kind === 'family' || (!fam.length && s === scopes[0]); }
  return { scopes, linked, fam, officials };
}

/** Հայտարարատուի ՀԾՀ. պրոֆիլից (EPD-ում de_declaration.ssn-ը լրացված է հայտարարագրերի միայն ~17%-ում, պրոֆիլինը՝ 99.6%-ում) */
export const declarationSsn = (d) => byInstance('de_profile', d.originaldeclarant)?.ssn || d.ssn || null;

/** Տույժերի ֆայլի «Հայտարարատուի տեսակ» → c_declaranttype (նույն անձի տարբեր դերերի հայտարարագրերը տարբերելու համար) */
const PENALTY_DECLARANT = { 'Պ/Ա': DECLARANT_TYPE.officer, 'Ը/Ա': DECLARANT_TYPE.family, 'Կ Պ/Ա': DECLARANT_TYPE.partyLeader };

/**
 * Անձանց տույժերի պատմություն (DEC-R3, DEC-R4; ԿԿՀ-ի ճշտում 24.11.2026)։ Տույժերի յուրաքանչյուր կապակցվող գրառման համար EPD-ում
 * փնտրվում է անձի (ՀԾՀ) նույն տարվա և տեսակի հայտարարագիրը (ցանկացած տեսակ՝ տարեկան, ստանձնելու, դադարեցնելու).
 *   • late՝ հրապարակվել է տույժից (ՎԻՎ Ա ամսաթվից) հետո (DEC-R3)
 *   • unsubmitted՝ չի հրապարակվել կամ EPD-ում չկա (DEC-R4)
 *   • before՝ հրապարակվել է մինչև տույժը (իրադարձություն չէ)
 * @returns Map<ՀԾՀ, [{ kind, year, type, record, decl, publishedOn }]>՝ ըստ տարվա և ՎԻՎ Ա ամսաթվի
 */
export function penaltyHistory(records) {
  const byKey = new Map();
  for (const d of current('de_declaration')) {
    const ssn = declarationSsn(d);
    if (!ssn) continue;
    const k = penaltyKey(ssn, d.year, d.declarationtype);
    byKey.set(k, [...(byKey.get(k) || []), d]);
  }
  const hist = new Map();
  for (const r of records || []) {
    if (!isLinkable(r)) continue;
    const all = byKey.get(penaltyKey(r.ssn, r.year, r.declarationType)) || [];
    const role = PENALTY_DECLARANT[r.declarantType];
    const byRole = all.filter((d) => d.declaranttype === role);
    const cands = byRole.length ? byRole : all;
    const pub = cands.filter(isPublished).sort((a, b) => (a.publishedon || '').localeCompare(b.publishedon || ''))[0];
    const publishedOn = pub?.publishedon ? pub.publishedon.slice(0, 10) : null;
    const kind = !pub ? 'unsubmitted' : publishedOn > r.vivDate ? 'late' : 'before';
    if (!hist.has(r.ssn)) hist.set(r.ssn, []);
    hist.get(r.ssn).push({ kind, year: r.year, type: r.declarationType, record: r, decl: pub || cands[0] || null, publishedOn });
  }
  for (const list of hist.values()) list.sort((a, b) => a.year - b.year || a.record.vivDate.localeCompare(b.record.vivDate));
  return hist;
}

/**
 * Տույժի գրառման ստուգում EPD-ով՝ մուտքագրման և ներմուծման ժամանակ (նախազգուշացում, ոչ արգելք).
 *   • not_found՝ EPD-ում այս ՀԾՀ-ի, տարվա և տեսակի հայտարարագիր չկա (հավանական սխալ. տույժը կհամարվի չներկայացում, DEC-R4)
 *   • before՝ հայտարարագիրը հրապարակվել է մինչև տույժը (ուշացում չի համարվի, DEC-R3 չի աշխատի)
 * @returns { warning: 'not_found'|'before'|null, decl, publishedOn } կամ null, եթե գրառումը չի կապակցվում (ՀԾՀ, տարի, տեսակ, ամսաթիվ)
 */
export function checkPenaltyRecord(rec) {
  const e = penaltyHistory([rec]).get(rec.ssn)?.[0];
  if (!e) return null;
  return { warning: e.kind === 'before' ? 'before' : e.kind === 'unsubmitted' && !e.decl ? 'not_found' : null, decl: e.decl, publishedOn: e.publishedOn };
}

function evaluateDeclarations(state, rules) {
  const formulas = effectiveFormulas(state);
  const units = [];
  const maxManual = manualMaxWeight(state);
  /** Հաշվարկում աշխատած կանոնների քաշերի գումար (տեղեկատվական) */
  const scopeScore = (sc) => Object.values(sc.results).filter((r) => r.status === STATUS.fired).reduce((t, r) => t + (Number(r.weight) || 0), 0);
  // Տույժեր (COM-11, մոդուլում վարվող տվյալներ). տարեկան հայտարարագրի վրա կիրառվում են անձի այդ և նախորդ բոլոր տարիների
  // տույժերը՝ ցանկացած տեսակի հայտարարագրի համար (DEC-R3, DEC-R4)
  const penaltiesLoaded = Array.isArray(state.penalties?.records);
  const history = penaltyHistory(state.penalties?.records);
  const checkFor = (d, ssn = declarationSsn(d), year = d.year) => {
    const events = (ssn && history.get(ssn) || []).filter((e) => e.year <= year);
    return {
      loaded: penaltiesLoaded, decl: d, year, ssn, status: !d ? 'missing' : isPublished(d) ? 'published' : 'not_published',
      events, late: events.filter((e) => e.kind === 'late'), unsubmitted: events.filter((e) => e.kind === 'unsubmitted'), records: events.map((e) => e.record),
    };
  };
  const allDecls = current('de_declaration').filter((d) => d.declarationtype === DECLARATION_TYPE.yearly);

  // Գնահատման միավոր՝ պաշտոնատար անձի (և կուսակցության ղեկավարի) հրապարակված տարեկան հայտարարագիրը. ընտանիքի անդամների հայտարարագրերը կապվում են parentdeclaration-ով (DEC-05)
  const roots = allDecls.filter((d) => d.declaranttype !== DECLARANT_TYPE.family && isPublished(d));
  for (const d of roots) {
    const base = { id: d.instanceid, code: d.code, decl: d, profile: byInstance('de_profile', d.originaldeclarant), year: d.year };
    const refDate = `${d.year}-12-31`;
    const threshold = variableValue(state.variables || {}, 'dec_threshold', refDate);
    const manual = manualFor(state, 'declarations', d.instanceid);
    const manualFlag = mergedManual(manual, maxManual);

    const run = (corrections) => {
      const built = buildDeclarationScopes(d, corrections, checkFor, formulas);
      const ext = new ExternalContext({ direction: 'declarations', unit: d.code });
      const mortgageKeywords = variableValue(state.variables || {}, 'mortgage_keywords', refDate) || [];
      for (const s of built.scopes) {
        s.mortgageKeywords = mortgageKeywords; // DEC-R5. հիփոթեքային վարկերի ճանաչում
        s.results = runRules(rules, s, { direction: 'declarations', level: 'scope', state, refDate, ext });
        s.score = scopeScore(s); // տեղեկատվական. շեմի հետ համեմատվում է համախառն միավորը
      }
      return { ...built, ...combinedScore(built.scopes, manualFlag) };
    };
    const ids = new Set([d.instanceid, ...current('de_declaration').filter((x) => x.parentdeclaration === d.instanceid).map((x) => x.instanceid)]);
    const myCorrections = Object.fromEntries(Object.entries(state.corrections || {}).filter(([, c]) => ids.has(c._declaration)));
    const cur = run(state.corrections || {});
    const original = Object.keys(myCorrections).length ? run({}) : null;
    units.push({ ...base, ...cur, original, corrections: myCorrections, threshold, manual, manualFlag, risky: threshold !== null && cur.score >= threshold });
  }

  // Ներկայացված (հրապարակված) չլինող հայտարարագրեր և տույժերի ֆայլում առկա, բայց EPD-ում բացակայող հայտարարագրեր.
  // գնահատվում են միայն տույժերի կանոններով (DEC-R3, DEC-R4)
  const penaltyRules = rules.filter((r) => r.penaltyRule);
  const statusUnit = ({ id, code, decl, profile, year, declarationType, label, check }) => {
    const refDate = `${year}-12-31`;
    const threshold = variableValue(state.variables || {}, 'dec_threshold', refDate);
    const manual = manualFor(state, 'declarations', id);
    const manualFlag = mergedManual(manual, maxManual);
    const scope = { key: `ind:${id}`, kind: 'individual', statusOnly: true, label, year, decls: decl ? [decl] : [], persons: 1, profiles: [], exp: null, table: () => [], penaltyCheck: check };
    scope.results = runRules(penaltyRules, scope, { direction: 'declarations', level: 'scope', state, refDate, ext: new ExternalContext({ direction: 'declarations', unit: code }) });
    scope.score = scopeScore(scope);
    const { score, indicators } = combinedScore([scope], manualFlag);
    return { id, code, decl, profile, year, declarationType, statusOnly: true, missing: !decl, penalties: check.yearRecords || check.records, scopes: [scope], linked: [], fam: [], original: null, corrections: {}, threshold, manual, manualFlag, score, indicators, risky: threshold !== null && score >= threshold };
  };
  for (const d of allDecls.filter((x) => !isPublished(x))) {
    const profile = byInstance('de_profile', d.originaldeclarant);
    units.push(statusUnit({ id: d.instanceid, code: d.code, decl: d, profile, year: d.year, declarationType: d.declarationtype, label: `${profileName(d.originaldeclarant)} (${lk('c_declaranttype', d.declaranttype)}, ${lk('c_wfstate', d.wfstateid)})`, check: checkFor(d) }));
  }
  // Տարեկան հայտարարագրի տույժ, որի հայտարարագիրը EPD-ում չկա ոչ մի կարգավիճակով՝ «Հայտարարագիր չկա» տող
  const inEpd = new Set(allDecls.map((d) => declarationSsn(d) && penaltyKey(declarationSsn(d), d.year, d.declarationtype)).filter(Boolean));
  for (const [key, records] of indexPenalties(state.penalties?.records)) {
    if (inEpd.has(key) || records[0].declarationType !== DECLARATION_TYPE.yearly) continue;
    const r = records[0];
    const live = liveProfileBySsn(r.ssn);
    const profile = live ? { ...live } : { firstname: r.firstName, lastname: r.lastName, middlename: r.patronymic, ssn: r.ssn };
    const id = `pen-${r.ssn}-${r.year}-${r.declarationType}`;
    units.push(statusUnit({ id, code: `ՎԻՎ Ա ${r.vivNumber || '—'}`, decl: null, profile, year: r.year, declarationType: r.declarationType, label: `${profile.firstname} ${profile.lastname} (հայտարարագիր չկա, տույժ)`, check: { ...checkFor(null, r.ssn, r.year), yearRecords: records } }));
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
