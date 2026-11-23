import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAll } from '../src/engine/evaluator.js';
import { DEMO_VALUES } from '../src/engine/variables.js';
import { parse, evaluate } from '../src/engine/expression.js';
import { KEYS } from '../src/data/epd/repository.js';

const P = (k) => KEYS.person[k].instanceid;
const decl = (R, code) => R.declarations.find((u) => u.code === code);
const ind = (k) => `ind:${P(k)}`;

const base = { variables: {}, ruleConfig: {}, customRules: [], corrections: {}, manualFlags: [], outages: {} };
const demo = {
  ...base,
  variables: Object.fromEntries(Object.entries(DEMO_VALUES.variables).map(([k, v]) => [k, v.history])),
  ruleConfig: { 'INT-R2': { params: { years: { value: 3 } } }, 'INT-R3': { params: { years: { value: 3 } } }, 'INT-R4': { params: { years: { value: 3 } } } },
};
const st = (u, id) => u.results?.[id]?.status;
const scopeSt = (u, key, id) => u.scopes.find((s) => s.key === key)?.results[id]?.status;

test('expression parser', () => {
  const ast = parse('doc.a + 12 * ext.b < var.c and not rule.GIF-R1');
  const r = evaluate(ast, { resolve: (ns, n) => ({ 'doc.a': 1, 'ext.b': 2, 'var.c': 30, 'rule.GIF-R1': 0 })[`${ns}.${n}`], table: () => [] });
  assert.equal(r.value, true);
  assert.throws(() => parse('doc.a +'));
  const r2 = evaluate(parse('sum(de_x.amount_amd) > 100 ԵՎ count(de_x) == 2'), { resolve: () => 0, table: () => [{ amount_amount: 1, amount_ratetodefault: 100 }, { amount_amount: 2, amount_ratetodefault: 1 }] });
  assert.equal(r2.value, true);
});

test('default state: undefined variables → not evaluated', () => {
  const R = evaluateAll(base);
  const d = decl(R, 'D-105-2025');
  // կենսաապահովման նվազագույն բյուջեն նախասահմանված է → DEC-R1-ը գնահատվում է առանց ցուցադրական արժեքների
  assert.equal(scopeSt(d, ind('PR-105'), 'DEC-R1'), 'fired');
  const ani = R.gifts.find((g) => g.gift.giftsubclassification === 1 && g.gift.originalprofile === P('PR-110'));
  assert.equal(st(ani, 'GIF-R4'), 'not_evaluated');
  const iq = R.integrity.find((q) => q.code === 'IQ-201');
  assert.equal(st(iq, 'INT-R2'), 'not_evaluated');
});

test('declarations with demo values', () => {
  const R = evaluateAll(demo);
  const by = (code) => decl(R, code);
  assert.equal(scopeSt(by('D-105-2025'), ind('PR-105'), 'DEC-R1'), 'fired');
  assert.equal(scopeSt(by('D-101-2025'), ind('PR-101'), 'DEC-R1'), 'fired');
  assert.equal(scopeSt(by('D-101-2025'), ind('PR-102'), 'DEC-R1'), 'not_fired');
  // առանձին հաշվարկով աշխատում է, ընտանիքի կազմով՝ ոչ (ամուսնու եկամուտները ծածկում են)
  assert.equal(scopeSt(by('D-101-2025'), 'family', 'DEC-R1'), 'not_fired');
  assert.equal(scopeSt(by('D-105-2025'), 'family', 'DEC-R1'), 'fired');
  assert.equal(scopeSt(by('D-104-2025'), ind('PR-104'), 'DEC-R1'), 'not_fired');
  assert.equal(scopeSt(by('D-107-2025'), ind('PR-107'), 'DEC-R1'), 'not_fired');
  assert.equal(scopeSt(by('D-108-2025'), ind('PR-108'), 'DEC-R1'), 'fired');
  // EPD-ից վերցվում են բոլոր կարգավիճակները. չհրապարակվածը (սևագիր D-111-2025) գնահատվում է միայն տույժերի կանոններով
  assert.equal(by('D-111-2025').statusOnly, true);
  assert.deepEqual(Object.keys(by('D-111-2025').scopes[0].results).sort(), ['DEC-R3', 'DEC-R4']);
  assert.ok(R.declarations.filter((u) => !u.statusOnly).every((u) => u.decl.wfstateid === 7));
  const s = by('D-101-2025').scopes[0];
  assert.equal(s.exp.Dv, 8000000 + 2940000);
  assert.ok(R.declarations.every((u) => !u.risky));
  for (const u of R.declarations.filter((x) => !x.statusOnly)) console.log(u.code, u.scopes.map((sc) => `${sc.key}:${Math.round(sc.exp.monthly)}/${sc.score}`).join(' '));
});

test('correction DEC-10', () => {
  const R0 = evaluateAll(demo);
  const row = decl(R0, 'D-108-2025').scopes[0].exp.rows('de_financialmeanscash')[0];
  const R = evaluateAll({ ...demo, corrections: { [row.entityid]: { _declaration: KEYS.declaration['D-108-2025'].instanceid, _table: 'de_financialmeanscash', amountatendofyear_amount: 2500000 } } });
  const u = decl(R, 'D-108-2025');
  assert.equal(scopeSt(u, ind('PR-108'), 'DEC-R1'), 'not_fired');
  assert.equal(u.original.scopes[0].results['DEC-R1'].status, 'fired');
});

