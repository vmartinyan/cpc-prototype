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
  // լռելյայն անջատված կանոնները (DEC-R6-2՝ պահուստային) միացվում են համեմատության համար
  const st = { ...demo, penalties: { records: demoPenalties() }, ruleConfig: { ...(demo.ruleConfig || {}), 'DEC-R6-2': { enabled: true } } };
  // տույժերի կանոններ. կոդով «կիրառելի չէ» (թաքցվում է) ≈ արտահայտությամբ «չի աշխատել» (պայմանը՝ doc.is_published == 1/0)
  const norm = (r, list) => (r.penaltyRule ? list.map((x) => (x === 'not_applicable' ? 'not_fired' : x)) : list);
  for (const r of BUILTIN_RULES.filter((x) => x.builderExpression)) {
    const code = collect(evaluateAll(st), r.id);
    // պայմանը գնահատվում է արտահայտությամբ («and 1 == 1»՝ որպեսզի չճանաչվի որպես անփոփոխ և չհաշվարկվի կոդով)
    const over = evaluateAll({ ...st, ruleConfig: { ...st.ruleConfig, [r.id]: { ...st.ruleConfig[r.id], expression: `(${r.builderExpression}) and 1 == 1` } } });
    assert.equal(over.rules.find((x) => x.id === r.id).kind, 'expression', r.id);
    assert.deepEqual(norm(r, collect(over, r.id)), norm(r, code), r.id);
    // անփոփոխ պայմանով պահպանված կանոնը հաշվարկվում է կոդով. նույն արդյունք (ներառյալ «կիրառելի չէ») և բացատրություն
    const same = evaluateAll({ ...st, ruleConfig: { ...st.ruleConfig, [r.id]: { ...st.ruleConfig[r.id], expression: r.builderExpression } } });
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
  const lilit = fam('0000100963', 2025);
  assert.equal(lilit.spouses[0].firstName, 'Արմեն');
  assert.equal(lilit.children.length, 1);
  assert.equal(lilit.civil.family, 2);
  // Գևորգ. ամուսնություն 2011, երեխա 2013, ամուսնալուծություն 2018
  const g2025 = fam('0000100186', 2025);
  assert.deepEqual([g2025.spouses.length, g2025.formerSpouses.length, g2025.children.length], [0, 1, 1]);
  const g2015 = fam('0000100186', 2015); // ամուսնալուծությունը դեռ չի եղել
  assert.deepEqual([g2015.spouses.length, g2015.children.length], [1, 1]);
  const g2012 = fam('0000100186', 2012); // երեխան դեռ չի ծնվել
  assert.deepEqual([g2012.spouses.length, g2012.children.length], [1, 0]);
  // եղբայրներ/քույրեր՝ ծնողների ակտերով, խնամիներ՝ ամուսնու ծննդյան ակտով
  const suren = fam('0000101777', 2025);
  assert.deepEqual(suren.siblings.map((x) => x.firstName), ['Արթուր']);
  assert.deepEqual(suren.inlaws.map((x) => x.firstName).sort(), ['Գուրգեն', 'Սիրանուշ']);
  assert.equal(fam('0000101148', 2025).civil.siblings, 1); // Նարինե. քույր Մարինա
  assert.equal(fam('0000101148', 1989).civil.siblings, 0); // քույրը ծնվել է 1990-ին
});

