/**
 * Կանոնների կառուցիչի համար հասանելի փոփոխականներ (COM-01, COM-04, COM-09)։
 *   doc.* — փաստաթղթի դաշտեր և ագրեգատներ
 *   ext.* — արտաքին համակարգերի տվյալներ (միայն այն, ինչը SRS 11.1-ում «Կա» է). ադապտերով, քեշով (COM-13, COM-14)
 * Բացի այդ, կառուցիչում հասանելի են sum/count/min/max/avg ագրեգատները EPD աղյուսակների վրա (directionTables)։
 */
import { NotEvaluated } from './expression.js';
import { byInstance, amd, isYes } from '../data/epd/repository.js';

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

function sumExt(ids, fn) {
  return ids.reduce((s, id) => s + fn(id), 0);
}

export const METRICS = {
  declarations: {
    levels: { scope: 'Հայտարարագիր (առանձին և ընտանիքի կազմով հաշվարկ)' },
    doc: [
      { key: 'money_start', label: 'Դս — դրամական միջոցներ տարեսկզբին', get: (s) => s.exp.Ds },
      { key: 'money_end', label: 'Դվ — դրամական միջոցներ տարեվերջին', get: (s) => s.exp.Dv },
      { key: 'income', label: 'Ե — տարվա եկամուտներ', get: (s) => s.exp.E },
      { key: 'acquisitions', label: 'Գ — ձեռք բերված գույք', get: (s) => s.exp.G },
      { key: 'loans_deposits_start', label: 'Փս — փոխառություններ և ավանդներ տարեսկզբին', get: (s) => s.exp.Ps },
      { key: 'loans_deposits_end', label: 'Փվ — փոխառություններ և ավանդներ տարեվերջին', get: (s) => s.exp.Pv },
      { key: 'expense_annual', label: 'ԸՏԾ — ընթացիկ տարեկան ծախս', get: (s) => s.exp.annual },
      { key: 'expense_monthly', label: 'ՄԱԾ — միջին ամսական ծախս', get: (s) => s.exp.monthly },
      { key: 'cash_start', label: 'Կանխիկ տարեսկզբին', get: (s) => s.exp.cashStart },
      { key: 'cash_end', label: 'Կանխիկ տարեվերջին', get: (s) => s.exp.cashEnd },
      { key: 'salary_income', label: 'Հայտարարագրված աշխատավարձ', get: (s) => s.exp.salary },
      { key: 'declared_expenses', label: 'Հայտարարագրված ծախսեր', get: (s) => s.exp.declaredExpenses },
      { key: 'alienations', label: 'Օտարված գույքի գումար', get: (s) => s.exp.alienations },
      { key: 'realestate_count', label: 'Հայտարարագրված անշարժ գույքերի քանակ (առկա և ձեռք բերված)', get: (s) => s.exp.realestateOwned },
      { key: 'vehicle_count', label: 'Հայտարարագրված տրանսպորտային միջոցների քանակ (առկա և ձեռք բերված)', get: (s) => s.exp.vehiclesOwned },
      { key: 'persons', label: 'Անձանց թիվ հաշվարկում', get: (s) => s.persons },
      { key: 'year', label: 'Հաշվետու տարի', get: (s) => s.year },
    ],
    ext: [
      { key: 'pek_income_year', service: 'pek', label: 'ՊԵԿ. աշխատավարձ և քաղաքացիաիրավական եկամուտ հաշվետու տարում (հաշվարկի անձանց գումար)',
        get: (s, x) => sumExt(s.profiles, (pid) => { const ssn = ssnOf(pid); if (!ssn) return 0; const r = x.get('pekIncomeForYear', ssn, s.year); x.snap(r.snapshot); return r.value; }) },
      { key: 'cadastre_owned_count', service: 'cadastre', label: 'Կադաստր. սեփականության իրավունքով գույքերի քանակ տարեվերջին',
        get: (s, x) => sumExt(s.profiles, (pid) => { const ssn = ssnOf(pid); if (!ssn) return 0; const r = x.get('cadastreOwnedCount', ssn, `${s.year}-12-31`); x.snap(r.snapshot); return r.value; }) },
      { key: 'vehicles_count', service: 'police', label: 'ՃՈ. հաշվառված տրանսպորտային միջոցների քանակ տարեվերջին',
        get: (s, x) => sumExt(s.profiles, (pid) => { const ssn = ssnOf(pid); if (!ssn) return 0; const r = x.get('policeVehiclesCount', ssn, `${s.year}-12-31`); x.snap(r.snapshot); return r.value; }) },
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
export const BUILDER_EXAMPLES = {
  declarations: { title: 'Կադաստրում գրանցված գույքերի քանակը գերազանցում է հայտարարագրվածը (օրինակ)', expression: 'ext.cadastre_owned_count > doc.realestate_count' },
  gifts: { title: 'Իրավաբանական անձից 500 000 դրամից ավել նվեր, երբ աշխատել է նաև աճի կանոնը (օրինակ)', expression: 'doc.giver_is_legal == 1 and doc.amount_amd > 500000 and (rule.GIF_R2 or rule.GIF_R3)' },
  parties: { title: 'Մահացած անձի անունից վճարում (օրինակ)', expression: 'ext.bpr_is_dead == 1', level: 'person' },
  integrity: { title: 'Կանխիկը գերազանցում է ՊԵԿ-ի տվյալով նախորդ տարվա եկամտի կեսը (COM-04 օրինակ)', expression: 'doc.cash_total > 0.5 * ext.pek_income_prev_year' },
};