test('gifts', () => {
  const R = evaluateAll(demo);
  const g = (desc) => R.gifts.find((x) => x.gift.description === desc);
  assert.equal(st(g('Ձեռքի ժամացույց (շվեյցարական արտադրության)'), 'GIF-R1'), 'fired');
  assert.equal(st(g('Պլանշետ'), 'GIF-R1'), 'not_fired');
  assert.equal(st(g('Միջազգային համաժողովի ճանապարհածախս և կացություն'), 'GIF-R1'), 'fired');
  assert.equal(st(g('Նոութբուք'), 'GIF-R2'), 'fired');
  assert.equal(st(g('Հեռուստացույց'), 'GIF-R3'), 'fired');
  assert.equal(st(g('Հեռուստացույց'), 'GIF-R2'), 'not_fired');
  assert.equal(st(g('Կրթաթոշակ մագիստրոսական ծրագրի համար'), 'GIF-R4'), 'fired');
  assert.equal(st(g('Կրթաթոշակ վերապատրաստման դասընթացի համար'), 'GIF-R4'), 'not_fired');
  assert.equal(st(g('Ձեռքի ժամացույց (շվեյցարական արտադրության)'), 'GIF-R4'), 'not_applicable');
  assert.equal(st(g('Հուշանվեր՝ ձեռագործ գորգ (փոքր)'), 'GIF-R6'), 'fired');
  assert.equal(st(g('Նոութբուք'), 'GIF-R6'), 'not_fired');
  assert.equal(st(g('Բջջային հեռախոս'), 'GIF-R7'), 'fired');
  assert.equal(st(g('Հանգստյան գոտու ուղեգիր'), 'GIF-R7'), 'fired');
  assert.equal(st(g('Գիրք'), 'GIF-R7'), 'not_fired');
});

test('parties', () => {
  const R = evaluateAll(demo);
  const p = (name, year = 2025) => R.parties.persons.filter((x) => x.year === year && x.names.includes(name));
  assert.equal(st(p('Արսեն Մարտիրոսյան')[0], 'PAR-R1'), 'fired');
  assert.equal(st(p('Կարինե Դավթյան')[0], 'PAR-R1'), 'fired');
  assert.equal(st(p('Հրանտ Սիմոնյան')[0], 'PAR-R1'), 'not_fired');
  assert.equal(st(p('Գոռ Եղիազարյան')[0], 'PAR-R1'), 'fired');
  assert.equal(p('Վարդան Պետրոսյան').length, 2);
  assert.ok(p('Վարդան Պետրոսյան').every((x) => st(x, 'PAR-R1') === 'not_fired'));
  assert.equal(st(p('Կարեն Մարտիրոսյան')[0], 'PAR-R6'), 'fired');
  assert.equal(st(p('Սոնա Հակոբյան')[0], 'PAR-R6'), 'fired');
  assert.equal(st(p('Արտակ Բադալյան')[0], 'PAR-R6'), 'fired');
  assert.equal(st(p('Լիանա Գասպարյան')[0], 'PAR-R6'), 'not_evaluated');
  assert.equal(st(p('Արսեն Մարտիրոսյան')[0], 'PAR-R6'), 'not_fired');
  const R2 = evaluateAll({ ...demo, outages: { bpr: true } });
  const ars = R2.parties.persons.find((x) => x.names.includes('Արսեն Մարտիրոսյան') && x.year === 2025);
  assert.equal(st(ars, 'PAR-R6'), 'not_evaluated');
  console.log(R.parties.parties.map((x) => `${x.name} ${x.year} risky=${x.risky} ${x.riskyPersons.length}/${x.persons.length}`).join('\n'));
});

test('integrity', () => {
  const R = evaluateAll(demo);
  const q = (id) => R.integrity.find((x) => x.code === id);
  assert.equal(R.integrity.length, 5);
  assert.equal(st(q('IQ-201'), 'INT-R2'), 'fired');
  assert.equal(st(q('IQ-201'), 'INT-R3'), 'fired');
  assert.equal(st(q('IQ-201'), 'INT-R4'), 'fired');
  assert.equal(st(q('IQ-201'), 'INT-R8a'), 'fired');
  assert.equal(st(q('IQ-201'), 'INT-R8c'), 'fired');
  assert.equal(st(q('IQ-201'), 'INT-R8b'), 'not_fired');
  assert.equal(st(q('IQ-202'), 'INT-R2'), 'not_applicable');
  assert.equal(q('IQ-202').risky, false);
  assert.equal(st(q('IQ-203'), 'INT-R5a'), 'fired');
  assert.equal(st(q('IQ-203'), 'INT-R5b'), 'fired');
  assert.equal(st(q('IQ-203'), 'INT-R6'), 'fired');
  assert.equal(st(q('IQ-203'), 'INT-R9b'), 'fired');
  assert.equal(st(q('IQ-203'), 'INT-R9c'), 'fired');
  assert.equal(st(q('IQ-204'), 'INT-R7a'), 'fired');
  assert.equal(st(q('IQ-204'), 'INT-R7b'), 'fired');
  assert.equal(st(q('IQ-204'), 'INT-R10'), 'fired');
  assert.equal(st(q('IQ-204'), 'INT-R11'), 'fired');
  assert.equal(st(q('IQ-205'), 'INT-R2'), 'not_fired');
  assert.equal(st(q('IQ-205'), 'INT-R4'), 'not_fired');
  assert.equal(st(q('IQ-205'), 'INT-R8c'), 'not_fired');
  assert.equal(q('IQ-205').risky, false);
});

