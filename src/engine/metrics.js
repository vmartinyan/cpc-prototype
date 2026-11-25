/**
 * Կանոնների կառուցիչի համար հասանելի փոփոխականներ (COM-01, COM-04, COM-09)։
 *   doc.* — փաստաթղթի դաշտեր և ագրեգատներ
 *   ext.* — արտաքին համակարգերի տվյալներ (միայն այն, ինչը SRS 11.1-ում «Կա» է). ադապտերով, քեշով (COM-13, COM-14)
 * Բացի այդ, կառուցիչում հասանելի են sum/count/min/max/avg ագրեգատները EPD աղյուսակների վրա (directionTables)։
 */
import { NotEvaluated, NotApplicable } from './expression.js';
import { byInstance, amd, isYes, profileChildren } from '../data/epd/repository.js';
import { TAB } from '../data/epd/classifiers.js';
import { DEFAULT_FORMULAS } from './annualExpense.js';
import { civilKinshipOfScope, receivedLoans } from '../rules/declarations.js';

const ssnOf = (profileId) => byInstance('de_profile', profileId)?.ssn;

/** EPD աղյուսակներ, որոնց վրա կառուցիչում թույլատրված են ագրեգատներ (COM-04) */
export const directionTables = {
  declarations: [
    'de_financialmeanscash', 'de_financialmeansbankaccountbalances', 'de_financialmeanselectronicaccountsandcryptocurrencies',
    'de_loansanddepositsloandetails', 'de_loansanddepositsdepositdetails', 'de_revenuesincomes', 'de_revenuesremainingprincipals',
    'de_realestatedetails', 'de_vehicledetails', 'de_expensesdetails', 'de_contractsupon5mlndetails', 'de_membershipinpartiesdetails',
  ],
  gifts: [],
  parties: [],
  integrity: [
    'de_integrityworkpositions', 'de_integrityinterestspublicofficerelatives', 'de_integrityinterestspartymembership',
    'de_integrityliabilitydisciplinary', 'de_integrityliabilityconviction', 'de_integrityliabilityrevocatedconviction',
    'de_integrityliabilityunfulfilledterminatedprosecutions', 'de_integrityliabilityadministrative',
    'de_integrityliabilitycivilcaseparticipation', 'de_integrityfinancialmeanscash', 'de_integrityfinancialmeansbankaccountbalances',
  ],
};

/**
 * Աղյուսակների կարճ տերմիններ կառուցիչի համար. count(bank_accounts)՝ count(de_financialmeansbankaccountbalances)-ի փոխարեն։
 * EPD անունները նույնպես շարունակում են աշխատել։
 */
