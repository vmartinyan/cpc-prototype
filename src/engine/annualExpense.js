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
export function computeExpense(decls, personFilter, corrections) {
  const rows = (table) => decls.flatMap((d) => detailRows(d, table)).map((r) => applyCorrections(r, corrections)).filter(personFilter);
  const sum = (sources, field) => sources.reduce((s, src) => s + rows(src.table).filter(inTabs(src)).reduce((a, r) => a + (amd(r, field) || 0), 0), 0);

  const Ds = sum(FORMULA_SOURCES.money, 'amountatbeginningofyear');
  const Dv = sum(FORMULA_SOURCES.money, 'amountatendofyear');
  const E = sum(FORMULA_SOURCES.income, 'amount');
  const G = sum(FORMULA_SOURCES.acquisitions, 'dealamount');
  const Ps = sum(FORMULA_SOURCES.loansDeposits, 'amountatbeginningofyear');
  const Pv = sum(FORMULA_SOURCES.loansDeposits, 'amountatendofyear');
  const C = Ds + E - G - Dv;
  const annual = C + (Pv - Ps);
  const monthly = annual / 12;

  // Տեղեկատվական (բանաձևում առանձին չեն մասնակցում)
  const incomeOf = (type) => rows('de_revenuesincomes').filter((r) => r.incometype === type).reduce((a, r) => a + (amd(r, 'amount') || 0), 0);
  const alienations = ['de_realestatedetails', 'de_vehicledetails'].reduce((s, t) => s + rows(t).filter((r) => r.tabtype === TAB.realestateAlienated).reduce((a, r) => a + (amd(r, 'dealamount') || 0), 0), 0);
  const declaredExpenses = rows('de_expensesdetails').reduce((a, r) => a + (amd(r, 'amount') || 0), 0);
  const cashOf = (f) => rows('de_financialmeanscash').filter((r) => r.tabtype === TAB.cashAvailable).reduce((a, r) => a + (amd(r, f) || 0), 0);
  const countOwned = (t) => rows(t).filter((r) => r.tabtype === 1 || r.tabtype === 2).length - rows(t).filter((r) => r.tabtype === 3).length;

  return {
    Ds, Dv, E, G, Ps, Pv, C, annual, monthly,
    alienations, declaredExpenses, cashStart: cashOf('amountatbeginningofyear'), cashEnd: cashOf('amountatendofyear'),
    salary: incomeOf(1), loansReceived: incomeOf(13), saleIncome: incomeOf(8),
    realestateOwned: countOwned('de_realestatedetails'), vehiclesOwned: countOwned('de_vehicledetails'),
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
  annual: 'ԸՏԾ = Ծ + (Փվ − Փս)',
  monthly: 'ՄԱԾ = ԸՏԾ / 12',
};