test('builder rules + chaining + cycles', () => {
  const s = { ...demo, customRules: [
    { id: 'C-1', kind: 'expression', direction: 'declarations', title: 'x', expression: 'ext.cadastre_owned_count > doc.realestate_count', weight: 10 },
    { id: 'C-2', kind: 'expression', direction: 'declarations', title: 'y', expression: 'rule.C-1 and rule.DEC-R1', weight: 5 },
    { id: 'C-3', kind: 'expression', direction: 'gifts', title: 'z', expression: 'rule.C-4' },
    { id: 'C-4', kind: 'expression', direction: 'gifts', title: 'z', expression: 'rule.C-3' },
  ] };
  const R = evaluateAll(s);
  const a = decl(R, 'D-101-2025');
  assert.equal(scopeSt(a, ind('PR-101'), 'C-1'), 'fired');
  assert.equal(scopeSt(a, ind('PR-101'), 'C-2'), 'fired');
  assert.equal(a.scopes[0].score, 45);
  const g = decl(R, 'D-104-2025');
  assert.equal(scopeSt(g, ind('PR-104'), 'C-1'), 'not_fired');
  assert.equal(R.gifts[0].results['C-3'].status, 'not_evaluated');
});

test('EPD structure: versions, rejected rows, preliminary report', () => {
  const R = evaluateAll(demo);
  assert.equal(R.declarations.filter((u) => u.code === 'D-104-2025').length, 1);
  assert.ok(!R.parties.reports.some((r) => r.code === 'RP-1-2025-PRE'));
  const ars = R.parties.persons.find((x) => x.names.includes('Արսեն Մարտիրոսյան') && x.year === 2025);
  assert.equal(ars.total, 11000000); // ոչ ընթացիկ տարբերակի 16 մլն-ը չի ներառվում
  const t = decl(R, 'D-105-2025').scopes[0].exp;
  assert.equal(t.loansReceived, 30000000);
  assert.equal(t.E, 36000000);
});

test('builtin rule overridden by builder expression gives same results as code logic', async () => {
  const { BUILTIN_RULES } = await import('../src/rules/catalog.js');
  const collect = (R, id) => {
    const s = [];
    const add = (res) => { if (res?.[id]) s.push(res[id].status); };
    R.declarations.forEach((u) => (u.scopes || []).forEach((sc) => add(sc.results)));
    R.gifts.forEach((u) => add(u.results));
    R.parties.persons.forEach((u) => add(u.results));
    return s;
  };
  const { demoPenalties } = await import('../src/data/penalties.js');
  const st = { ...demo, penalties: { records: demoPenalties() } };
  // տույժերի կանոններ. կոդով «կիրառելի չէ» (թաքցվում է) ≈ արտահայտությամբ «չի աշխատել» (պայմանը՝ doc.is_published == 1/0)
  const norm = (r, list) => (r.penaltyRule ? list.map((x) => (x === 'not_applicable' ? 'not_fired' : x)) : list);
  for (const r of BUILTIN_RULES.filter((x) => x.builderExpression)) {
    const code = collect(evaluateAll(st), r.id);
    // պայմանը գնահատվում է արտահայտությամբ («and 1 == 1»՝ որպեսզի չճանաչվի որպես անփոփոխ և չհաշվարկվի կոդով)
    const over = evaluateAll({ ...st, ruleConfig: { ...st.ruleConfig, [r.id]: { expression: `(${r.builderExpression}) and 1 == 1` } } });
    assert.equal(over.rules.find((x) => x.id === r.id).kind, 'expression', r.id);
    assert.deepEqual(norm(r, collect(over, r.id)), norm(r, code), r.id);
    // անփոփոխ պայմանով պահպանված կանոնը հաշվարկվում է կոդով. նույն արդյունք (ներառյալ «կիրառելի չէ») և բացատրություն
    const same = evaluateAll({ ...st, ruleConfig: { ...st.ruleConfig, [r.id]: { expression: r.builderExpression } } });
    const sr = same.rules.find((x) => x.id === r.id);
    assert.ok(sr.override && sr.kind === 'builtin', r.id);
    assert.deepEqual(collect(same, r.id), code, r.id);
    if (r.penaltyRule) assert.ok(code.includes('fired'), r.id);
    assert.ok(code.length > 0, r.id);
  }
});

test('builder: short table aliases resolve to EPD tables', () => {
  const mk = (expression) => evaluateAll({ ...demo, customRules: [{ id: 'C-T', kind: 'expression', direction: 'declarations', title: 't', expression, weight: 1 }] });
  const st = (R) => R.declarations.filter((u) => !u.statusOnly).flatMap((u) => (u.scopes || []).map((s) => s.results['C-T']?.status));
  const viaAlias = st(mk('count(realestate) > 0 and sum(cash.amountatendofyear_amd) > 1000000'));
  const viaTable = st(mk('count(de_realestatedetails) > 0 and sum(de_financialmeanscash.amountatendofyear_amd) > 1000000'));
  assert.deepEqual(viaAlias, viaTable);
  assert.ok(viaAlias.includes('fired'));
  assert.ok(st(mk('count(no_such_table) > 0')).every((s) => s === 'not_evaluated'));
});

test('DEC-R2: undeclared person2 from civil registry (ՔԿԱԳ)', () => {
  const R = evaluateAll(base);
  // Սուրեն Վարդանյան. կինը (Լիանա) ՔԿԱԳ-ում կա, հայտարարագրում նշված չէ
  assert.equal(scopeSt(decl(R, 'D-109-2025'), ind('PR-109'), 'DEC-R2'), 'fired');
  // Արմեն Հովհաննիսյան. կինը նշված է ընտանիքի անդամների մեջ
  assert.equal(scopeSt(decl(R, 'D-101-2025'), ind('PR-101'), 'DEC-R2'), 'not_fired');
  // ընտանիքի ընդհանուր կազմում կիրառելի չէ (նաև ռիսկային դեպքում)
  assert.equal(scopeSt(decl(R, 'D-101-2025'), 'family', 'DEC-R2'), 'not_applicable');
  assert.equal(scopeSt(decl(R, 'D-105-2025'), 'family', 'DEC-R2'), 'not_applicable');
  // ընտանիքի անդամի առանձին հայտարարագիր
  assert.equal(scopeSt(decl(R, 'D-101-2025'), ind('PR-102'), 'DEC-R2'), 'not_applicable');
  // միայն եղբայր/քույր (Նարինե) և միայն խնամիներ (Տիգրան)
  assert.equal(scopeSt(decl(R, 'D-107-2025'), ind('PR-107'), 'DEC-R2'), 'fired');
  assert.equal(scopeSt(decl(R, 'D-105-2025'), ind('PR-105'), 'DEC-R2'), 'fired');
  // ՔԿԱԳ-ում ակտեր չկան
  assert.equal(scopeSt(decl(R, 'D-104-2025'), ind('PR-104'), 'DEC-R2'), 'not_fired');
  // ՔԿԱԳ-ն անհասանելի է → չի գնահատվել (COM-17)
  const off = evaluateAll({ ...base, outages: { civil: true } });
  assert.equal(scopeSt(decl(off, 'D-109-2025'), ind('PR-109'), 'DEC-R2'), 'not_evaluated');
});