export const TABLE_ALIASES = {
  declarations: [
    { alias: 'cash', table: 'de_financialmeanscash', label: 'Կանխիկ դրամական միջոցներ' },
    { alias: 'bank_accounts', table: 'de_financialmeansbankaccountbalances', label: 'Բանկային հաշիվների մնացորդներ' },
    { alias: 'e_accounts', table: 'de_financialmeanselectronicaccountsandcryptocurrencies', label: 'Էլեկտրոնային հաշիվներ և կրիպտոարժույթ' },
    { alias: 'loans_given', table: 'de_loansanddepositsloandetails', label: 'Տրամադրված փոխառություններ' },
    { alias: 'deposits', table: 'de_loansanddepositsdepositdetails', label: 'Ավանդներ' },
    { alias: 'incomes', table: 'de_revenuesincomes', label: 'Եկամուտներ' },
    { alias: 'loan_balances', table: 'de_revenuesremainingprincipals', label: 'Վարկերի և փոխառությունների մնացորդներ' },
    { alias: 'realestate', table: 'de_realestatedetails', label: 'Անշարժ գույք' },
    { alias: 'vehicles', table: 'de_vehicledetails', label: 'Տրանսպորտային միջոցներ' },
    { alias: 'expenses', table: 'de_expensesdetails', label: 'Ծախսեր' },
    { alias: 'contracts', table: 'de_contractsupon5mlndetails', label: '5 մլն դրամից ավել պայմանագրեր' },
    { alias: 'party_membership', table: 'de_membershipinpartiesdetails', label: 'Կուսակցական անդամակցություն' },
  ],
  gifts: [],
  parties: [],
  integrity: [
    { alias: 'work_positions', table: 'de_integrityworkpositions', label: 'Աշխատանքային գործունեություն' },
    { alias: 'official_relatives', table: 'de_integrityinterestspublicofficerelatives', label: 'Պետական պաշտոն զբաղեցնող հարազատներ' },
    { alias: 'party_membership', table: 'de_integrityinterestspartymembership', label: 'Կուսակցական անդամակցություն' },
    { alias: 'disciplinary', table: 'de_integrityliabilitydisciplinary', label: 'Կարգապահական պատասխանատվություն' },
    { alias: 'convictions', table: 'de_integrityliabilityconviction', label: 'Դատվածություն' },
    { alias: 'revoked_convictions', table: 'de_integrityliabilityrevocatedconviction', label: 'Հանված կամ մարված դատվածություն' },
    { alias: 'prosecutions', table: 'de_integrityliabilityunfulfilledterminatedprosecutions', label: 'Քրեական հետապնդում չիրականացնելու/դադարեցնելու որոշումներ' },
    { alias: 'administrative', table: 'de_integrityliabilityadministrative', label: 'Վարչական պատասխանատվություն' },
    { alias: 'civil_cases', table: 'de_integrityliabilitycivilcaseparticipation', label: 'Քաղաքացիական գործերին մասնակցություն' },
    { alias: 'cash', table: 'de_integrityfinancialmeanscash', label: 'Կանխիկ դրամական միջոցներ' },
    { alias: 'bank_accounts', table: 'de_integrityfinancialmeansbankaccountbalances', label: 'Բանկային հաշիվների մնացորդներ' },
  ],
};

/** Կարճ տերմին կամ EPD անուն → EPD աղյուսակ (null՝ եթե ուղղության համար թույլատրված չէ) */
export function resolveTable(direction, name) {
  const a = TABLE_ALIASES[direction]?.find((x) => x.alias === name);
  if (a) return a.table;
  return directionTables[direction]?.includes(name) ? name : null;
}

/** Աղյուսակի հայերեն անվանում (կարճ տերմինով կամ EPD անունով) */
export function tableLabel(direction, name) {
  const t = resolveTable(direction, name);
  return TABLE_ALIASES[direction]?.find((x) => x.table === t)?.label || t;
}

/** Տույժերի ստուգման տվյալներ (DEC-R3, DEC-R4). ընտանիքի ընդհանուր կազմում կիրառելի չէ */
function penaltyCheckOf(s) {
  if (!s.penaltyCheck) throw new NotApplicable('Ընտանիքի ընդհանուր կազմ. տույժերը կիրառվում են անձի առանձին հայտարարագրի վրա');
  return s.penaltyCheck;
}
function penaltiesLoaded(s) {
  const pc = penaltyCheckOf(s);
  if (!pc.loaded) throw new NotEvaluated('Տույժերի տվյալները մուտքագրված չեն (COM-11). «Արտաքին ֆայլեր → Տույժեր»');
  return pc;
}

/** Ընտանիքի ընդհանուր կազմի գումար (DEC-R6). անհատական հաշվարկում (եթե ընտանիքի կազմով հաշվարկ կա)՝ կիրառելի չէ */
function familyTotal(s, f) {
  if (!s.familyTotal) throw new NotApplicable('Գնահատվում է ընտանիքի ընդհանուր կազմով (հայտարարատու և ընտանիքի անդամներ)');
  return f(s);
}
/** Հայտարարագրում նշված մերձավոր ազգականների քանակ ըստ տեսակի (c_relativetype) */
/** Աղյուսակի մեկ դաշտի գումար ՀՀ դրամով (հաշվարկի շրջանակի տողեր, ճշգրտումներով, առանց մերժվածների) */
const fieldSum = (s, table, tab, f) => s.exp.rows(table).filter((r) => r.tabtype === tab).reduce((a, r) => a + (amd(r, f) || 0), 0);
const relativesOf = (s, types) => profileChildren('de_profilerelatives', s.decls[0].declarant).filter((r) => types.includes(r.relativetype)).length;