test('DEC-R2: deceased relatives are excluded as of the submission date', async () => {
  const { civilKinship } = await import('../src/rules/declarations.js');
  const { adapters } = await import('../src/adapters/index.js');
  const { setOutages } = await import('../src/adapters/transport.js');
  setOutages({});
  const ext = { get: (fn, ...a) => adapters[fn](...a), snap: () => {} };
  const armen = (year, publishedon) => civilKinship({ declaranttype: 1, ssn: '0000101925', year, publishedon, declarant: null }, ext);
  // հայրը մահացել է 11.03.2019 (ՔԿԱԳ-ի մահվան ակտ)
  const after = armen(2025, '2026-03-16T09:30:00');
  assert.deepEqual([after.parents.length, after.deceased.parents.length], [1, 1]);
  assert.equal(after.deceased.parents[0].death.date, '2019-03-11');
  // 2018-ի հայտարարագիրը ներկայացվել (հրապարակվել) է մահից առաջ → հայրը հաշվվում է
  const before = armen(2018, '2019-02-01T09:30:00');
  assert.deepEqual([before.parents.length, before.deceased.parents.length], [2, 0]);
  // մահը ստուգվում է միայն ՔԿԱԳ-ով. ՔԿԱԳ-ում մահվան ակտ չունեցողը համարվում է կենդանի
  const tigran = civilKinship({ declaranttype: 1, ssn: '0000100112', year: 2025, publishedon: '2026-03-30T20:00:00', declarant: null }, ext);
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
  assert.deepEqual(missing.map((u) => u.profile.ssn).sort(), ['0000100001', '0000101962']);
  assert.ok(missing.every((u) => u.scopes[0].results['DEC-R4'].status === 'fired'));
  // կապակցման համար անբավարար գրառումներ (ՀԾՀ կամ տարի չկա)՝ միավոր չեն ստեղծում
  assert.equal(R.declarations.filter((u) => u.missing && u.profile.ssn === '0000101148').length, 0);

  // ֆայլի վերնագրերով ճանաչում (սյունակների հերթականությունը կարևոր չէ)
  const { records, missingColumns } = parsePenaltyRows([
    ['ՀԾՀ', 'Տարի', 'ՎԻՎ Ա\nամսաթիվ', 'Հայտարարագրի\nկամ\nհաշվետվություն\nտեսակ', 'Անուն', 'Ազգանուն'],
    ['0000102184', '2024', '45762', 'Տարեկան', 'Վահե', 'Ղազարյան'],
    ['', '', '45762', '', 'Անհայտ', ''],
  ]);
  assert.equal(records.length, 2);
  assert.deepEqual([records[0].vivDate, records[0].year, records[0].declarationType, records[0].issues.length], ['2025-04-15', 2024, 1, 0]);
  assert.ok(records[1].issues.includes('ՀԾՀ չկա'));
  assert.ok(missingColumns.includes('basis'));
});

test('DEC-R3/DEC-R4: person history — any declaration type, this and later yearly declarations, applied once', async () => {
  const { demoPenalties } = await import('../src/data/penalties.js');
  const R = evaluateAll({ ...base, penalties: { records: demoPenalties() } });
  const res = (code, person, id) => decl(R, code).scopes.find((s) => s.key === ind(person)).results[id];
  // ստանձնելու հայտարարագիրը (2021) հրապարակվել է տույժից հետո → DEC-R3 հաջորդ տարիների տարեկան հայտարարագրերում
  assert.equal(res('D-107-2024', 'PR-107', 'DEC-R3').status, 'fired');
  assert.equal(res('D-107-2025', 'PR-107', 'DEC-R3').status, 'fired');
  // ստանձնելու հայտարարագիրը (2022) EPD-ում չկա → DEC-R4
  assert.equal(res('D-105-2025', 'PR-105', 'DEC-R4').status, 'fired');
  // ընտանիքի անդամի տույժը՝ նրա առանձին հաշվարկում, ոչ պաշտոնատար անձի և ոչ ընտանիքի կազմի
  assert.equal(res('D-105-2024', 'PR-106', 'DEC-R3').status, 'fired');
  assert.equal(res('D-105-2024', 'PR-105', 'DEC-R3').status, 'not_fired');
  assert.equal(decl(R, 'D-105-2024').scopes.find((s) => s.kind === 'family').results['DEC-R3'].status, 'not_applicable');
  // 2024-ի ուշացումը կիրառվում է նաև 2025-ի (սևագիր) վրա, իսկ 2025-ի չներկայացումը՝ ոչ 2024-ի վրա
  assert.equal(decl(R, 'D-111-2025').scopes[0].results['DEC-R3'].status, 'fired');
  assert.equal(decl(R, 'D-111-2025').scopes[0].results['DEC-R4'].status, 'fired');
  assert.equal(res('D-111-2024', 'PR-111', 'DEC-R4').status, 'not_fired');
  // մեկ անգամ՝ մի քանի ուշացման դեպքում էլ քաշը մեկն է
  const extra = { ...demoPenalties()[0], id: 'PN-X', vivNumber: '99/26', vivDate: '2021-08-25', declarationKind: 'Ստանձնելու', declarationType: 2, ssn: '0000101148', year: 2021 };
  const R2 = evaluateAll({ ...base, penalties: { records: [...demoPenalties(), extra] } });
  const r3 = decl(R2, 'D-107-2025').scopes[0].results['DEC-R3'];
  assert.equal(r3.status, 'fired');
  assert.equal(r3.weight, 3);
  // ՀԾՀ-ն վերցվում է պրոֆիլից (de_declaration.ssn-ը EPD-ում հիմնականում դատարկ է)
  const { declarationSsn } = await import('../src/engine/evaluator.js');
  const d = decl(R, 'D-111-2024').decl;
  assert.equal(declarationSsn({ ...d, ssn: null }), '0000102184');
});