test('DEC-R2: ՔԿԱԳ spouse + children (roles, divorce, reporting date)', async () => {
  const { civilKinship } = await import('../src/rules/declarations.js');
  const { adapters } = await import('../src/adapters/index.js');
  const { setOutages } = await import('../src/adapters/transport.js');
  setOutages({});
  const ext = { get: (fn, ...a) => adapters[fn](...a), snap: () => {} };
  const fam = (ssn, year) => civilKinship({ declaranttype: 1, ssn, year, declarant: null }, ext);
  // կին հայտարարատու (person2-ն ինքն է). ամուսինը person-ն է, երեխան՝ ծննդյան ակտից
  const lilit = fam('1403790526', 2025);
  assert.equal(lilit.spouses[0].firstName, 'Արմեն');
  assert.equal(lilit.children.length, 1);
  assert.equal(lilit.civil.family, 2);
  // Գևորգ. ամուսնություն 2011, երեխա 2013, ամուսնալուծություն 2018
  const g2025 = fam('0412840198', 2025);
  assert.deepEqual([g2025.spouses.length, g2025.formerSpouses.length, g2025.children.length], [0, 1, 1]);
  const g2015 = fam('0412840198', 2015); // ամուսնալուծությունը դեռ չի եղել
  assert.deepEqual([g2015.spouses.length, g2015.children.length], [1, 1]);
  const g2012 = fam('0412840198', 2012); // երեխան դեռ չի ծնվել
  assert.deepEqual([g2012.spouses.length, g2012.children.length], [1, 0]);
  // եղբայրներ/քույրեր՝ ծնողների ակտերով, խնամիներ՝ ամուսնու ծննդյան ակտով
  const suren = fam('2209830385', 2025);
  assert.deepEqual(suren.siblings.map((x) => x.firstName), ['Արթուր']);
  assert.deepEqual(suren.inlaws.map((x) => x.firstName).sort(), ['Գուրգեն', 'Սիրանուշ']);
  assert.equal(fam('1501870928', 2025).civil.siblings, 1); // Նարինե. քույր Մարինա
  assert.equal(fam('1501870928', 1989).civil.siblings, 0); // քույրը ծնվել է 1990-ին
});

test('DEC-R2: deceased relatives are excluded as of the submission date', async () => {
  const { civilKinship } = await import('../src/rules/declarations.js');
  const { adapters } = await import('../src/adapters/index.js');
  const { setOutages } = await import('../src/adapters/transport.js');
  setOutages({});
  const ext = { get: (fn, ...a) => adapters[fn](...a), snap: () => {} };
  const armen = (year, publishedon) => civilKinship({ declaranttype: 1, ssn: '2507750412', year, publishedon, declarant: null }, ext);
  // հայրը մահացել է 11.03.2019 (ՔԿԱԳ-ի մահվան ակտ)
  const after = armen(2025, '2026-03-16T09:30:00');
  assert.deepEqual([after.parents.length, after.deceased.parents.length], [1, 1]);
  assert.equal(after.deceased.parents[0].death.date, '2019-03-11');
  // 2018-ի հայտարարագիրը ներկայացվել (հրապարակվել) է մահից առաջ → հայրը հաշվվում է
  const before = armen(2018, '2019-02-01T09:30:00');
  assert.deepEqual([before.parents.length, before.deceased.parents.length], [2, 0]);
  // մահը ստուգվում է միայն ՔԿԱԳ-ով. ՔԿԱԳ-ում մահվան ակտ չունեցողը համարվում է կենդանի
  const tigran = civilKinship({ declaranttype: 1, ssn: '0306800215', year: 2025, publishedon: '2026-03-30T20:00:00', declarant: null }, ext);
  assert.deepEqual([tigran.deceased.inlaws.length, tigran.civil.inlaws], [0, 2]);
  // ՀԾՀ չունեցող անձ (Տիգրանի մայրը)՝ չի ստուգվում, հաշվվում է
  assert.ok(tigran.unchecked.some((x) => x.firstName === 'Ռուզաննա'));

  const R = evaluateAll(base);
  assert.equal(scopeSt(decl(R, 'D-101-2025'), ind('PR-101'), 'DEC-R2'), 'not_fired');
  // ԲՊՌ-ն DEC-R2-ում չի օգտագործվում
  const off = evaluateAll({ ...base, outages: { bpr: true } });
  assert.equal(scopeSt(decl(off, 'D-101-2025'), ind('PR-101'), 'DEC-R2'), 'not_fired');
  // մահացածը աղյուսակում չի ցուցադրվում
  const row = decl(R, 'D-101-2025').scopes[0].results['DEC-R2'].comparison.rows[1];
  assert.ok(row.left.every((x) => !x.name.includes('Գագիկ')));
  setOutages({});
});

