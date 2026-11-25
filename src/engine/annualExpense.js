/**
 * Ընթացիկ տարեկան ծախսի հաշվարկ — SRS 4.1, DEC-01, DEC-08։
 *
 *   Ծ   = Դս + Ե − Գ − Դվ
 *   ԸՏԾ = Ծ + (Փվ − Փս)
 *   ՄԱԾ = ԸՏԾ / 12
 *
 * Բանաձևը իրականացված է ճիշտ այնպես, ինչպես գրված է SRS-ում։ EPD-ում Փ-ն ակտիվներ են (տրամադրված
 * փոխառություններ և ավանդներ), ուստի նշանի հարցը բաց է (docs/QUESTIONS.md)։
 * Բաղադրիչների աղբյուրները (EPD աղյուսակներ, tabtype) հավաքված են FORMULA_SOURCES-ում։
 *
 * DEC-06. մերժված տողերը (status = 2) չեն ներառվում (repository.detailRows)։
 * DEC-10. մասնագետի ճշգրտումները կիրառվում են տողի դաշտի մակարդակում (EPD-ն չի փոխվում)։
 * DEC-11. ՀՀ դրամ = x_amount × x_ratetodefault (տողի հետ պահված փոխարժեք)։
 */
import { detailRows, amd } from '../data/epd/repository.js';
import { TAB } from '../data/epd/classifiers.js';
import { parse, evaluate } from './expression.js';

/**
 * 4.1-ի բարդ փոփոխականների բանաձևեր (նախասահմանված). մասնագետը կարող է փոխել դրանք (state.formulaOverrides),
 * և փոփոխությունը կիրառվում է ամենուր՝ DEC-R1, DEC-R6, 4.1-ի ներդիրներ, կառուցիչ։ Բանաձևերում թույլատրվում են
 * պարզ փոփոխականները (աղյուսակի մեկ դաշտի գումար) և այս ցանկի այլ փոփոխականները
 */
export const DEFAULT_FORMULAS = {
  money_start: 'doc.cash_start + doc.bank_start + doc.eacc_start',
  money_end: 'doc.cash_end + doc.bank_end + doc.eacc_end',
  acquisitions: 'doc.realestate_acquired + doc.vehicles_acquired + doc.manual_acquisitions',
  loans_deposits_start: 'doc.loans_given_start + doc.deposits_start',
  loans_deposits_end: 'doc.loans_given_end + doc.deposits_end',
  expense_annual: 'doc.money_start + doc.income - doc.acquisitions - doc.money_end + doc.loans_deposits_end - doc.loans_deposits_start',
  expense_monthly: 'doc.expense_annual / 12',
  noncash_start: 'doc.bank_start + doc.eacc_start + doc.deposits_start',
  noncash_end: 'doc.bank_end + doc.eacc_end + doc.deposits_end',
  alienations: 'doc.realestate_alienated + doc.vehicles_alienated',
};
/** Գործող բանաձևեր (նախասահմանված + մասնագետի փոփոխածներ) */
export const effectiveFormulas = (state) => ({ ...DEFAULT_FORMULAS, ...Object.fromEntries(Object.entries(state?.formulaOverrides || {}).map(([k, v]) => [k, v.expression])) });
/** Պարզ փոփոխականներ (աղյուսակի մեկ դաշտի գումար)՝ 4.1-ի բանաձևերի բաղադրիչներ */
export const FORMULA_INPUTS = ['cash_start', 'cash_end', 'bank_start', 'bank_end', 'eacc_start', 'eacc_end', 'deposits_start', 'deposits_end', 'loans_given_start', 'loans_given_end',
  'income', 'realestate_acquired', 'vehicles_acquired', 'realestate_alienated', 'vehicles_alienated', 'loans_received', 'salary_income', 'declared_expenses', 'manual_acquisitions', 'manual_alienations'];
const astCache = new Map();
const astOf = (expr) => { if (!astCache.has(expr)) astCache.set(expr, parse(expr)); return astCache.get(expr); };

