/**
 * Հայտարարագրերի կանոններ — SRS բաժին 4։
 * Գնահատման միավոր՝ «շրջանակ» (scope). հայտարարատուի առանձին հաշվարկ կամ ընդհանուր ընտանիքի կազմ (DEC-04)։
 * Քաշերը կարգավորվում են «Կանոններ» էջում (բաժին 9՝ «հայտարարագրերի չափորոշիչների քաշեր»)։
 */
import { v, fired, notFired, normName } from './common.js';
import { EXPENSE_LABELS } from '../engine/annualExpense.js';
import { NotEvaluated, NotApplicable } from '../engine/expression.js';
import { byInstance, profileChildren } from '../data/epd/repository.js';
import { DECLARANT_TYPE, lk } from '../data/epd/classifiers.js';

const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('.') : '');
const personText = (x) => `${x.firstName} ${x.lastName}${x.birthDate ? ` (ծնվ. ${fmtDate(x.birthDate)})` : ''}`;

/** Հայտարարագրի մերձավոր ազգականների տեսակներ (c_relativetype) */
const REL = { adultChild: [2], parent: [1], sibling: [3, 4], inlaw: [5] };

/**
 * ՔԿԱԳ-ի տվյալով ընտանիքի անդամներ և մերձավոր ազգականներ/խնամիներ և հայտարարագրում նշվածները (DEC-R2,
 * կառուցիչի ext.civil_* և doc.* փոփոխականներ)։
 *   • ընտանիքի անդամ՝ ընթացիկ ամուսին/կին (ամենաուշ ակտը նրա հետ ամուսնության է) + երեխաներ (ծննդյան ակտերից)
 *   • մերձավոր ազգական՝ ծնողներ + եղբայրներ/քույրեր. ծնողները՝ հայտարարատուի ծննդյան ակտից, եղբայրները/քույրերը՝
 *     ծնողների ՀԾՀ-ով հարցվող նրանց մյուս երեխաների ծննդյան ակտերից (ներառյալ խորթ եղբայրները/քույրերը)
 *   • խնամի՝ ամուսնու/կնոջ ծնողներ. ամուսնու ՀԾՀ-ով հարցվում է նրա ծննդյան ակտը
 *   • հաշվի են առնվում միայն մինչև հաշվետու տարվա վերջը կատարված ակտերը
 *   • մահացածները հաշվի չեն առնվում և չեն ցուցադրվում. ստուգվում է ՔԿԱԳ-ի մահվան ակտով (անձի ՀԾՀ-ով հարցում,
 *     ամսաթիվը՝ cert_date)՝ հայտարարագրի ներկայացման (հրապարակման, publishedon) օրվա դրությամբ։
 *     ՀԾՀ չունեցող անձի մահը չի ստուգվում (հաշվվում է որպես կենդանի)
 * Հայտարարագրից՝ ընտանիքի անդամներ, «Չափահաս զավակ» (2), «Ծնող» (1), «Եղբայր»/«Քույր» (3, 4), «Ամուսնու ծնող» (5)։
 * @param d    պաշտոնատար անձի հայտարարագիր (de_declaration)
 * @param ext  { get, snap }՝ արտաքին տվյալների հարցում և պատասխանի պահպանում (COM-14, COM-16)
 */