test('DEC-R3/DEC-R4: penalties file (all declaration statuses, missing declarations)', async () => {
  const { demoPenalties, parsePenaltyRows } = await import('../src/data/penalties.js');
  const R0 = evaluateAll(base);
  // առանց տույժերի ֆայլի՝ չի գնահատվել
  assert.equal(scopeSt(decl(R0, 'D-111-2024'), ind('PR-111'), 'DEC-R3'), 'not_evaluated');
  assert.equal(decl(R0, 'D-111-2025').scopes[0].results['DEC-R4'].status, 'not_evaluated');

  const R = evaluateAll({ ...base, penalties: { records: demoPenalties() } });
  // ներկայացվել (հրապարակվել) է տույժից հետո
  assert.equal(scopeSt(decl(R, 'D-111-2024'), ind('PR-111'), 'DEC-R3'), 'fired');
  // հրապարակվել է մինչև տույժը
  assert.equal(scopeSt(decl(R, 'D-108-2025'), ind('PR-108'), 'DEC-R3'), 'not_fired');
  // տույժ չկա
  assert.equal(scopeSt(decl(R, 'D-101-2025'), ind('PR-101'), 'DEC-R3'), 'not_fired');
  // սևագիր՝ տույժից հետո
  assert.equal(decl(R, 'D-111-2025').scopes[0].results['DEC-R4'].status, 'fired');
  // EPD-ում հայտարարագիր չկա, տույժերի ֆայլում կա
  const missing = R.declarations.filter((u) => u.missing);
  assert.deepEqual(missing.map((u) => u.profile.ssn).sort(), ['0101900111', '2603690617']);
  assert.ok(missing.every((u) => u.scopes[0].results['DEC-R4'].status === 'fired'));
  // կապակցման համար անբավարար գրառումներ (ՀԾՀ կամ տարի չկա)՝ միավոր չեն ստեղծում
  assert.equal(R.declarations.filter((u) => u.missing && u.profile.ssn === '1501870928').length, 0);

  // ֆայլի վերնագրերով ճանաչում (սյունակների հերթականությունը կարևոր չէ)
  const { records, missingColumns } = parsePenaltyRows([
    ['ՀԾՀ', 'Տարի', 'ՎԻՎ Ա\nամսաթիվ', 'Հայտարարագրի\nկամ\nհաշվետվություն\nտեսակ', 'Անուն', 'Ազգանուն'],
    ['3001720556', '2024', '45762', 'Տարեկան', 'Վահե', 'Ղազարյան'],
    ['', '', '45762', '', 'Անհայտ', ''],
  ]);
  assert.equal(records.length, 2);
  assert.deepEqual([records[0].vivDate, records[0].year, records[0].declarationType, records[0].issues.length], ['2025-04-15', 2024, 1, 0]);
  assert.ok(records[1].issues.includes('ՀԾՀ չկա'));
  assert.ok(missingColumns.includes('basis'));
});

test('only yearly declarations are analysed (assumption/termination: under discussion)', async () => {
  const { demoPenalties } = await import('../src/data/penalties.js');
  const termination = { ...demoPenalties()[2], row: 99, declarationKind: 'Դադարեցնելու', declarationType: 3, ssn: '1111111111' };
  const R = evaluateAll({ ...base, penalties: { records: [...demoPenalties(), termination] } });
  assert.ok(R.declarations.every((u) => (u.decl ? u.decl.declarationtype : u.declarationType) === 1));
  assert.equal(R.declarations.filter((u) => u.profile.ssn === '1111111111').length, 0);
});

test('penalties template (.xlsx) round-trip: written template is recognised on import', async () => {
  const { buildXlsx } = await import('../src/data/xlsxWriter.js');
  const { readXlsx } = await import('../src/data/xlsx.js');
  const { penaltyTemplateSheets, parsePenaltyRows } = await import('../src/data/penalties.js');
  const sheets = penaltyTemplateSheets();
  const empty = parsePenaltyRows(await readXlsx(buildXlsx(sheets)));
  assert.deepEqual([empty.records.length, empty.missingColumns], [0, []]);
  // լրացված տող (ՀԾՀ՝ առաջին 0-ով, ամսաթիվ՝ տեքստ)
  sheets[0].rows = [['1', '05/26', '12.05.2026', 'Տիգրան', 'Մկրտչյան', '', '0306800215', 'Պ/Ա', 'Կոմիտեի նախագահ', '2025', 'Տարեկան', '169.28/5', '', '', '', '']];
  const { records } = parsePenaltyRows(await readXlsx(buildXlsx(sheets)));
  assert.deepEqual([records[0].ssn, records[0].vivDate, records[0].year, records[0].declarationType, records[0].issues], ['0306800215', '2026-05-12', 2025, 1, []]);
});

