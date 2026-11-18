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
  assert.equal(scopeSt(d, ind('PR-105'), 'DEC-R1'), 'not_evaluated');
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
  assert.equal(by('D-111-2025').draft, true);
  const s = by('D-101-2025').scopes[0];
  assert.equal(s.exp.Dv, 8000000 + 2940000);
  assert.ok(R.declarations.every((u) => !u.risky));
  for (const u of R.declarations.filter((x) => !x.draft)) console.log(u.code, u.scopes.map((sc) => `${sc.key}:${Math.round(sc.exp.monthly)}/${sc.score}`).join(' '));
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