export function civilKinship(d, ext) {
  if (d.declaranttype === DECLARANT_TYPE.family) throw new NotApplicable('Ընտանիքի անդամի առանձին հայտարարագիր. կանոնը կիրառվում է պաշտոնատար անձի հայտարարագրի նկատմամբ');
  if (!d.ssn) throw new NotEvaluated('Հայտարարատուի ՀԾՀ-ն բացակայում է. ՔԿԱԳ-ի հարցումը հնարավոր չէ');
  const asOf = `${d.year}-12-31`;
  // մահը ստուգվում է ներկայացման (հրապարակման) օրվա դրությամբ. չհրապարակված հայտարարագրի դեպքում՝ տարվա վերջի
  const submitted = (d.publishedon || '').slice(0, 10) || asOf;
  const allActsOf = (ssn) => {
    const res = ext.get('civilFamily', ssn);
    ext.snap(res.snapshot);
    return [...res.value].sort((x, y) => (x.actDate || '').localeCompare(y.actDate || ''));
  };
  const actsOf = (ssn) => allActsOf(ssn).filter((x) => !x.actDate || x.actDate <= asOf);
  const keyOf = (x) => x.psn || `${normName(x.firstName)}|${x.birthDate}`;
  const uniq = (list) => [...new Map(list.map((x) => [keyOf(x), x])).values()];
  /** Մահվան ստուգում՝ ՔԿԱԳ-ի մահվան ակտով (ամսաթիվը համեմատվում է ներկայացման ամսաթվի հետ) */
  const deathOf = (x) => {
    if (!x.psn) return { status: 'unknown' };
    const act = allActsOf(x.psn).find((y) => y.actType === 'death' && y.actDate && y.actDate <= submitted);
    return act ? { status: 'dead', date: act.actDate, actRef: act.actRef } : { status: 'alive' };
  };
  const withDeath = (list) => list.map((x) => ({ ...x, death: deathOf(x) }));
  const alive = (list) => list.filter((x) => x.death.status !== 'dead');
  const dead = (list) => list.filter((x) => x.death.status === 'dead');

  const acts = actsOf(d.ssn);
  const lastBySpouse = new Map();
  for (const x of acts) if (x.spouse) lastBySpouse.set(keyOf(x.spouse), x);
  const allSpouses = withDeath([...lastBySpouse.values()].filter((x) => x.actType === 'marriage').map((x) => ({ ...x.spouse, act: x })));
  const formerSpouses = [...lastBySpouse.values()].filter((x) => x.actType === 'divorce').map((x) => ({ ...x.spouse, act: x }));
  const allChildren = withDeath(uniq(acts.filter((x) => x.child).map((x) => ({ ...x.child, act: x }))));
  const allParents = withDeath(uniq(acts.filter((x) => x.actType === 'own_birth').flatMap((x) => x.parents)));
  // եղբայրներ/քույրեր՝ բոլոր ծնողների (նաև մահացածների) ակտերով
  const allSiblings = withDeath(uniq(allParents.filter((p) => p.psn).flatMap((p) => actsOf(p.psn).filter((x) => x.child && x.child.psn !== d.ssn).map((x) => ({ ...x.child, act: x })))));
  const spouses = alive(allSpouses);
  // խնամիներ՝ կենդանի ամուսնու ծնողները
  const allInlaws = withDeath(uniq(spouses.filter((sp) => sp.psn).flatMap((sp) => actsOf(sp.psn).filter((x) => x.actType === 'own_birth').flatMap((x) => x.parents))));
  const children = alive(allChildren);
  const parents = alive(allParents);
  const siblings = alive(allSiblings);
  const inlaws = alive(allInlaws);
  const deceased = { spouses: dead(allSpouses), children: dead(allChildren), parents: dead(allParents), siblings: dead(allSiblings), inlaws: dead(allInlaws) };
  const unchecked = [...allSpouses, ...allChildren, ...allParents, ...allSiblings, ...allInlaws].filter((x) => x.death.status === 'unknown');

  const relatives = profileChildren('de_profilerelatives', d.declarant);
  const relOf = (types) => relatives.filter((r) => types.includes(r.relativetype));
  const declared = {
    familyMembers: profileChildren('de_profilefamilymembers', d.declarant).map((f) => { const pr = byInstance('de_profile', f.profile); return pr && { ...pr, familymembertype: f.type }; }).filter(Boolean),
    adultChildren: relOf(REL.adultChild),
    parents: relOf(REL.parent),
    siblings: relOf(REL.sibling),
    inlaws: relOf(REL.inlaw),
  };
  const civil = { family: spouses.length + children.length, parents: parents.length, siblings: siblings.length, relatives: parents.length + siblings.length, inlaws: inlaws.length };
  const decl = { family: declared.familyMembers.length + declared.adultChildren.length, parents: declared.parents.length, siblings: declared.siblings.length, relatives: declared.parents.length + declared.siblings.length, inlaws: declared.inlaws.length };
  return { spouses, formerSpouses, children, parents, siblings, inlaws, deceased, unchecked, declared, civil, decl, asOf, submitted };
}

/**
 * DEC-R2-ի հաշվարկ գնահատման շրջանակի համար. կիրառվում է միայն պաշտոնատար անձի առանձին հաշվարկում։
 * Ընտանիքի ընդհանուր կազմում ստուգումը նույնն է (հայտարարագրի ամբողջականություն), ուստի կիրառելի չէ։
 */
export function civilKinshipOfScope(scope, ext) {
  if (scope.kind === 'family') throw new NotApplicable('Ընտանիքի ընդհանուր կազմ. կանոնը ստուգում է պաշտոնատար անձի հայտարարագրի ամբողջականությունը և կիրառվում է միայն առանձին հաշվարկում');
  return civilKinship(scope.decls[0], ext);
}

/**
 * DEC-R5. տարվա ընթացքում ստացված վարկեր (եկամտի տեսակ 13)՝ բաժանված հիփոթեքայինների և մնացածի։ Հիփոթեքային է այն տողը, որի
 * տեքստում (նկարագրություն, վճարող, կապի բնույթ) կա բանալի բառերից որևէ մեկը (scope.mortgageKeywords, համակարգային
 * փոփոխական mortgage_keywords). համեմատությունը՝ բառի մաս, առանց մեծատառ/փոքրատառ տարբերության
 */
export function receivedLoans(scope) {
  const kws = (scope.mortgageKeywords || []).map((k) => String(k).toLocaleLowerCase('hy').trim()).filter(Boolean);
  const amdOf = (r) => (r.amount_amount == null || r.amount_ratetodefault == null ? 0 : r.amount_amount * r.amount_ratetodefault);
  const rows = (scope.exp ? scope.exp.rows('de_revenuesincomes') : []).filter((r) => r.incometype === 13).map((row) => {
    const text = [row.description, row.incomepayerfullname, row.natureofrelationshipwithpayer].filter(Boolean).join(' ').toLocaleLowerCase('hy');
    const keyword = kws.find((k) => text.includes(k)) || null;
    return { row, amd: amdOf(row), mortgage: !!keyword, keyword };
  });
  const mortgage = rows.filter((x) => x.mortgage);
  const sum = (list) => list.reduce((t, x) => t + x.amd, 0);
  return { rows, mortgage, allSum: sum(rows), otherSum: sum(rows.filter((x) => !x.mortgage)) };
}