test('stored evaluations: results change only after re-evaluation; local actions re-evaluate the unit', async () => {
  const { autoEvaluations, snapshotOf, withStored } = await import('../src/engine/evaluations.js');
  const ctx = { at: '2026-11-23T10:00:00Z', by: 'test' };
  const R1 = evaluateAll(base);
  const stored = autoEvaluations(R1.declarations, {}, ctx);
  assert.equal(Object.keys(stored).length, R1.declarations.length); // նոր հայտարարագրերը՝ ավտոմատ
  const suren = (R) => R.declarations.find((u) => u.code === 'D-109-2025');
  // կանոնն անջատվել է. պահված արդյունքը չի փոխվում, նշվում է «պահանջվում է վերագնահատում»
  const R2 = evaluateAll({ ...base, ruleConfig: { 'DEC-R2': { enabled: false } } });
  assert.deepEqual(autoEvaluations(R2.declarations, stored, ctx), {});
  const shown = withStored(suren(R2), stored[suren(R2).id]);
  assert.equal(shown.scopes[0].results['DEC-R2'].status, 'fired');
  assert.equal(shown.stale, true);
  // վերագնահատում
  const after = withStored(suren(R2), snapshotOf(suren(R2), ctx));
  assert.equal(after.scopes[0].results['DEC-R2'], undefined);
  assert.equal(after.stale, false);
  // ձեռքով նշում. վերագնահատվում է միայն այդ հայտարարագիրը
  const R3 = evaluateAll({ ...base, manualFlags: [{ id: 'M1', direction: 'declarations', unitId: suren(R1).id, weight: 10 }] });
  assert.deepEqual(Object.keys(autoEvaluations(R3.declarations, stored, ctx)), [String(suren(R1).id)]);
  // ճշգրտում (DEC-10). ավտոմատ չի վերագնահատվում, հայտարարագիրը նշվում է «պահանջվում է վերագնահատում»
  const R4 = evaluateAll(base);
  const davit = R4.declarations.find((u) => u.code === 'D-108-2025');
  const st4 = autoEvaluations(R4.declarations, {}, ctx);
  const row = davit.scopes[0].exp.rows('de_financialmeanscash')[0];
  const R5 = evaluateAll({ ...base, corrections: { [row.entityid]: { _declaration: davit.id, _table: 'de_financialmeanscash', amountatendofyear_amount: 2500000 } } });
  const davit5 = R5.declarations.find((u) => u.code === 'D-108-2025');
  assert.deepEqual(autoEvaluations(R5.declarations, st4, ctx), {});
  assert.equal(withStored(davit5, st4[davit.id]).stale, true);
});

test('family composition: a family member who is also an official is included via their own declaration', () => {
  const R = evaluateAll(base);
  const arsen = R.declarations.find((u) => u.code === 'D-120-2025');
  const sona = R.declarations.find((u) => u.code === 'D-121-2025');
  // երկուսն էլ ցանկում առանձին միավոր են, յուրաքանչյուրի ընտանիքի կազմում՝ մյուսի հայտարարագիրը
  assert.deepEqual(arsen.officials.map((o) => o.decl.code), ['D-121-2025']);
  assert.deepEqual(sona.officials.map((o) => o.decl.code), ['D-120-2025']);
  assert.equal(arsen.linked.length, 0);
  const fam = arsen.scopes.find((s) => s.kind === 'family');
  // 1.5 մլն (Արսեն) + 4.7 մլն (Սոնա). Արսենի հայտարարագրում Սոնայի կրկնվող տողը չի հաշվվում
  assert.equal(Math.round(arsen.scopes[0].exp.annual), 1500000);
  assert.equal(Math.round(fam.exp.annual), 6200000);
  assert.equal(fam.results['DEC-R1'].status, 'not_fired');
  // ընտանիքի անդամի առանձին բաժին չի ավելանում (նա գնահատվում է իր տողում)
  assert.equal(arsen.scopes.filter((s) => s.kind === 'individual').length, 1);
});

test('manual flag (DEC-R7) applies only to the chosen scope: declarant individual or family composition', () => {
  const R0 = evaluateAll(base);
  const t0 = R0.declarations.find((u) => u.code === 'D-105-2025');
  const id = t0.id;
  const scoresOf = (scope) => {
    const R = evaluateAll({ ...base, manualFlags: [{ id: 'M1', direction: 'declarations', unitId: id, weight: 20, ...(scope ? { scope } : {}) }] });
    const t = R.declarations.find((u) => u.code === 'D-105-2025');
    return t.scopes.map((s, i) => s.score - t0.scopes[i].score);
  };
  // scopes: հայտարարատու, կին (առանձին հայտարարագիր), ընտանիքի կազմ
  assert.deepEqual(scoresOf('individual'), [20, 0, 0]);
  assert.deepEqual(scoresOf('family'), [0, 0, 20]);
  assert.deepEqual(scoresOf(undefined), [20, 0, 0]); // նախկին նշում՝ առանց տարբերակի
});

test('builder: complex document variables equal their formulas over simple variables', async () => {
  const { METRICS } = await import('../src/engine/metrics.js');
  const R = evaluateAll(base);
  const M = Object.fromEntries(METRICS.declarations.doc.map((m) => [m.key, m]));
  const near = (a, b) => Math.abs(a - b) < 0.01;
  let n = 0;
  for (const u of R.declarations.filter((x) => !x.statusOnly)) for (const sc of u.scopes) {
    const g = (k) => M[k].get(sc);
    assert.ok(near(g('money_start'), g('cash_start') + g('bank_start') + g('eacc_start')), u.code);
    assert.ok(near(g('money_end'), g('cash_end') + g('bank_end') + g('eacc_end')), u.code);
    assert.ok(near(g('loans_deposits_start'), g('loans_given_start') + g('deposits_start')), u.code);
    assert.ok(near(g('loans_deposits_end'), g('loans_given_end') + g('deposits_end')), u.code);
    assert.ok(near(g('noncash_end'), g('bank_end') + g('eacc_end') + g('deposits_end')), u.code);
    assert.ok(near(g('acquisitions'), g('realestate_acquired') + g('vehicles_acquired')), u.code);
    assert.ok(near(g('alienations'), g('realestate_alienated') + g('vehicles_alienated')), u.code);
    assert.ok(near(g('expense_annual'), g('money_start') + g('income') - g('acquisitions') - g('money_end') + g('loans_deposits_end') - g('loans_deposits_start')), u.code);
    n++;
  }
  assert.ok(n > 10);
  assert.ok(METRICS.declarations.doc.filter((m) => m.kind === 'simple').length >= 14);
});