export const FORMULA_SOURCES = {
  // «Դրամական միջոցներ»՝ կանխիկ, բանկային հաշիվներ, էլեկտրոնային հաշիվներ և կրիպտոարժույթ (tabtype 1՝ առկա, տարեկան)
  money: [
    { table: 'de_financialmeanscash', tabs: [TAB.cashAvailable] },
    { table: 'de_financialmeansbankaccountbalances', tabs: [TAB.bankAvailable] },
    { table: 'de_financialmeanselectronicaccountsandcryptocurrencies', tabs: [TAB.eaccAvailable] },
  ],
  // Փոխառություններ (տրամադրված) և ավանդներ
  loansDeposits: [
    { table: 'de_loansanddepositsloandetails', tabs: [TAB.loanGiven] },
    { table: 'de_loansanddepositsdepositdetails', tabs: [TAB.depositAvailable] },
  ],
  // Եկամուտներ՝ բոլոր տեսակները (ներառյալ 8՝ գույքի օտարում և 13՝ ստացված փոխառություններ/վարկեր)
  income: [{ table: 'de_revenuesincomes' }],
  // Տարվա ընթացքում ձեռք բերված գույք (tabtype 2)
  acquisitions: [
    { table: 'de_realestatedetails', tabs: [TAB.realestateAcquired] },
    { table: 'de_vehicledetails', tabs: [TAB.vehicleAcquired] },
  ],
};

/**
 * Մասնագետի ավելացրած ձեռքբերումներ և օտարումներ (DEC-10, «Հայտարարագրի ճշգրտումներ»). պահվում են ճշգրտումների հետ՝
 * corrections["item:<id>"] = { _declaration, _item: true, kind: 'acquisition' | 'alienation', name, amount, description, profile, familymembertype }.
 * Օտարումը մտնում է եկամուտների (Ե) մեջ, ձեռքբերումը՝ ձեռք բերված գույքի (Գ)՝ հակառակ նշանով
 */
export const manualItems = (corrections) => Object.entries(corrections || {}).filter(([, c]) => c?._item).map(([key, c]) => ({ key, ...c }));

/** Կիրառում է ճշգրտումները. corrections = { [entityid]: { _declaration, _table, <column>: value } } */
export function applyCorrections(row, corrections) {
  const c = corrections?.[row.entityid];
  if (!c) return row;
  const fields = Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith('_')));
  return { ...row, ...fields, _corrected: Object.keys(fields) };
}

const inTabs = (src) => (r) => !src.tabs || src.tabs.includes(r.tabtype);

/**
 * Հաշվարկ տրված հայտարարագրերի (root տողեր) և անձանց համար։
 * @param decls  de_declaration-ի ընթացիկ տողեր
 * @param personFilter  (row) => boolean — որ տողերն են մտնում (անձի կամ ընտանիքի հաշվարկ)
 */