/**
 * Կանխիկի չափորոշիչ (բաժին 4, չափորոշիչ 6; ԿԿՀ-ի ճշտում 25.11.2026).
 *   • կանխիկը և անկանխիկ միջոցները՝ հայտարարատուի և ընտանիքի անդամների գումարով (ընտանիքի ընդհանուր կազմով հաշվարկ)
 *   • պայմանները ստուգվում են հաջորդաբար. (ա) չբավարարվելու դեպքում (բ)-ն չի ստուգվում, (բ)-ի դեպքում՝ (գ)-ն
 *   • (գ) «գերազանցում է նախորդ բոլոր տարիների խնայողությունը» վերանայվում է. այն ունի միայն պահուստային (լռելյայն անջատված) DEC-R6-2-ը
 */
function cashRule({ id, withSavings, defaultEnabled }) {
  const P = (k) => `doc.family_${k}`;
  const moment = (m) => `(${P(`cash_${m}`)} > var.cash_threshold and ${P(`cash_${m}`)} >= var.cash_ratio * ${P(`noncash_${m}`)}${withSavings ? ` and ${P(`cash_${m}`)} > ${P('prev_savings')}` : ''})`;
  return {
    id,
    direction: 'declarations',
    title: withSavings ? 'Խոշոր կանխիկ՝ չհիմնավորված ծագմամբ, ներառյալ նախորդ տարիների խնայողությունը (պահուստային)' : 'Խոշոր կանխիկ՝ չհիմնավորված ծագմամբ',
    criterion: `Հայտարարատուի և ընտանիքի անդամների կանխիկը տարեսկզբին կամ տարեվերջին (ա) մեծ է շեմից և (բ) առնվազն N անգամ գերազանցում է նրանց անկանխիկ միջոցները և ավանդները${withSavings ? ', (գ) գերազանցում է նախորդ բոլոր տարիների խնայողությունը (եկամուտ − ընթացիկ տարեկան ծախս)' : ''}. պայմանները ստուգվում են հաջորդաբար`,
    srsRef: withSavings ? 'Բաժին 4, չափորոշիչ 6 (քաշ 25), պահուստային տարբերակ՝ (գ) պայմանով; Q-25' : 'Բաժին 4, չափորոշիչ 6 (քաշ 25)',
    requirements: ['DEC-04', 'DEC-06', 'DEC-09', 'DEC-11'],
    weight: 25,
    ...(defaultEnabled === false ? { defaultEnabled: false } : {}),
    builderExpression: `${moment('start')} or ${moment('end')}`,
    params: [
      { key: 'threshold', label: 'Կանխիկի շեմ', unit: 'AMD', default: { var: 'cash_threshold' } },
      { key: 'ratio', label: 'Կանխիկի և անկանխիկ միջոցների հարաբերակցություն', unit: 'անգամ', default: { var: 'cash_ratio' } },
    ],
    caveats: [
      'Կանխիկը և անկանխիկ միջոցները՝ հայտարարատուի և ընտանիքի անդամների գումարով. կանոնը գնահատվում է ընտանիքի ընդհանուր կազմով հաշվարկում (ընտանիքի անդամներ չլինելու դեպքում՝ հայտարարատուի հաշվարկում), անհատական հաշվարկներում կիրառելի չէ',
      'Անկանխիկ միջոցներ և ավանդներ՝ բանկային հաշիվներ, էլեկտրոնային հաշիվներ և կրիպտոարժույթ, ավանդներ («առկա» ցանկեր)',
      `Պայմանները ստուգվում են հաջորդաբար. (ա) չբավարարվելու դեպքում (բ)-ն չի ստուգվում${withSavings ? ', (բ) չբավարարվելու դեպքում՝ (գ)-ն' : ''}`,
      withSavings
        ? '(գ) Q-25. ծագումը հիմնավորված է, եթե կանխիկը չի գերազանցում նախորդ բոլոր տարիների հրապարակված տարեկան հայտարարագրերի խնայողության գումարը՝ Σ (եկամուտ − ընթացիկ տարեկան ծախս, 4.1). նախորդ հայտարարագիր չլինելու դեպքում՝ 0։ Պայմանը վերանայվում է, ուստի կանոնը լռելյայն անջատված է (DEC-R6-ի պահուստային տարբերակ)'
        : '(գ) «գերազանցում է նախորդ բոլոր տարիների խնայողությունը» պայմանը վերանայվում է և այս կանոնում չի կիրառվում (ԿԿՀ-ի ճշտում 25.11.2026). այն ներառված է պահուստային, լռելյայն անջատված DEC-R6-2 կանոնում',
      'Ծագման աղբյուրը (c_sourceoforigin) ցուցադրվում է տեղեկատվական. EPD-ում տարեվերջի ծագման դաշտը լրացված չէ',
    ],
    evaluate(scope, api) {
      if (!scope.familyTotal) throw new NotApplicable('Գնահատվում է ընտանիքի ընդհանուր կազմով (հայտարարատու և ընտանիքի անդամներ)');
      const threshold = api.param('threshold');
      const ratio = api.param('ratio');
      const e = scope.exp;
      const fmt = (n) => Math.round(n).toLocaleString('hy-AM');
      const origins = (fl) => [...new Set(e.rows('de_financialmeanscash').filter((r) => r.tabtype === 1).map((r) => lk('c_sourceoforigin', r[fl])).filter(Boolean))].join(', ');
      let prev = null; // նախորդ տարիների խնայողությունը հաշվարկվում է միայն (գ)-ի ստուգման դեպքում
      const savings = () => (prev ||= scope.prevSavings);
      // հաջորդական ստուգում. failed՝ առաջին չբավարարված պայմանը (null՝ բոլորը բավարարված են)
      const check = (label, cash, noncash) => {
        if (!(cash > threshold)) return { label, cash, noncash, failed: 'ա' };
        if (!(cash >= ratio * noncash)) return { label, cash, noncash, failed: 'բ' };
        if (withSavings && !(cash > savings().total)) return { label, cash, noncash, failed: 'գ' };
        return { label, cash, noncash, failed: null };
      };
      const moments = [check('տարեսկզբին', e.cashStart, e.noncashStart), check('տարեվերջին', e.cashEnd, e.noncashEnd)];
      const steps = withSavings ? ['ա', 'բ', 'գ'] : ['ա', 'բ'];
      const trail = (m) => {
        const stop = m.failed ? steps.indexOf(m.failed) : steps.length;
        return steps.map((st, i) => (i < stop ? `(${st}) այո` : i === stop ? `(${st}) ոչ` : `(${st}) չի ստուգվել`)).join(' → ');
      };
      const values = [
        v.amd('Կանխիկ տարեսկզբին', e.cashStart), v.amd('Անկանխիկ միջոցներ և ավանդներ տարեսկզբին', e.noncashStart),
        v.amd('Կանխիկ տարեվերջին', e.cashEnd), v.amd('Անկանխիկ միջոցներ և ավանդներ տարեվերջին', e.noncashEnd),
        v.amd('Կանխիկի շեմ', threshold), v.num('Հարաբերակցություն', ratio, 'անգամ'),
        ...(prev ? [...prev.years.map((y) => v.amd(`Խնայողություն ${y.year} (${y.code})՝ եկամուտ ${fmt(y.income)} − ծախս ${fmt(y.expense)}`, y.savings)),
          v.amd(`Նախորդ տարիների խնայողություն${prev.years.length ? '' : ' (նախորդ հայտարարագիր չկա)'}`, prev.total)] : []),
        ...moments.map((m) => v.text(`Պայմաններ ${m.label}`, trail(m))),
        origins('sourceoforiginatbeginningofyear') && v.text('Ծագման աղբյուր (տարեսկզբին, հայտարարատուի նշմամբ)', origins('sourceoforiginatbeginningofyear')),
        origins('sourceoforiginatendofyear') && v.text('Ծագման աղբյուր (տարեվերջին, հայտարարատուի նշմամբ)', origins('sourceoforiginatendofyear')),
      ].filter(Boolean);
      const hit = moments.find((m) => !m.failed);
      if (hit) return fired(values, `Կանխիկը ${hit.label} (${fmt(hit.cash)} ֏) գերազանցում է շեմը և ${ratio} անգամ և ավելի գերազանցում է անկանխիկ միջոցներն ու ավանդները (${fmt(hit.noncash)} ֏)${withSavings ? ` և չի հիմնավորվում նախորդ տարիների խնայողությամբ (${fmt(prev.total)} ֏)` : ''}`);
      const why = (m) => (m.failed === 'ա' ? `կանխիկը (${fmt(m.cash)} ֏) չի գերազանցում ${fmt(threshold)} ֏ շեմը`
        : m.failed === 'բ' ? `կանխիկը (${fmt(m.cash)} ֏) ${ratio} անգամ չի գերազանցում անկանխիկ միջոցներն ու ավանդները (${fmt(m.noncash)} ֏)`
          : `կանխիկը (${fmt(m.cash)} ֏) հիմնավորվում է նախորդ տարիների խնայողությամբ (${fmt(prev.total)} ֏)`);
      return notFired(values, moments.map((m) => `${m.label}՝ ${why(m)}`).join('. '));
    },
  };
}