test('condition tree: every builder expression round-trips through the row builder', async () => {
  const T = await import('../src/engine/conditionTree.js');
  const { BUILTIN_RULES } = await import('../src/rules/catalog.js');
  const { BUILDER_EXAMPLES } = await import('../src/engine/metrics.js');
  const exprs = [...BUILTIN_RULES.map((r) => r.builderExpression).filter(Boolean), ...Object.values(BUILDER_EXAMPLES).map((e) => e.expression),
    'not (doc.a > 1) or (doc.x - (doc.y - doc.z) >= -3 and rule.GIF-R2)', 'doc.a > 1 and (doc.b < 2 or not doc.c == 3)'];
  for (const e of exprs) {
    const { expression, incomplete } = T.treeToExpression(T.toTree(parse(e)));
    assert.equal(incomplete, false, e);
    assert.equal(T.print(parse(expression)), T.print(parse(e)), e);
  }
  // չլրացված տողերը չեն ներառվում
  const t = T.emptyTree();
  t.children.push({ type: 'cond', left: { kind: 'ref', tok: 'doc.year' }, cmp: '>=', right: { kind: 'num', value: 2024 }, not: false });
  assert.deepEqual(T.treeToExpression(t), { expression: 'doc.year >= 2024', incomplete: true });
  // ծառով չներկայացվող պայմանը չի բացվում կառուցիչում (մնում է տեքստային ռեժիմում, չի կորչում)
  assert.equal(T.treeFromExpression('(doc.a > 1) == 1'), null);
  assert.ok(T.treeFromExpression('rule.GIF-R2 == 0'));
});

test('derived (user-defined complex) variables are evaluated by their formula; cycles are not evaluated', () => {
  const st = { ...base,
    derivedVars: [
      { key: 'noncash_x3', direction: 'declarations', label: 'Եռապատիկ անկանխիկ', expression: 'var.cash_ratio * doc.noncash_end' },
      { key: 'loop_a', direction: 'declarations', label: 'a', expression: 'doc.loop_b + 1' },
      { key: 'loop_b', direction: 'declarations', label: 'b', expression: 'doc.loop_a + 1' },
    ],
    customRules: [
      { id: 'DEC-C01', kind: 'expression', direction: 'declarations', title: 't', expression: 'doc.cash_end > var.cash_threshold and doc.cash_end >= doc.noncash_x3', weight: 1 },
      { id: 'DEC-C02', kind: 'expression', direction: 'declarations', title: 't', expression: 'doc.loop_a > 0', weight: 1 },
    ] };
  const R = evaluateAll(st);
  const davit = R.declarations.find((u) => u.code === 'D-108-2025').scopes[0].results;
  assert.equal(davit['DEC-C01'].status, 'fired');
  assert.ok(davit['DEC-C01'].values.some((v) => v.label.startsWith('doc.noncash_x3 — Եռապատիկ անկանխիկ')));
  assert.ok(davit['DEC-C01'].values.some((v) => v.label.startsWith('doc.noncash_end')));
  assert.equal(davit['DEC-C02'].status, 'not_evaluated');
  const ani = R.declarations.find((u) => u.code === 'D-110-2025').scopes[0].results;
  assert.equal(ani['DEC-C01'].status, 'fired'); // 7 մլն կանխիկ ≥ 3 × 1.1 մլն
});

test('user-defined system variables: used in builder conditions, labelled, usage tracked', async () => {
  const { variableUsage, allVariableDefs } = await import('../src/engine/variables.js');
  const st = { ...base,
    customVariableDefs: [{ key: 'cash_growth_limit', direction: 'declarations', label: 'Կանխիկի աճի սահման', type: 'number', unit: 'AMD', note: '' }],
    variables: { ...base.variables, cash_growth_limit: [{ value: 10000000, effectiveFrom: '2025-01-01' }] },
    customRules: [{ id: 'DEC-C01', kind: 'expression', direction: 'declarations', title: 't', expression: 'doc.cash_end - doc.cash_start > var.cash_growth_limit', weight: 1 }] };
  const R = evaluateAll(st);
  const r25 = R.declarations.find((u) => u.code === 'D-108-2025').scopes[0].results['DEC-C01'];
  assert.equal(r25.status, 'fired'); // 25 մլն − 2 մլն > 10 մլն
  assert.ok(r25.values.some((v) => v.label === 'var.cash_growth_limit — Կանխիկի աճի սահման'));
  // 2024-ին արժեքը դեռ չէր գործում
  assert.equal(R.declarations.find((u) => u.code === 'D-108-2024').scopes[0].results['DEC-C01'].status, 'not_evaluated');
  assert.deepEqual(variableUsage(st, 'cash_growth_limit'), ['DEC-C01']);
  assert.deepEqual(variableUsage(st, 'cash_growth'), []);
  assert.ok(allVariableDefs(st).some((d) => d.key === 'cash_growth_limit' && d.custom));
});

test('multi-direction system variables: one value shared by rules of several directions', async () => {
  const { variableImpact } = await import('../src/engine/variableUsage.js');
  const { varDirections, variableDefByKey } = await import('../src/engine/variables.js');
  // «Կանխիկի շեմ»՝ հայտարարագրեր + բարեվարքություն (DEC-R6, INT-R11)
  assert.deepEqual(varDirections(variableDefByKey.cash_threshold), ['declarations', 'integrity']);
  const imp = variableImpact(base, 'cash_threshold');
  assert.deepEqual(imp.map((x) => `${x.id}:${x.direction}`).sort(), ['DEC-R6:declarations', 'INT-R11:integrity']);
  // մասնագետի ստեղծած մի քանի ուղղության փոփոխական՝ կառուցիչի կանոններում
  const st = { ...base,
    customVariableDefs: [{ key: 'big_cash', direction: 'declarations', directions: ['declarations', 'integrity'], label: 'Խոշոր կանխիկ', type: 'number', unit: 'AMD', note: '' }],
    variables: { ...base.variables, big_cash: [{ value: 1000000, effectiveFrom: '2020-01-01' }] },
    customRules: [
      { id: 'DEC-C01', kind: 'expression', direction: 'declarations', title: 't', expression: 'doc.cash_end > var.big_cash', weight: 1 },
      { id: 'INT-C01', kind: 'expression', direction: 'integrity', title: 't', expression: 'doc.cash_total > var.big_cash' },
    ] };
  assert.deepEqual(variableImpact(st, 'big_cash').map((x) => `${x.id}:${x.direction}`), ['DEC-C01:declarations', 'INT-C01:integrity']);
  const R = evaluateAll(st);
  assert.ok(R.declarations.some((u) => u.scopes?.some((s) => s.results['DEC-C01']?.status === 'fired')));
  assert.ok(R.integrity.some((u) => ['fired', 'not_fired'].includes(u.results['INT-C01']?.status)));
});