test('penalty record check against EPD on entry/import: not found, published before the penalty', async () => {
  const { demoPenalties, finalizeRecord } = await import('../src/data/penalties.js');
  const { checkPenaltyRecord } = await import('../src/engine/evaluator.js');
  const P = demoPenalties();
  const byViv = (n) => P.find((r) => r.vivNumber === n);
  assert.equal(checkPenaltyRecord(byViv('61/26')).warning, 'not_found'); // Սամվել 2025, EPD-ում չկա
  assert.equal(checkPenaltyRecord(byViv('48/26')).warning, 'before'); // Դավիթ 2025, հրապարակվել է մինչև տույժը
  assert.equal(checkPenaltyRecord(byViv('41/25')).warning, null); // Վահե 2024, ուշացում
  assert.equal(checkPenaltyRecord(byViv('57/26')).warning, null); // Վահե 2025, սևագիր՝ իրական չներկայացում
  assert.equal(checkPenaltyRecord(byViv('70/26')), null); // չի կապակցվում (ՀԾՀ չկա)
  // տարվա սխալ՝ հայտարարագիր չի գտնվում
  assert.equal(checkPenaltyRecord(finalizeRecord({ ...byViv('41/25'), year: 2019 })).warning, 'not_found');
});

test('variables page: usage of simple (doc.) and external (ext.) variables', async () => {
  const { refUsage } = await import('../src/engine/variableUsage.js');
  assert.deepEqual(refUsage({}, 'ext', 'penalty_late_count', 'declarations'), ['DEC-R3']);
  assert.deepEqual(refUsage({}, 'ext', 'civil_family_count', 'declarations'), ['DEC-R2']);
  assert.ok(refUsage({}, 'doc', 'bank_start', 'declarations').includes('doc.money_start')); // ընթացիկ ծախսի բանաձև
  assert.ok(refUsage({}, 'doc', 'cash_start', 'declarations').includes('DEC-R5'));
  // կառուցիչով փոխված պայման և մասնագետի կանոն
  const st = { ruleConfig: { 'DEC-R3': { expression: 'ext.penalty_unsubmitted_count >= 2' } }, customRules: [{ id: 'C-1', kind: 'expression', direction: 'declarations', expression: 'ext.penalty_late_count > 1' }] };
  assert.deepEqual(refUsage(st, 'ext', 'penalty_late_count', 'declarations'), ['C-1']);
  assert.deepEqual(refUsage(st, 'ext', 'penalty_unsubmitted_count', 'declarations'), ['DEC-R3', 'DEC-R4']);
});

test('only yearly declarations are evaluation units (other types feed the penalty history)', async () => {
  const { demoPenalties } = await import('../src/data/penalties.js');
  const termination = { ...demoPenalties()[2], row: 99, declarationKind: 'Դադարեցնելու', declarationType: 3, ssn: '0000100815' };
  const R = evaluateAll({ ...base, penalties: { records: [...demoPenalties(), termination] } });
  assert.ok(R.declarations.every((u) => (u.decl ? u.decl.declarationtype : u.declarationType) === 1));
  assert.equal(R.declarations.filter((u) => u.profile.ssn === '0000100815').length, 0);
});