export function computeExpense(decls, personFilter, corrections, formulas = DEFAULT_FORMULAS) {
  const rows = (table) => decls.flatMap((d) => detailRows(d, table).map((r) => applyCorrections(r, corrections)).filter((r) => personFilter(r, d)));
  const sum = (sources, field) => sources.reduce((s, src) => s + rows(src.table).filter(inTabs(src)).reduce((a, r) => a + (amd(r, field) || 0), 0), 0);

  // ── պարզ փոփոխականներ. աղյուսակի մեկ դաշտի գումար (ՀՀ դրամով, «առկա» ցանկ)
  // մասնագետի ավելացրած տողեր՝ նույն անձի զտիչով, ինչ հայտարարագրի տողերը
  const items = decls.flatMap((d) => manualItems(corrections).filter((it) => it._declaration === d.instanceid && personFilter({ profile: it.profile, familymembertype: it.familymembertype ?? null }, d)));
  const itemSum = (kind) => items.filter((it) => it.kind === kind).reduce((a, it) => a + (Number(it.amount) || 0), 0);
  const fieldSum = (table, tab, f) => rows(table).filter((r) => tab === null || r.tabtype === tab).reduce((a, r) => a + (amd(r, f) || 0), 0);
  const incomeOf = (type) => rows('de_revenuesincomes').filter((r) => r.incometype === type).reduce((a, r) => a + (amd(r, 'amount') || 0), 0);
  const both = (k, table, tab) => ({ [`${k}_start`]: fieldSum(table, tab, 'amountatbeginningofyear'), [`${k}_end`]: fieldSum(table, tab, 'amountatendofyear') });
  const inputs = {
    ...both('cash', 'de_financialmeanscash', TAB.cashAvailable),
    ...both('bank', 'de_financialmeansbankaccountbalances', TAB.bankAvailable),
    ...both('eacc', 'de_financialmeanselectronicaccountsandcryptocurrencies', TAB.eaccAvailable),
    ...both('deposits', 'de_loansanddepositsdepositdetails', TAB.depositAvailable),
    ...both('loans_given', 'de_loansanddepositsloandetails', TAB.loanGiven),
    income: sum(FORMULA_SOURCES.income, 'amount') + itemSum('alienation'), // օտարումները՝ որպես եկամուտ
    manual_acquisitions: itemSum('acquisition'),
    manual_alienations: itemSum('alienation'),
    realestate_acquired: fieldSum('de_realestatedetails', TAB.realestateAcquired, 'dealamount'),
    vehicles_acquired: fieldSum('de_vehicledetails', TAB.vehicleAcquired, 'dealamount'),
    realestate_alienated: fieldSum('de_realestatedetails', TAB.realestateAlienated, 'dealamount'),
    vehicles_alienated: fieldSum('de_vehicledetails', TAB.vehicleAlienated, 'dealamount'),
    loans_received: incomeOf(13),
    salary_income: incomeOf(1),
    declared_expenses: rows('de_expensesdetails').reduce((a, r) => a + (amd(r, 'amount') || 0), 0),
  };
  // ── բարդ փոփոխականներ՝ բանաձևերով (ցիկլի կամ սխալի դեպքում՝ NaN)
  const values = {};
  const stack = new Set();
  const value = (k) => {
    if (k in inputs) return inputs[k];
    if (k in values) return values[k];
    if (!formulas[k] || stack.has(k)) return NaN;
    stack.add(k);
    let v;
    try { v = evaluate(astOf(formulas[k]), { resolve: (ns, name) => (ns === 'doc' ? value(name) : NaN), table: () => [] }).value; } catch { v = NaN; }
    stack.delete(k);
    values[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
    return values[k];
  };
  const Ds = value('money_start');
  const Dv = value('money_end');
  const E = inputs.income;
  const G = value('acquisitions');
  const Ps = value('loans_deposits_start');
  const Pv = value('loans_deposits_end');
  const annual = value('expense_annual');
  const countOwned = (t) => rows(t).filter((r) => r.tabtype === 1 || r.tabtype === 2).length - rows(t).filter((r) => r.tabtype === 3).length;

  return {
    Ds, Dv, E, G, Ps, Pv,
    C: Ds + E - G - Dv, // միջանկյալ (տեղեկատվական). Ծ = Դս + Ե − Գ − Դվ
    annual, monthly: value('expense_monthly'),
    alienations: value('alienations'), declaredExpenses: inputs.declared_expenses, cashStart: inputs.cash_start, cashEnd: inputs.cash_end,
    noncashStart: value('noncash_start'), noncashEnd: value('noncash_end'),
    salary: inputs.salary_income, loansReceived: inputs.loans_received, saleIncome: incomeOf(8),
    realestateOwned: countOwned('de_realestatedetails'), vehiclesOwned: countOwned('de_vehicledetails'),
    manualAcquisitions: inputs.manual_acquisitions, manualAlienations: inputs.manual_alienations, items,
    inputs, value, formulas,
    rows,
  };
}

export const EXPENSE_LABELS = {
  Ds: 'Դս — դրամական միջոցներ տարեսկզբին',
  E: 'Ե — տարվա եկամուտներ',
  G: 'Գ — ձեռք բերված գույք',
  Dv: 'Դվ — դրամական միջոցներ տարեվերջին',
  Ps: 'Փս — փոխառություններ և ավանդներ տարեսկզբին',
  Pv: 'Փվ — փոխառություններ և ավանդներ տարեվերջին',
  C: 'Ծ = Դս + Ե − Գ − Դվ',
  annual: 'ԸՏԾ — ընթացիկ տարեկան ծախս',
  monthly: 'ՄԱԾ — միջին ամսական ծախս',
};

/** Բանաձևի ընթեռնելի տեսք. doc.<key>-ը փոխարինվում է 4.1-ի նշանակումով (Դս, Ե, Գ, ...) կամ անվանումով */
const SYMBOL = { money_start: 'Դս', money_end: 'Դվ', income: 'Ե', acquisitions: 'Գ', loans_deposits_start: 'Փս', loans_deposits_end: 'Փվ', expense_annual: 'ԸՏԾ', expense_monthly: 'ՄԱԾ' };
export const readableFormula = (expr, labelOf = () => null) => (expr || '').replace(/doc\.([a-z0-9_]+)/g, (m, k) => SYMBOL[k] || labelOf(k) || m).replace(/\*/g, '×').replace(/ - /g, ' − ').replace(/\//g, '÷');