test('predefined system variables: characteristics can be overridden (key and type are kept), unused ones hidden', async () => {
  const { allVariableDefs, variableDefOf, variableAppliesTo } = await import('../src/engine/variables.js');
  const { variableImpact } = await import('../src/engine/variableUsage.js');
  const st = { ...base, variableDefOverrides: {
    cash_ratio: { label: 'Կանխիկ / անկանխիկ գործակից', unit: 'x', note: '', directions: ['declarations', 'gifts'], direction: 'declarations' },
    party_rent_deviation: { hidden: true },
  } };
  const d = variableDefOf(st, 'cash_ratio');
  assert.equal(d.label, 'Կանխիկ / անկանխիկ գործակից');
  assert.equal(d.type, 'number');
  assert.ok(variableAppliesTo(d, 'gifts'));
  assert.ok(!allVariableDefs(st).some((x) => x.key === 'party_rent_deviation'));
  // անվանումը՝ կանոնի արդյունքում, արժեքը՝ անփոփոխ (DEC-R6-ը շարունակում է աշխատել)
  const R = evaluateAll(st);
  assert.equal(R.declarations.find((u) => u.code === 'D-108-2025').scopes[0].results['DEC-R6'].status, 'fired');
  // հաշվարկում անմիջապես օգտագործվող փոփոխականներ
  assert.deepEqual(variableImpact(base, 'manual_max_weight').map((x) => x.id), ['DEC-R7']);
  assert.equal(variableImpact(base, 'dec_threshold').length, 1);
});

test('4.1 formulas are editable: an override applies everywhere (DEC-R1, previous savings, builder variables)', async () => {
  const { computeExpense, DEFAULT_FORMULAS } = await import('../src/engine/annualExpense.js');
  const { METRICS } = await import('../src/engine/metrics.js');
  const R0 = evaluateAll(base);
  const tig0 = R0.declarations.find((u) => u.code === 'D-105-2025');
  assert.equal(Math.round(tig0.scopes[0].exp.annual), -4800000); // նախասահմանված բանաձև
  // Փ-ի նշանը հակառակ (բաց հարց 4.1-ում). փոփոխված բանաձևը կիրառվում է ամենուր
  const expr = 'doc.money_start + doc.income - doc.acquisitions - doc.money_end - doc.loans_deposits_end + doc.loans_deposits_start';
  const st = { ...base, formulaOverrides: { expense_annual: { expression: expr } },
    customRules: [{ id: 'DEC-C01', kind: 'expression', direction: 'declarations', title: 't', expression: 'doc.expense_annual < 0', weight: 1 }] };
  const R = evaluateAll(st);
  for (const u of R.declarations.filter((x) => !x.statusOnly)) for (const sc of u.scopes) {
    const e = sc.exp;
    assert.ok(Math.abs(e.annual - (e.Ds + e.E - e.G - e.Dv - e.Pv + e.Ps)) < 0.01, u.code);
    assert.equal(METRICS.declarations.doc.find((m) => m.key === 'expense_annual').get(sc), e.annual);
    assert.equal(sc.results['DEC-C01'].status, e.annual < 0 ? 'fired' : 'not_fired');
    assert.equal(sc.results['DEC-R1'].values.find((v) => v.label.startsWith('ԸՏԾ')).value, e.annual);
  }
  // ՄԱԾ-ն հետևում է ԸՏԾ-ին. նախորդ տարիների խնայողությունը նույնպես հաշվարկվում է նոր բանաձևով
  const narine = R.declarations.find((u) => u.code === 'D-107-2025').scopes[0];
  assert.ok(Math.abs(narine.exp.monthly - narine.exp.annual / 12) < 0.01);
  const p0 = R0.declarations.find((u) => u.code === 'D-107-2025').scopes[0].prevSavings.total;
  assert.notEqual(narine.prevSavings.total, p0);
  // սխալ / ցիկլային բանաձև՝ NaN, առանց հաշվարկի խափանման
  assert.ok(Number.isNaN(computeExpense([], () => true, {}, { ...DEFAULT_FORMULAS, money_start: 'doc.money_end', money_end: 'doc.money_start' }).Ds));
});

test('open questions are read from docs/SRS.md', async () => {
  const fs = await import('node:fs');
  const { parseOpenQuestions } = await import('../src/data/srsQuestions.js');
  const qs = parseOpenQuestions(fs.readFileSync(new URL('../docs/SRS.md', import.meta.url), 'utf8'));
  assert.ok(qs.length > 30);
  assert.ok(qs.every((q) => /^Q-\d+$/.test(q.id) && q.text && q.status));
  assert.equal(qs.find((q) => q.id === 'Q-25').accepted, true);
  assert.equal(qs.find((q) => q.id === 'Q-17').accepted, false); // «Մասամբ ընդունված»՝ բաց
  assert.equal(qs.find((q) => q.id === 'Q-48').status, 'Բաց');
});