export const declarationRules = [
  {
    id: 'DEC-R1',
    direction: 'declarations',
    title: 'Ընթացիկ ծախսը չի գերազանցում կենսաապահովման նվազագույն բյուջեն',
    criterion: 'Տարվա ընթացիկ ծախս − կենսաապահովման նվազագույն բյուջե ≤ 0. հայտարարագրված եկամուտները չեն բացատրում ծախսերը',
    srsRef: 'Բաժին 4, չափորոշիչ 1 (քաշ 30)',
    requirements: ['DEC-01', 'DEC-02', 'DEC-04', 'DEC-06', 'DEC-08', 'DEC-11', 'COM-18'],
    weight: 30,
    builderExpression: 'doc.expense_annual - 12 * var.min_living_budget * doc.persons <= 0',
    params: [{ key: 'budget', label: 'Կենսաապահովման նվազագույն բյուջե (1 անձ, ամսական)', unit: 'AMD', default: { var: 'min_living_budget' } }],
    caveats: [
      'Բյուջեի արժեքը SRS-ում տրված չէ («ԿԿՀ-ից»). նախասահմանված են նվազագույն սպառողական զամբյուղի արժեքները (Q-47(բ)), որոնք ԿԿՀ-ն կարող է փոխել «Փոփոխականներ» էջում',
      'Բյուջեն ամսական է և 1 անձի հաշվով. տարեկան ծախսի հետ համեմատելու համար բազմապատկվում է 12-ով և անձանց թվով (DEC-02)',
      'Բացասական ընթացիկ ծախսը նույնպես բավարարում է պայմանին (տարբերությունը < 0)',
    ],
    evaluate(scope, api) {
      const budget = api.param('budget');
      const e = scope.exp;
      const annualBudget = budget * 12 * scope.persons;
      const diff = e.annual - annualBudget;
      const fmt = (n) => Math.round(n).toLocaleString('hy-AM');
      const values = [
        v.amd(EXPENSE_LABELS.Ds, e.Ds), v.amd(EXPENSE_LABELS.E, e.E), v.amd(EXPENSE_LABELS.G, e.G), v.amd(EXPENSE_LABELS.Dv, e.Dv),
        v.amd(EXPENSE_LABELS.Ps, e.Ps), v.amd(EXPENSE_LABELS.Pv, e.Pv), v.amd(EXPENSE_LABELS.C, e.C), v.amd(EXPENSE_LABELS.annual, e.annual),
        v.amd('Կենսաապահովման նվազագույն բյուջե (1 անձ, ամսական)', budget), v.num('Անձանց թիվ', scope.persons),
        v.amd('Տարեկան նվազագույն բյուջե (բյուջե × 12 × անձանց թիվ)', annualBudget),
        v.amd('Տարբերություն (ԸՏԾ − տարեկան բյուջե)', diff),
      ];
      if (diff <= 0) return fired(values, `Ընթացիկ տարեկան ծախսը (${fmt(e.annual)} ֏) − նվազագույն բյուջե (${fmt(annualBudget)} ֏) = ${fmt(diff)} ֏ ≤ 0`);
      return notFired(values, `Ընթացիկ տարեկան ծախսը գերազանցում է նվազագույն բյուջեն ${fmt(diff)} ֏-ով`);
    },
  },
  {
    id: 'DEC-R2',
    direction: 'declarations',
    title: 'Չնշված ընտանիքի անդամ, մերձավոր ազգական կամ խնամի (ՔԿԱԳ)',
    criterion: 'ՔԿԱԳ-ի տվյալով ընտանիքի անդամների (ամուսին/կին + երեխաներ), մերձավոր ազգականների (ծնողներ, եղբայրներ/քույրեր) կամ խնամիների (ամուսնու ծնողներ) քանակը մեծ է հայտարարագրում նշվածների քանակից',
    srsRef: 'Բաժին 4, չափորոշիչ 2 (քաշ 5); «այլ աղբյուր»՝ ՔԿԱԳ (Q-28)',
    requirements: ['DEC-04', 'COM-09', 'COM-13', 'COM-14', 'COM-16', 'COM-17'],
    weight: 5,
    params: [],
    external: ['civil'],
    builderExpression: 'ext.civil_family_count > doc.family_members_count + doc.adult_children_count or ext.civil_relatives_count > doc.relatives_count or ext.civil_inlaws_count > doc.inlaws_count',
    caveats: [
      'Համեմատվում է ամեն խումբն առանձին. ընտանիքի անդամներ (հայտարարագրում՝ ընտանիքի անդամներ + «Չափահաս զավակ»), մերձավոր ազգականներ՝ ծնողներ և եղբայրներ/քույրեր («Ծնող», «Եղբայր», «Քույր»), խնամիներ («Ամուսնու ծնող»)',
      'Ծնողները՝ հայտարարատուի ծննդյան ակտից, եղբայրները/քույրերը՝ ծնողների ՀԾՀ-ով լրացուցիչ հարցումներով, խնամիները՝ ամուսնու ՀԾՀ-ով. եթե հայտարարատուի կամ ամուսնու ծննդյան ակտը ՔԿԱԳ-ում չկա, համապատասխան խումբը 0 է',
      'ՔԿԱԳ-ի պատասխանում ակտի տեսակը և հարցվող անձի դերը նշված չեն (Q-49). ենթադրվում են լրացված դաշտերից',
      'Ամուսինը՝ ընթացիկ (նախկինը և նրա ծնողները հաշվի չեն առնվում). երեխաները՝ բոլորը, անկախ տարիքից. խորթ եղբայրները/քույրերը ներառվում են',
      'Հաշվի են առնվում միայն մինչև հաշվետու տարվա վերջը կատարված ակտերը. համեմատվում են քանակները, ոչ թե անձերը',
      'Մահացածները հաշվի չեն առնվում և չեն ցուցադրվում. ստուգվում է ՔԿԱԳ-ի մահվան ակտով, որի ամսաթիվը (վկայականի ամսաթիվ) համեմատվում է հայտարարագրի ներկայացման (հրապարակման) ամսաթվի հետ. ներկայացումից հետո մահացածը հաշվվում է։ ՀԾՀ չունեցող անձի մահը չի ստուգվում',
      'Կիրառվում է միայն պաշտոնատար անձի առանձին հաշվարկում. ընտանիքի ընդհանուր կազմում և ընտանիքի անդամի առանձին հայտարարագրում կիրառելի չէ',
    ],
    evaluate(scope, api) {
      const k = civilKinshipOfScope(scope, api.ext);
      const names = (list) => list.map(personText).join('; ');
      // Համեմատման աղյուսակ (ցուցադրվում է «ՔԿԱԳ» և «Հայտարարագիր» սյունակներով)
      // մահացածները չեն ցուցադրվում
      const civ = (list, role) => list.map((x) => ({ name: personText(x), note: x.death?.status === 'unknown' ? `${role} · ՀԾՀ չկա, մահը չի ստուգվել` : role }));
      const dec = (list, note) => list.map((x) => ({ name: `${x.firstname} ${x.lastname}`, note: note(x) }));
      const row = (label, civilItems, declItems) => ({ label, left: civilItems, right: declItems, gap: civilItems.filter((x) => !x.excluded).length > declItems.length });
      const comparison = {
        columns: ['ՔԿԱԳ', 'Հայտարարագիր'],
        rows: [
          row('Ընտանիքի անդամներ',
            [...civ(k.spouses, 'ամուսին/կին'), ...civ(k.children, 'երեխա')],
            [...dec(k.declared.familyMembers, (x) => lk('c_familymembertype', x.familymembertype)), ...dec(k.declared.adultChildren, (x) => lk('c_relativetype', x.relativetype))]),
          row('Մերձավոր ազգականներ (ծնողներ, եղբայրներ/քույրեր)', [...civ(k.parents, 'ծնող'), ...civ(k.siblings, 'եղբայր/քույր')], dec([...k.declared.parents, ...k.declared.siblings], (x) => lk('c_relativetype', x.relativetype))),
          row('Խնամիներ (ամուսնու/կնոջ ծնողներ)', civ(k.inlaws, 'ամուսնու ծնող'), dec(k.declared.inlaws, (x) => lk('c_relativetype', x.relativetype))),
        ],
      };
      const values = [
        v.num('ՔԿԱԳ. ամուսին/կին + երեխաներ', k.civil.family), v.num('Հայտարարագիր. ընտանիքի անդամներ + չափահաս զավակներ', k.decl.family),
        v.num('ՔԿԱԳ. ծնողներ + եղբայրներ/քույրեր', k.civil.relatives), v.num('Հայտարարագիր. ծնողներ + եղբայրներ/քույրեր', k.decl.relatives),
        v.num('ՔԿԱԳ. խնամիներ', k.civil.inlaws), v.num('Հայտարարագիր. խնամիներ', k.decl.inlaws),
      ];
      const notes = [
        ...(k.parents.length ? [] : [v.text('ՔԿԱԳ. հայտարարատուի ծննդյան ակտ', 'չի գտնվել. ծնողները և եղբայրները/քույրերը հնարավոր չէ որոշել')]),
        ...(k.formerSpouses.length ? [v.text('Հաշվի չի առնվել (ամուսնալուծություն)', names(k.formerSpouses))] : []),
      ];
      const extra = { comparison, notes };
      const gaps = [
        k.civil.family > k.decl.family && `ընտանիքի անդամներ՝ ՔԿԱԳ ${k.civil.family}, հայտարարագիր ${k.decl.family}`,
        k.civil.relatives > k.decl.relatives && `մերձավոր ազգականներ՝ ՔԿԱԳ ${k.civil.relatives}, հայտարարագիր ${k.decl.relatives}`,
        k.civil.inlaws > k.decl.inlaws && `խնամիներ՝ ՔԿԱԳ ${k.civil.inlaws}, հայտարարագիր ${k.decl.inlaws}`,
      ].filter(Boolean);
      if (gaps.length) return fired(values, `ՔԿԱԳ-ի տվյալով ավելի շատ անձինք կան, քան նշված է հայտարարագրում. ${gaps.join('; ')}`, extra);
      return notFired(values, 'Բոլոր խմբերում ՔԿԱԳ-ի տվյալով անձանց քանակը չի գերազանցում հայտարարագրում նշվածներին', extra);
    },
  },
  {
    id: 'DEC-R3',
    direction: 'declarations',
    title: 'Ներկայացվել է ուշացումով՝ վարչական տույժից հետո',
    criterion: 'Անձն այս կամ նախորդ որևէ տարում (ցանկացած տեսակի հայտարարագրի համար) հայտարարագիրը ներկայացրել (հրապարակել) է ԿԿՀ-ի կիրառած վարչական տույժից (ՎԻՎ Ա ամսաթվից) հետո',
    srsRef: 'Բաժին 4, չափորոշիչ 3 (քաշ 3); COM-11; տույժեր (Q-17)',
    requirements: ['COM-11', 'COM-12', 'COM-17', 'COM-18'],
    weight: 3,
    params: [],
    penaltyRule: true,
    builderExpression: 'ext.penalty_late_count >= 1',
    caveats: [
      'Տույժերը վարվում են մոդուլում («Արտաքին ֆայլեր → Տույժեր» էջ, COM-11). առանց դրանց կանոնը «չի գնահատվել»',
      'Կիրառվում է տարեկան հայտարարագրի վրա՝ անկախ այն բանից, թե որ տեսակի հայտարարագրի համար է տույժը (տարեկան, ստանձնելու, դադարեցնելու)',
      'Ուշացումը մեկ անգամ գրանցվելուց հետո ցուցանիշը կիրառվում է այդ և հաջորդ բոլոր տարիների տարեկան հայտարարագրերի վրա՝ մեկ անգամ (քաշը չի գումարվում ըստ տույժերի քանակի)',
      'Տույժը հայտարարագրի հետ կապվում է ՀԾՀ (պրոֆիլից) + տարի + հայտարարագրի տեսակ (+ հայտարարատուի տեսակ, եթե նշված է). ուշացում՝ հրապարակման ամսաթիվը (publishedon) ուշ է ՎԻՎ Ա ամսաթվից',
      'Ընտանիքի անդամի տույժը կիրառվում է նրա առանձին հայտարարագրի (առանձին հաշվարկի) վրա',
    ],
    evaluate(scope) {
      const pc = penaltyCheck(scope);
      const values = penaltyEventValues(pc);
      if (!pc.late.length) return notFired(values, `Մինչև ${pc.year} թ. ներառյալ տույժից հետո ներկայացված հայտարարագիր չկա`);
      const e = pc.late[0];
      return fired(values, `${e.year} թ. ${kindName(e.type)} հայտարարագիրը հրապարակվել է ${fmtDate(e.publishedOn)}՝ վարչական տույժից (ՎԻՎ Ա ${e.record.vivNumber || '—'}, ${fmtDate(e.record.vivDate)}) ${daysBetween(e.record.vivDate, e.publishedOn)} օր հետո. ցուցանիշը կիրառվում է ${e.year} թ. և հաջորդ տարիների տարեկան հայտարարագրերի վրա${pc.late.length > 1 ? ` (ուշացումով ներկայացումներ՝ ${pc.late.length}, կիրառվում է մեկ անգամ)` : ''}`);
    },
  },
  {
    id: 'DEC-R4',
    direction: 'declarations',
    title: 'Չի ներկայացվել նույնիսկ վարչական տույժից հետո',
    criterion: 'Անձն այս կամ նախորդ որևէ տարում (ցանկացած տեսակի հայտարարագրի համար) հայտարարագիրը չի ներկայացրել (հրապարակված չէ կամ EPD-ում չկա) ԿԿՀ-ի կիրառած վարչական տույժից հետո',
    srsRef: 'Բաժին 4, չափորոշիչ 4 (քաշ 7); COM-11; տույժեր (Q-17)',
    requirements: ['COM-11', 'COM-12', 'COM-17', 'COM-18'],
    weight: 7,
    params: [],
    penaltyRule: true,
    builderExpression: 'ext.penalty_unsubmitted_count >= 1',
    caveats: [
      'Տույժերը վարվում են մոդուլում («Արտաքին ֆայլեր → Տույժեր» էջ, COM-11). առանց դրանց կանոնը «չի գնահատվել»',
      'Կիրառվում է տարեկան հայտարարագրի վրա՝ անկախ այն բանից, թե որ տեսակի հայտարարագրի համար է տույժը. մեկ անգամ գրանցվելուց հետո՝ այդ և հաջորդ բոլոր տարիների տարեկան հայտարարագրերի վրա, մեկ անգամ',
      'Ներկայացված է համարվում միայն հրապարակված հայտարարագիրը. սևագիր, հանձնված, ուղղման ընթացքում գտնվող հայտարարագիրը համարվում է չներկայացված։ Ավելի ուշ հրապարակվելու դեպքում իրադարձությունը դառնում է ուշացում (DEC-R3)',
      'Եթե տարեկան հայտարարագրի տույժ կա, բայց EPD-ում այդ հայտարարագիրը չկա ոչ մի կարգավիճակով, ցանկում ավելանում է «Հայտարարագիր չկա» տող',
      'Ընտանիքի անդամի տույժը կիրառվում է նրա առանձին հայտարարագրի (առանձին հաշվարկի) վրա',
    ],
    evaluate(scope) {
      const pc = penaltyCheck(scope);
      const values = penaltyEventValues(pc);
      if (!pc.unsubmitted.length) return notFired(values, `Մինչև ${pc.year} թ. ներառյալ տույժից հետո էլ չներկայացված հայտարարագիր չկա`);
      const e = pc.unsubmitted[0];
      const state = e.decl ? `կարգավիճակ՝ «${lk('c_wfstate', e.decl.wfstateid)}»` : 'EPD-ում չկա';
      return fired(values, `${e.year} թ. ${kindName(e.type)} հայտարարագիրը չի ներկայացվել (${state}), թեև ${fmtDate(e.record.vivDate)}-ին կիրառվել է վարչական տույժ (ՎԻՎ Ա ${e.record.vivNumber || '—'}). ցուցանիշը կիրառվում է ${e.year} թ. և հաջորդ տարիների տարեկան հայտարարագրերի վրա${pc.unsubmitted.length > 1 ? ` (չներկայացումներ՝ ${pc.unsubmitted.length}, կիրառվում է մեկ անգամ)` : ''}`);
    },
  },
  {
    id: 'DEC-R5',
    direction: 'declarations',
    title: 'Տարվա ընթացքում վերցված վարկ, որը չի գերազանցում տարեսկզբի կանխիկը',
    criterion: 'Տարվա ընթացքում ստացված վարկերի և փոխառությունների (բացի հիփոթեքայիններից) գումարը > 0 և ≤ տարեսկզբի կանխիկ գումարը',
    srsRef: 'Բաժին 4, չափորոշիչ 5 (քաշ 5)',
    requirements: ['DEC-04', 'DEC-06', 'DEC-11'],
    weight: 5,
    builderExpression: 'doc.loans_received_nonmortgage > 0 and doc.loans_received_nonmortgage <= doc.cash_start',
    params: [],
    caveats: [
      'Վերցված վարկի գումարը՝ եկամուտների «Ստացված փոխառություններ (վարկեր)» տեսակից (incometype 13). ներառում է և՛ բանկային վարկերը, և՛ փոխառությունները',
      'Հիփոթեքային վարկը չի հաշվվում (ԿԿՀ-ի ճշտում). հիփոթեքային է համարվում ստացված վարկի այն տողը, որի տեքստում (նկարագրություն, վճարող, կապի բնույթ) կա «Բանալի բառեր՝ հիփոթեքային վարկ» համակարգային փոփոխականի բառերից որևէ մեկը (բառի մաս)։ EPD-ում հիփոթեքի առանձին նշան ստացված վարկի տողում չկա. չմարված վարկերի տվյալները չեն օգտագործվում, քանի որ դրանք կարող են վերցված լինել նախորդ տարիներին',
      'Համեմատվում է տարվա մնացած վարկերի և փոխառությունների գումարը տարեսկզբի կանխիկի հետ (de_financialmeanscash, «առկա» ցանկ)',
    ],
    evaluate(scope) {
      const e = scope.exp;
      const fmt = (n) => Math.round(n).toLocaleString('hy-AM');
      const L = receivedLoans(scope);
      const values = [
        ...L.rows.map((x, i) => v.amd(`Ստացված վարկ/փոխառություն${L.rows.length > 1 ? ` ${i + 1}` : ''}${x.row.incomepayerfullname ? ` (${x.row.incomepayerfullname})` : ''}${x.mortgage ? ` — հիփոթեքային («${x.keyword}»), չի հաշվվում` : ''}`, x.amd)),
        ...(L.mortgage.length ? [v.amd('Ստացված վարկերի և փոխառությունների գումար (բոլորը)', L.allSum)] : []),
        v.amd(L.mortgage.length ? 'Ստացված վարկեր և փոխառություններ՝ բացի հիփոթեքայիններից' : 'Ստացված վարկերի և փոխառությունների գումար', L.otherSum),
        v.amd('Կանխիկ տարեսկզբին', e.cashStart),
      ];
      const excl = L.mortgage.length ? ` (հիփոթեքային վարկը՝ ${fmt(L.allSum - L.otherSum)} ֏, չի հաշվվում)` : '';
      if (!(L.otherSum > 0)) return notFired(values, L.mortgage.length ? `Տարվա ընթացքում ստացվել է միայն հիփոթեքային վարկ (${fmt(L.allSum)} ֏), որը չի հաշվվում` : 'Տարվա ընթացքում վարկ կամ փոխառություն չի ստացվել');
      if (L.otherSum <= e.cashStart) return fired(values, `Տարվա ընթացքում ստացվել է ${fmt(L.otherSum)} ֏ վարկ/փոխառություն${excl}, թեև տարեսկզբին առկա էր ${fmt(e.cashStart)} ֏ կանխիկ`);
      return notFired(values, `Ստացված վարկերը/փոխառությունները (${fmt(L.otherSum)} ֏${excl}) գերազանցում են տարեսկզբի կանխիկը (${fmt(e.cashStart)} ֏)`);
    },
  },
  cashRule({ id: 'DEC-R6', withSavings: false }),
  // պահուստային (անջատված). ներառում է նաև (գ) պայմանը՝ նախորդ տարիների խնայողությունը (վերանայվում է)
  cashRule({ id: 'DEC-R6-2', withSavings: true, defaultEnabled: false }),
];