function sumExt(ids, fn) {
  return ids.reduce((s, id) => s + fn(id), 0);
}

export const METRICS = {
  declarations: {
    levels: { scope: 'Հայտարարագիր (առանձին և ընտանիքի կազմով հաշվարկ)' },
    doc: [
      // ── պարզ փոփոխականներ (բարդերի բաղադրիչներ). աղյուսակի մեկ դաշտ՝ տողերի գումար ՀՀ դրամով, «առկա» ցանկ
      ...[
        ['bank', 'de_financialmeansbankaccountbalances', TAB.bankAvailable, 'Բանկային հաշիվներ'],
        ['eacc', 'de_financialmeanselectronicaccountsandcryptocurrencies', TAB.eaccAvailable, 'Էլեկտրոնային հաշիվներ և կրիպտոարժույթ'],
        ['deposits', 'de_loansanddepositsdepositdetails', TAB.depositAvailable, 'Ավանդներ'],
        ['loans_given', 'de_loansanddepositsloandetails', TAB.loanGiven, 'Տրամադրված փոխառություններ'],
      ].flatMap(([k, table, tab, label]) => [
        { key: `${k}_start`, label: `${label} տարեսկզբին`, source: `${table}.amountatbeginningofyear`, get: (s) => fieldSum(s, table, tab, 'amountatbeginningofyear') },
        { key: `${k}_end`, label: `${label} տարեվերջին`, source: `${table}.amountatendofyear`, get: (s) => fieldSum(s, table, tab, 'amountatendofyear') },
      ]),
      { key: 'realestate_acquired', label: 'Ձեռք բերված անշարժ գույքի գործարքի գումար', source: 'de_realestatedetails.dealamount (ձեռք բերված)', get: (s) => fieldSum(s, 'de_realestatedetails', TAB.realestateAcquired, 'dealamount') },
      { key: 'vehicles_acquired', label: 'Ձեռք բերված տրանսպորտային միջոցների գործարքի գումար', source: 'de_vehicledetails.dealamount (ձեռք բերված)', get: (s) => fieldSum(s, 'de_vehicledetails', TAB.vehicleAcquired, 'dealamount') },
      { key: 'realestate_alienated', label: 'Օտարված անշարժ գույքի գործարքի գումար', source: 'de_realestatedetails.dealamount (օտարված)', get: (s) => fieldSum(s, 'de_realestatedetails', TAB.realestateAlienated, 'dealamount') },
      { key: 'vehicles_alienated', label: 'Օտարված տրանսպորտային միջոցների գործարքի գումար', source: 'de_vehicledetails.dealamount (օտարված)', get: (s) => fieldSum(s, 'de_vehicledetails', TAB.vehicleAlienated, 'dealamount') },
      // ── բարդ փոփոխականներ
      { key: 'money_start', label: 'Դս — դրամական միջոցներ տարեսկզբին', get: (s) => s.exp.Ds },
      { key: 'money_end', label: 'Դվ — դրամական միջոցներ տարեվերջին', get: (s) => s.exp.Dv },
      { key: 'income', label: 'Ե — տարվա եկամուտներ', source: 'de_revenuesincomes.amount (բոլոր տեսակները) + մասնագետի ավելացրած օտարումներ', get: (s) => s.exp.E },
      { key: 'acquisitions', label: 'Գ — ձեռք բերված գույք', get: (s) => s.exp.G },
      { key: 'loans_deposits_start', label: 'Փս — փոխառություններ և ավանդներ տարեսկզբին', get: (s) => s.exp.Ps },
      { key: 'loans_deposits_end', label: 'Փվ — փոխառություններ և ավանդներ տարեվերջին', get: (s) => s.exp.Pv },
      { key: 'expense_annual', label: 'ԸՏԾ — ընթացիկ տարեկան ծախս', get: (s) => s.exp.annual },
      { key: 'expense_monthly', label: 'ՄԱԾ — միջին ամսական ծախս', get: (s) => s.exp.monthly },
      { key: 'cash_start', label: 'Կանխիկ տարեսկզբին', source: 'de_financialmeanscash.amountatbeginningofyear', get: (s) => s.exp.cashStart },
      { key: 'cash_end', label: 'Կանխիկ տարեվերջին', source: 'de_financialmeanscash.amountatendofyear', get: (s) => s.exp.cashEnd },
      { key: 'noncash_start', label: 'Անկանխիկ միջոցներ և ավանդներ տարեսկզբին', get: (s) => s.exp.noncashStart },
      { key: 'noncash_end', label: 'Անկանխիկ միջոցներ և ավանդներ տարեվերջին', get: (s) => s.exp.noncashEnd },
      { key: 'prev_savings', label: 'Նախորդ բոլոր տարիների խնայողություն՝ Σ (եկամուտ − ընթացիկ տարեկան ծախս)', get: (s) => s.prevSavings.total },
      { key: 'loans_received', label: 'Տարվա ընթացքում ստացված վարկեր և փոխառություններ (եկամտի տեսակ 13)', source: 'de_revenuesincomes.amount (եկամտի տեսակ 13)', get: (s) => s.exp.loansReceived },
      { key: 'manual_acquisitions', label: 'Ձեռքբերումներ՝ մասնագետի ավելացրած («Հայտարարագրի ճշգրտումներ», DEC-10)', source: 'Մոդուլ. հայտարարագրի ճշգրտումներ (ձեռքբերում)', get: (s) => s.exp.manualAcquisitions },
      { key: 'manual_alienations', label: 'Օտարումներ՝ մասնագետի ավելացրած («Հայտարարագրի ճշգրտումներ», DEC-10). ներառված են եկամուտներում', source: 'Մոդուլ. հայտարարագրի ճշգրտումներ (օտարում)', get: (s) => s.exp.manualAlienations },
      { key: 'loans_received_nonmortgage', label: 'Տարվա ընթացքում ստացված վարկեր և փոխառություններ, բացի հիփոթեքայիններից (DEC-R5)', get: (s) => receivedLoans(s).otherSum },
      // ընտանիքի ընդհանուր կազմով (հայտարարատու + ընտանիքի անդամներ) գումարներ (DEC-R6). մյուս հաշվարկներում կիրառելի չեն
      ...[['cash_start', 'Կանխիկ տարեսկզբին', (s) => s.exp.cashStart], ['cash_end', 'Կանխիկ տարեվերջին', (s) => s.exp.cashEnd],
        ['noncash_start', 'Անկանխիկ միջոցներ և ավանդներ տարեսկզբին', (s) => s.exp.noncashStart], ['noncash_end', 'Անկանխիկ միջոցներ և ավանդներ տարեվերջին', (s) => s.exp.noncashEnd],
        ['prev_savings', 'Նախորդ տարիների խնայողություն', (s) => s.prevSavings.total]]
        .map(([k, label, f]) => ({ key: `family_${k}`, label: `${label}՝ ընտանիքի ընդհանուր կազմով (հայտարարատու և ընտանիքի անդամներ)`, get: (s) => familyTotal(s, f) })),
      { key: 'salary_income', label: 'Հայտարարագրված աշխատավարձ', source: 'de_revenuesincomes.amount (եկամտի տեսակ 1)', get: (s) => s.exp.salary },
      { key: 'declared_expenses', label: 'Հայտարարագրված ծախսեր', source: 'de_expensesdetails.amount', get: (s) => s.exp.declaredExpenses },
      { key: 'alienations', label: 'Օտարված գույքի գումար', get: (s) => s.exp.alienations },
      { key: 'realestate_count', label: 'Հայտարարագրված անշարժ գույքերի քանակ (առկա և ձեռք բերված)', get: (s) => s.exp.realestateOwned },
      { key: 'vehicle_count', label: 'Հայտարարագրված տրանսպորտային միջոցների քանակ (առկա և ձեռք բերված)', get: (s) => s.exp.vehiclesOwned },
      { key: 'persons', label: 'Անձանց թիվ հաշվարկում', get: (s) => s.persons },
      { key: 'family_members_count', label: 'Հայտարարագրում նշված ընտանիքի անդամների քանակ', get: (s) => profileChildren('de_profilefamilymembers', s.decls[0].declarant).length },
      { key: 'adult_children_count', label: 'Հայտարարագրում նշված չափահաս զավակներ (մերձավոր ազգական, տեսակ 2)', get: (s) => relativesOf(s, [2]) },
      { key: 'parents_count', label: 'Հայտարարագրում նշված ծնողներ (տեսակ 1)', get: (s) => relativesOf(s, [1]) },
      { key: 'siblings_count', label: 'Հայտարարագրում նշված եղբայրներ և քույրեր (տեսակ 3, 4)', get: (s) => relativesOf(s, [3, 4]) },
      { key: 'relatives_count', label: 'Հայտարարագրում նշված մերձավոր ազգականներ՝ ծնողներ + եղբայրներ/քույրեր (տեսակ 1, 3, 4)', get: (s) => relativesOf(s, [1, 3, 4]) },
      { key: 'inlaws_count', label: 'Հայտարարագրում նշված խնամիներ՝ ամուսնու ծնողներ (տեսակ 5)', get: (s) => relativesOf(s, [5]) },
      { key: 'is_published', label: 'Հայտարարագիրը ներկայացված (հրապարակված) է (1/0). «Հայտարարագիր չկա» տողի համար՝ 0', get: (s) => (penaltyCheckOf(s).status === 'published' ? 1 : 0) },
      { key: 'year', label: 'Հաշվետու տարի', get: (s) => s.year },
    ],
    ext: [
      { key: 'pek_income_year', service: 'pek', label: 'ՊԵԿ. աշխատավարձ և քաղաքացիաիրավական եկամուտ հաշվետու տարում (հաշվարկի անձանց գումար)',
        get: (s, x) => sumExt(s.profiles, (pid) => { const ssn = ssnOf(pid); if (!ssn) return 0; const r = x.get('pekIncomeForYear', ssn, s.year); x.snap(r.snapshot); return r.value; }) },
      { key: 'cadastre_owned_count', service: 'cadastre', label: 'Կադաստր. սեփականության իրավունքով գույքերի քանակ տարեվերջին',
        get: (s, x) => sumExt(s.profiles, (pid) => { const ssn = ssnOf(pid); if (!ssn) return 0; const r = x.get('cadastreOwnedCount', ssn, `${s.year}-12-31`); x.snap(r.snapshot); return r.value; }) },
      { key: 'vehicles_count', service: 'police', label: 'ՃՈ. հաշվառված տրանսպորտային միջոցների քանակ տարեվերջին',
        get: (s, x) => sumExt(s.profiles, (pid) => { const ssn = ssnOf(pid); if (!ssn) return 0; const r = x.get('policeVehiclesCount', ssn, `${s.year}-12-31`); x.snap(r.snapshot); return r.value; }) },
      { key: 'civil_spouse_count', service: 'civil', label: 'ՔԿԱԳ. ամուսին/կին (ընթացիկ, մինչև հաշվետու տարվա վերջը)',
        get: (s, x) => civilKinshipOfScope(s, x).spouses.length },
      { key: 'civil_children_count', service: 'civil', label: 'ՔԿԱԳ. երեխաների քանակ (ծննդյան ակտերով, մինչև հաշվետու տարվա վերջը)',
        get: (s, x) => civilKinshipOfScope(s, x).children.length },
      { key: 'civil_family_count', service: 'civil', label: 'ՔԿԱԳ. ընտանիքի անդամներ՝ ամուսին/կին + երեխաներ',
        get: (s, x) => civilKinshipOfScope(s, x).civil.family },
      { key: 'civil_parents_count', service: 'civil', label: 'ՔԿԱԳ. ծնողներ (հայտարարատուի ծննդյան ակտից)',
        get: (s, x) => civilKinshipOfScope(s, x).civil.parents },
      { key: 'civil_siblings_count', service: 'civil', label: 'ՔԿԱԳ. եղբայրներ և քույրեր (ծնողների ծննդյան ակտերով)',
        get: (s, x) => civilKinshipOfScope(s, x).civil.siblings },
      { key: 'civil_relatives_count', service: 'civil', label: 'ՔԿԱԳ. մերձավոր ազգականներ՝ ծնողներ + եղբայրներ/քույրեր',
        get: (s, x) => civilKinshipOfScope(s, x).civil.relatives },
      { key: 'civil_inlaws_count', service: 'civil', label: 'ՔԿԱԳ. խնամիներ՝ ամուսնու/կնոջ ծնողներ',
        get: (s, x) => civilKinshipOfScope(s, x).civil.inlaws },
      { key: 'penalty_late_count', service: 'penalties', label: 'Տույժեր. անձի հայտարարագրեր (ցանկացած տեսակի, այս և նախորդ տարիների), որոնք ներկայացվել են վարչական տույժից հետո',
        get: (s) => penaltiesLoaded(s).late.length },
      { key: 'penalty_unsubmitted_count', service: 'penalties', label: 'Տույժեր. անձի հայտարարագրեր (ցանկացած տեսակի, այս և նախորդ տարիների), որոնք չեն ներկայացվել նույնիսկ վարչական տույժից հետո',
        get: (s) => penaltiesLoaded(s).unsubmitted.length },
    ],
  },
  gifts: {
    levels: { gift: 'Նվերի ձևաթուղթ' },
    doc: [
      { key: 'amount_amd', label: 'Նվերի արժեքը ՀՀ դրամով', get: (g) => g.gift.amount_amd },
      { key: 'count_year', label: 'Ստացողի նվերների քանակ ստացման տարում', get: (g) => g.agg.countYear },
      { key: 'count_prev_year', label: 'Ստացողի նվերների քանակ նախորդ տարում', get: (g) => g.agg.countPrevYear },
      { key: 'value_year', label: 'Ստացողի նվերների արժեք ստացման տարում', get: (g) => g.agg.valueYear },
      { key: 'value_prev_year', label: 'Ստացողի նվերների արժեք նախորդ տարում', get: (g) => g.agg.valuePrevYear },
      { key: 'giver_is_legal', label: 'Նվիրատուն իրավաբանական անձ է (1/0)', get: (g) => (g.gift.givertype === 2 ? 1 : 0) },
      { key: 'peer_min', label: 'Նույն պաշտոնի տեսակի և ենթադասակարգման նվազագույն արժեք (տարում)', get: (g) => g.agg.peerMin || 0 },
      { key: 'year', label: 'Ստացման տարի', get: (g) => g.gift.receiptyear },
    ],
    ext: [],
  },
  parties: {
    levels: { person: 'Ֆիզիկական անձ (վճարող)', report: 'Կուսակցության հաշվետվություն' },
    doc: [
      { key: 'total_payments', level: 'person', label: 'Անձի վճարումների ընդհանուր գումար (բոլոր կուսակցություններ)', get: (p) => p.total },
      { key: 'monetary_donations', level: 'person', label: 'Դրամական նվիրատվություններ', get: (p) => p.sumBy.monetary || 0 },
      { key: 'nonmonetary_donations', level: 'person', label: 'Ոչ դրամական նվիրատվություններ', get: (p) => p.sumBy.nonmonetary || 0 },
      { key: 'membership_fees', level: 'person', label: 'Անդամավճարներ', get: (p) => p.sumBy.membership || 0 },
      { key: 'entry_fees', level: 'person', label: 'Մուտքի վճարներ', get: (p) => p.sumBy.entry || 0 },
      { key: 'parties_count', level: 'person', label: 'Կուսակցությունների քանակ, որոնց վճարել է', get: (p) => new Set(p.payments.map((x) => x.partyId)).size },
      { key: 'has_identifier', level: 'person', label: 'identitydocumentnumber լրացված է (1/0)', get: (p) => (p.identifier ? 1 : 0) },
      { key: 'cash_begin', level: 'report', label: 'Դրամական միջոցների մնացորդ տարվա սկզբին', get: (r) => r.cashflow?.amountatbeginningofyear || 0 },
      { key: 'incomes_total', level: 'report', label: 'Ընդամենը դրամական մուտքեր', get: (r) => r.incomesTotal },
      { key: 'expenditures_total', level: 'report', label: 'Ընդամենը դրամական ելքեր (monetaryexpenditurestotal)', get: (r) => r.cashflow?.monetaryexpenditurestotal || 0 },
      { key: 'amount_correction', level: 'report', label: 'amountcorrection (ենթադրաբար՝ փոխարժեքային տարբերություններ)', get: (r) => r.cashflow?.amountcorrection || 0 },
      { key: 'nonmonetary_total', level: 'report', label: 'Ոչ դրամական մուտքերի ընդամենը (nonmonetaryincomestotal)', get: (r) => r.totals?.nonmonetaryincomestotal || 0 },
    ],
    ext: [
      { key: 'bpr_name_match', level: 'person', service: 'bpr', label: 'ԲՊՌ. անուն-ազգանունը համընկնում է (1/0)',
        get: (p, x) => {
          if (!p.identifier) throw new NotEvaluated('identitydocumentnumber դատարկ է');
          const r = x.get('bprIdentify', p.identifier); x.snap(r.snapshot);
          if (!r.value.foundBy) throw new NotEvaluated('ԲՊՌ-ում չի գտնվել');
          const bn = `${r.value.firstName} ${r.value.lastName}`.toLocaleLowerCase('hy').split(' ').sort().join(' ');
          return p.names.every((n) => n.toLocaleLowerCase('hy').split(/\s+/).sort().join(' ') === bn) ? 1 : 0;
        } },
      { key: 'bpr_is_dead', level: 'person', service: 'bpr', label: 'ԲՊՌ. անձը մահացած է (1/0)',
        get: (p, x) => {
          if (!p.identifier) throw new NotEvaluated('identitydocumentnumber դատարկ է');
          const r = x.get('bprIdentify', p.identifier); x.snap(r.snapshot);
          if (!r.value.foundBy) throw new NotEvaluated('ԲՊՌ-ում չի գտնվել');
          return r.value.isDead ? 1 : 0;
        } },
      { key: 'pek_income_year', level: 'person', service: 'pek', label: 'ՊԵԿ. աշխատավարձ և քաղաքացիաիրավական եկամուտ հաշվետու տարում',
        get: (p, x) => {
          if (!p.identifier) throw new NotEvaluated('identitydocumentnumber դատարկ է');
          const r = x.get('pekIncomeForYear', p.identifier, p.year); x.snap(r.snapshot); return r.value;
        } },
    ],
  },
  integrity: {
    levels: { questionnaire: 'Հարցաթերթիկ' },
    doc: [
      { key: 'cash_total', label: 'Կանխիկ՝ թեկնածու և ընտանիքի անդամներ (ՀՀ դրամ)', get: (q) => q.rows('de_integrityfinancialmeanscash').reduce((s, r) => s + (amd(r, 'amount') || 0), 0) },
      { key: 'admin_count', label: 'Վարչական պատասխանատվությունների քանակ', get: (q) => q.rows('de_integrityliabilityadministrative').length },
      { key: 'civil_count', label: 'Քաղաքացիական գործերի քանակ', get: (q) => q.rows('de_integrityliabilitycivilcaseparticipation').length },
      { key: 'has_disciplinary', label: 'Կարգապահական պատասխանատվություն (1/0)', get: (q) => (isYes(q.liability?.havedisciplinaryliabilities) ? 1 : 0) },
      { key: 'has_criminal', label: 'Քրեական պատասխանատվություն (1/0)', get: (q) => (isYes(q.liability?.havecriminalliabilities) ? 1 : 0) },
      { key: 'has_conviction', label: 'Դատվածություն (1/0)', get: (q) => (isYes(q.liability?.haveconviction) ? 1 : 0) },
      { key: 'has_administrative', label: 'Վարչական պատասխանատվություն (1/0)', get: (q) => (isYes(q.liability?.haveadministrativeliabilities) ? 1 : 0) },
      { key: 'has_civil', label: 'Քաղաքացիական գործեր (1/0)', get: (q) => (isYes(q.liability?.havecivilcaseparticipation) ? 1 : 0) },
      { key: 'is_declarant', label: 'Թեկնածուն հայտարարատու է (1/0)', get: (q) => (q.declarations.length ? 1 : 0) },
    ],
    ext: [
      { key: 'pek_income_prev_year', service: 'pek', label: 'ՊԵԿ. թեկնածուի եկամուտը ներկայացման նախորդ տարում',
        get: (q, x) => { const ssn = ssnOf(q.integrity.originalprofile); const r = x.get('pekIncomeForYear', ssn, q.integrity.year - 1); x.snap(r.snapshot); return r.value; } },
      { key: 'cadastre_owned_count', service: 'cadastre', label: 'Կադաստր. թեկնածուի սեփականության գույքերի քանակ',
        get: (q, x) => { const ssn = ssnOf(q.integrity.originalprofile); const r = x.get('cadastreOwnedCount', ssn, q.integrity.submissiondate); x.snap(r.snapshot); return r.value; } },
      { key: 'vehicles_count', service: 'police', label: 'ՃՈ. թեկնածուի հաշվառված տրանսպորտային միջոցների քանակ',
        get: (q, x) => { const ssn = ssnOf(q.integrity.originalprofile); const r = x.get('policeVehiclesCount', ssn, q.integrity.submissiondate); x.snap(r.snapshot); return r.value; } },
    ],
  },
};