test('penalties template (.xlsx) round-trip: written template is recognised on import', async () => {
  const { buildXlsx } = await import('../src/data/xlsxWriter.js');
  const { readXlsx } = await import('../src/data/xlsx.js');
  const { penaltyTemplateSheets, parsePenaltyRows } = await import('../src/data/penalties.js');
  const sheets = penaltyTemplateSheets();
  const empty = parsePenaltyRows(await readXlsx(buildXlsx(sheets)));
  assert.deepEqual([empty.records.length, empty.missingColumns], [0, []]);
  // լրացված տող (ՀԾՀ՝ առաջին 0-ով, ամսաթիվ՝ տեքստ)
  sheets[0].rows = [['1', '05/26', '12.05.2026', 'Տիգրան', 'Մկրտչյան', '', '0000100112', 'Պ/Ա', 'Կոմիտեի նախագահ', '2025', 'Տարեկան', '169.28/5', '', '', '', '']];
  const { records } = parsePenaltyRows(await readXlsx(buildXlsx(sheets)));
  assert.deepEqual([records[0].ssn, records[0].vivDate, records[0].year, records[0].declarationType, records[0].issues], ['0000100112', '2026-05-12', 2025, 1, []]);
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

test('combined score (DEC-04, C2): unique fired indicators of all calculations + one DEC-R7 flag, never above 100', async () => {
  const { declarationWeightTotal, combinedScore } = await import('../src/engine/evaluator.js');
  const { demoPenalties } = await import('../src/data/penalties.js');
  const st = { ...base, penalties: { records: demoPenalties() } };
  const R = evaluateAll(st);
  assert.equal(declarationWeightTotal(st), 100);
  const t = R.declarations.find((u) => u.code === 'D-105-2025');
  // DEC-R1՝ պաշտոնյա և ընտանիքի կազմ (մեկ անգամ), DEC-R2 և DEC-R4՝ պաշտոնյա, DEC-R3՝ կին (առանձին հայտարարագիր)
  const ids = t.indicators.map((x) => x.ruleId).sort();
  assert.deepEqual(ids, ['DEC-R1', 'DEC-R2', 'DEC-R3', 'DEC-R4']);
  assert.equal(t.indicators.find((x) => x.ruleId === 'DEC-R1').scopes.length, 2);
  assert.equal(t.score, 30 + 5 + 3 + 7);
  // միավորը = եզակի ցուցանիշների քաշերի գումար բոլոր միավորների համար
  for (const u of R.declarations) {
    const fired = new Map();
    for (const sc of u.scopes) for (const r of Object.values(sc.results)) if (r.status === 'fired') fired.set(r.ruleId, r.weight);
    assert.equal(u.score, [...fired.values()].reduce((a, w) => a + w, 0), u.code);
    assert.ok(u.score <= 100);
    assert.equal(u.risky, u.score >= u.threshold);
  }
  // DEC-R7. մեկ նշում հայտարարագրի համար, առավելագույն քաշով սահմանափակված. նախկին երկու նշումները (առանձին/ընտանիք)՝ մեծագույնը
  const withFlags = (flags, cfg = {}) => evaluateAll({ ...st, ruleConfig: cfg, manualFlags: flags.map((f, i) => ({ id: `M${i}`, direction: 'declarations', unitId: t.id, note: `n${i}`, ...f })) }).declarations.find((u) => u.code === 'D-105-2025');
  assert.equal(withFlags([{ weight: 20 }]).score, 45 + 20);
  assert.equal(withFlags([{ weight: 10, scope: 'individual' }, { weight: 20, scope: 'family' }]).score, 45 + 20);
  assert.equal(withFlags([{ weight: 20 }], { 'DEC-R7': { weight: 15 } }).score, 45 + 15);
  // ընտանիքի կազմում միայն աշխատած ցուցանիշը համակցվում է անձանց ցուցանիշների հետ
  assert.ok(combinedScore([{ label: 'ա', results: { X: { ruleId: 'X', status: 'fired', weight: 30 } } }, { label: 'ընտ', results: { X: { ruleId: 'X', status: 'fired', weight: 30 }, Y: { ruleId: 'Y', status: 'fired', weight: 25 } } }], null).score === 55);
});

test('DEC-R5: mortgage loans (keyword in the received-loan row text) are not counted', () => {
  const r5 = (st) => evaluateAll(st).declarations.find((u) => u.code === 'D-108-2024').scopes[0].results['DEC-R5'];
  // 1.2 մլն սպառողական + 15 մլն հիփոթեքային («Հիփոթեքային վարկ…» նկարագրությամբ), կանխիկ տարեսկզբին՝ 1.5 մլն
  const r = r5(base);
  assert.equal(r.status, 'fired');
  assert.ok(r.values.some((x) => /հիփոթեքային/.test(x.label) && x.value === 15000000));
  // բանալի բառեր չկան՝ հիփոթեքը հաշվվում է (16.2 մլն > 1.5 մլն)
  assert.equal(r5({ ...base, variables: { ...base.variables, mortgage_keywords: [{ value: [], effectiveFrom: '2020-01-01' }] } }).status, 'not_fired');
  // բառը համեմատվում է որպես բառի մաս և առանց մեծատառի տարբերության
  assert.equal(r5({ ...base, variables: { ...base.variables, mortgage_keywords: [{ value: ['ՀԻՓՈԹԵՔ'], effectiveFrom: '2020-01-01' }] } }).status, 'fired');
});

test('DEC-R6: family-total cash, sequential conditions (a → b), (c) only in the disabled reserve DEC-R6-2', async () => {
  const { declarationWeightTotal } = await import('../src/engine/evaluator.js');
  const R = evaluateAll(base);
  // ընտանիքի կազմով հաշվարկ կա՝ անհատական հաշվարկներում կիրառելի չէ
  const d101 = decl(R, 'D-101-2025');
  assert.ok(d101.scopes.filter((sc) => sc.kind !== 'family').every((sc) => sc.results['DEC-R6'].status === 'not_applicable'));
  assert.notEqual(d101.scopes.find((sc) => sc.kind === 'family').results['DEC-R6'].status, 'not_applicable');
  // Տիգրան + Մարինե 2024. առանձին կանխիկը < 5 մլն, ընտանիքինը՝ 6.45 / 7 մլն ≥ 3 × անկանխիկ (1.5 / 2 մլն)
  const d105 = decl(R, 'D-105-2024');
  assert.ok(d105.scopes.filter((sc) => sc.kind !== 'family').every((sc) => sc.exp.cashStart < 5e6 && sc.exp.cashEnd < 5e6));
  assert.equal(d105.scopes.find((sc) => sc.kind === 'family').results['DEC-R6'].status, 'fired');
  assert.ok(d105.indicators.some((x) => x.ruleId === 'DEC-R6' && x.scopes.length === 1));
  // ընտանիքի անդամներ չկան՝ հայտարարատուի հաշվարկը. (գ) այլևս չի ստուգվում
  const r6 = decl(R, 'D-110-2025').scopes[0].results['DEC-R6'];
  assert.equal(r6.status, 'fired');
  assert.ok(r6.values.some((v) => v.label === 'Պայմաններ տարեսկզբին' && v.value === '(ա) ոչ → (բ) չի ստուգվել'));
  // պահուստային DEC-R6-2-ը լռելյայն անջատված է և քաշերի գումարում չի մտնում
  assert.ok(!('DEC-R6-2' in decl(R, 'D-110-2025').scopes[0].results));
  assert.equal(declarationWeightTotal(base), 100);
  const R2 = evaluateAll({ ...base, ruleConfig: { 'DEC-R6-2': { enabled: true } } });
  const r62 = decl(R2, 'D-110-2025').scopes[0].results['DEC-R6-2'];
  assert.equal(r62.status, 'not_fired'); // կանխիկը հիմնավորվում է նախորդ տարիների խնայողությամբ
  assert.ok(r62.values.some((v) => v.label === 'Պայմաններ տարեվերջին' && v.value === '(ա) այո → (բ) այո → (գ) ոչ'));
});

test('DEC-10: specialist-added alienations count as income (Ե), acquisitions as acquired property (Գ), per person', async () => {
  const { profileChildren } = await import('../src/data/epd/repository.js');
  const R0 = evaluateAll(base);
  const u0 = decl(R0, 'D-101-2025');
  const d = u0.decl;
  const minor = profileChildren('de_profilefamilymembers', d.declarant).find((x) => x.type === 2);
  const item = (kind, amount, owner = {}) => ({ _declaration: d.instanceid, _item: true, kind, name: kind, amount, description: '', profile: d.declarant, familymembertype: null, ...owner });
  const R = evaluateAll({ ...base, corrections: {
    'item:1': item('alienation', 1000000),
    'item:2': item('acquisition', 400000),
    'item:3': item('acquisition', 250000, { profile: minor.profile, familymembertype: 2 }), // չհայտարարագրող անչափահաս
  } });
  const u = decl(R, 'D-101-2025');
  const ind = (x) => x.scopes[0].exp;
  const fam = (x) => x.scopes.find((sc) => sc.kind === 'family').exp;
  // հայտարարատու. Ե +1 մլն, Գ +0.4 մլն (անչափահասինը՝ ոչ) → ԸՏԾ +0.6 մլն
  assert.equal(ind(u).E - ind(u0).E, 1000000);
  assert.equal(ind(u).G - ind(u0).G, 400000);
  assert.equal(Math.round(ind(u).annual - ind(u0).annual), 600000);
  // ընտանիքի կազմ. ներառված է նաև անչափահասի ձեռքբերումը
  assert.equal(fam(u).G - fam(u0).G, 650000);
  assert.equal(Math.round(fam(u).annual - fam(u0).annual), 350000);
  // ճշգրտումների մաս են. «ճշգրտումից առաջ» հաշվարկում չկան
  assert.equal(Object.keys(u.corrections).length, 3);
  assert.equal(ind(u.original).E, ind(u0).E);
});

test('login via NAP (NFR-05…NFR-09): only eID/mID, PSN required, registered and active user', async () => {
  const { authenticate, bprPerson, DEFAULT_USERS } = await import('../src/engine/auth.js');
  const token = (acm, profile) => ({ iss: 'https://nid.e-gov.am', aud: 'cpc', acm, sub: profile.psn || profile.document_number, profile });
  const admin = DEFAULT_USERS.find((u) => u.role === 'admin');
  assert.ok(admin && admin.name); // առաջին ադմինիստրատորը՝ տեղակայման ժամանակ, անունը՝ ԲՊՌ-ից
  assert.equal(authenticate(DEFAULT_USERS, token('eid', { psn: admin.ssn })).user.id, admin.id);
  assert.equal(authenticate(DEFAULT_USERS, token('mid', { psn: admin.ssn })).ok, true);
  assert.match(authenticate(DEFAULT_USERS, token('email', { psn: admin.ssn })).reason, /թույլատրված չէ/);
  assert.match(authenticate(DEFAULT_USERS, token('eid', { document_number: 'AH1234567' })).reason, /ՀԾՀ չկա/);
  assert.match(authenticate(DEFAULT_USERS, token('eid', { psn: '0000100519' })).reason, /գրանցված չէ/);
  const off = DEFAULT_USERS.map((u) => (u.id === admin.id ? { ...u, active: false } : u));
  assert.match(authenticate(off, token('eid', { psn: admin.ssn })).reason, /ապաակտիվ/);
  // օգտատիրոջ ավելացում ՀԾՀ-ով. տվյալները ԲՊՌ-ից
  assert.equal(bprPerson('0000100519').name, 'Մարիամ Կիրակոսյան');
  assert.equal(bprPerson('0000000000').ok, false);
  assert.match(bprPerson('0000101518').reason, /մահացած/);
});

test('weights: active declaration rules + DEC-R7 maximum must total 100', async () => {
  const { declarationWeightTotal } = await import('../src/engine/evaluator.js');
  assert.equal(declarationWeightTotal(base), 100);
  assert.equal(declarationWeightTotal({ ...base, ruleConfig: { 'DEC-R5': { enabled: false } } }), 95);
  assert.equal(declarationWeightTotal({ ...base, ruleConfig: { 'DEC-R5': { weight: 10 } } }), 105);
  assert.equal(declarationWeightTotal({ ...base, ruleConfig: { 'DEC-R7': { weight: 20 } } }), 95);
  assert.equal(declarationWeightTotal({ ...base, customRules: [{ id: 'DEC-C01', kind: 'expression', direction: 'declarations', expression: 'doc.year > 0', weight: 5, enabled: true }] }), 105);
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
    assert.ok(near(g('acquisitions'), g('realestate_acquired') + g('vehicles_acquired') + g('manual_acquisitions')), u.code);
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
  assert.deepEqual(imp.map((x) => `${x.id}:${x.direction}`).sort(), ['DEC-R6-2:declarations', 'DEC-R6:declarations', 'INT-R11:integrity']);
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
  assert.equal(qs.find((q) => q.id === 'Q-54').accepted, true);
  assert.equal(qs.find((q) => q.id === 'Q-25').accepted, false); // վերաբացված (25.11.2026)
  assert.equal(qs.find((q) => q.id === 'Q-17').accepted, false); // «Մասամբ ընդունված»՝ բաց
  assert.equal(qs.find((q) => q.id === 'Q-48').status, 'Բաց');
});