/** Տույժերի տվյալներ (DEC-R3, DEC-R4). ընտանիքի ընդհանուր կազմում կիրառելի չէ */
function penaltyCheck(scope) {
  const pc = scope.penaltyCheck;
  if (!pc) throw new NotApplicable('Ընտանիքի ընդհանուր կազմ. տույժերը կիրառվում են անձի առանձին հայտարարագրի վրա');
  if (!pc.loaded) throw new NotEvaluated('Տույժերի տվյալները մուտքագրված չեն (COM-11). մուտքագրեք կամ ներմուծեք դրանք «Արտաքին ֆայլեր → Տույժեր» էջում');
  return pc;
}
const kindName = (type) => ({ 1: 'տարեկան', 2: 'պաշտոնը ստանձնելու', 3: 'պաշտոնը դադարեցնելու' }[type] || '');
const EVENT_TEXT = { late: 'ներկայացվել է տույժից հետո', unsubmitted: 'չի ներկայացվել', before: 'ներկայացվել է մինչև տույժը' };

/** Անձի տույժերը մինչև հաշվետու տարին ներառյալ՝ կանոնի արդյունքում */
function penaltyEventValues(pc) {
  if (!pc.events.length) return [v.text('Վարչական տույժեր', `Մինչև ${pc.year} թ. ներառյալ չկան`)];
  return pc.events.map((e, i) => { const r = e.record; return v.text(`Վարչական տույժ${pc.events.length > 1 ? ` ${i + 1}` : ''}`,
    [`${e.year} թ. ${kindName(e.type)}`, `ՎԻՎ Ա ${r.vivNumber || '—'} ${fmtDate(r.vivDate)}`, e.decl?.code, `${EVENT_TEXT[e.kind]}${e.publishedOn ? ` (${fmtDate(e.publishedOn)})` : ''}`, r.basis && `հիմք ${r.basis}`].filter(Boolean).join(' · ')); });
}
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

/** Ձեռքով ռիսկային նշում (չափորոշիչ 7, COM-20). առանձին տրամաբանություն՝ engine/evaluator.js */
export const MANUAL_RULE = {
  id: 'DEC-R7',
  direction: 'declarations',
  title: 'Լրացուցիչ ռիսկի գործոն (մասնագետի ձեռքով դրվող ռիսկային նշում)',
  criterion: 'Մասնագետն ինքն է գնահատում կոնկրետ դեպքը (օր.՝ գույքի գործարքի գինը էապես տարբերվում է կադաստրային շուկայական արժեքից)',
  srsRef: 'Բաժին 4, չափորոշիչ 7 (քաշ մինչև 25); COM-20',
  requirements: ['COM-20'],
  weight: 25,
  manual: true,
};