/** Կառուցիչի օրինակներ (չեն պահվում որպես կանոն, միայն լրացնում են ձևը) */
/**
 * Փաստաթղթի փոփոխականների երկու խումբ (կառուցիչ, COM-01, COM-04).
 *   • պարզ՝ փաստաթղթի մեկ դաշտ (source՝ EPD դաշտը)
 *   • բարդ՝ հաշվարկվում է փաստաթղթի (կամ մի քանի փաստաթղթերի) տարբեր դաշտերից/տողերից (գումար, քանակ, բանաձև)
 * Նշված չլինող փոփոխականները բարդ են։
 */
const SIMPLE_FIELDS = {
  declarations: { year: 'de_declaration.year', is_published: 'de_declaration.wfstateid (7՝ հրապարակված)' },
  gifts: { amount_amd: 'de_gift.amount (ՀՀ դրամով՝ պահված փոխարժեքով)', giver_is_legal: 'de_gift.givertype (2՝ իրավաբանական անձ)', year: 'de_gift.receiptyear' },
  parties: { has_identifier: 'identitydocumentnumber', cash_begin: 'amountatbeginningofyear', expenditures_total: 'monetaryexpenditurestotal', amount_correction: 'amountcorrection', nonmonetary_total: 'nonmonetaryincomestotal' },
  integrity: { has_disciplinary: 'havedisciplinaryliabilities', has_criminal: 'havecriminalliabilities', has_conviction: 'haveconviction', has_administrative: 'haveadministrativeliabilities', has_civil: 'havecivilcaseparticipation' },
};
for (const [dir, M] of Object.entries(METRICS)) for (const m of M.doc) {
  if (dir === 'declarations' && DEFAULT_FORMULAS[m.key]) m.editableFormula = true; // 4.1-ի բանաձևով փոփոխական (խմբագրելի)
  const src = SIMPLE_FIELDS[dir]?.[m.key] || m.source;
  m.kind = src ? 'simple' : 'complex';
  if (src) m.source = src;
}

export const BUILDER_EXAMPLES = {
  declarations: { title: 'Կադաստրում գրանցված գույքերի քանակը գերազանցում է հայտարարագրվածը (օրինակ)', expression: 'ext.cadastre_owned_count > doc.realestate_count' },
  gifts: { title: 'Իրավաբանական անձից 500 000 դրամից ավել նվեր, երբ աշխատել է նաև աճի կանոնը (օրինակ)', expression: 'doc.giver_is_legal == 1 and doc.amount_amd > 500000 and (rule.GIF_R2 or rule.GIF_R3)' },
  parties: { title: 'Մահացած անձի անունից վճարում (օրինակ)', expression: 'ext.bpr_is_dead == 1', level: 'person' },
  integrity: { title: 'Կանխիկը գերազանցում է ՊԵԿ-ի տվյալով նախորդ տարվա եկամտի կեսը (COM-04 օրինակ)', expression: 'doc.cash_total > 0.5 * ext.pek_income_prev_year' },
};
