/**
 * Կուսակցությունների հաշվետվությունների կանոններ — SRS բաժին 5։
 *
 * ԲԱԺԻՆ 5-Ը ՆԱԽՆԱԿԱՆ Է և կարող է փոխվել ԿԿՀ-ի հետ քննարկումներից հետո։ Ուստի այս ուղղության
 * ամբողջ «քաղաքականությունը» հավաքված է այս ֆայլում.
 *   • PARTY_POLICY — ինչ աղյուսակներից է կազմվում ֆիզիկական անձանց ցանկը, ինչպես են միավորվում
 *     նույն անձի վճարումները, ինչն է համարվում ռիսկային կուսակցություն, որ հաշվետվություններն են վերլուծվում
 *   • partyRules — կանոնները (ֆիզիկական անձի և հաշվետվության մակարդակի)
 * Նոր կանոն կարելի է ավելացնել նաև առանց ծրագրավորման՝ «Կանոններ → Կառուցիչ» էջով (COM-01)։
 * Կանոնները քաշ չունեն (PAR-03, Q-42)։
 */
import { v, fired, notFired, samePersonName } from './common.js';
import { NotEvaluated } from '../engine/expression.js';

export const PARTY_POLICY = {
  /** Վերլուծվող հաշվետվություններ (PAR-01). տեսակը և կարգավիճակը ճշտվում են (Q-42) */
  reportFilter: (r) => r.reporttype === 2, // ընթացիկ տարբերակ (publisheditem) + տարեկան. նախնականը (1) չի վերլուծվում
  /**
   * Ֆիզիկական անձանց ցանկի աղբյուրներ (PAR-02) և կանոն 1-ի գումարի բաղադրիչներ։
   * amountField՝ ՀՀ դրամով գումարի դաշտ։ 1.2 և 1.3 աղյուսակները չեն ներառվում (կրկնակի հաշվարկի հարց, Q-44)։
   * Անհատույց աշխատանքները, անշարժ գույքի օգտագործումը և գույքի գործարքները չեն ներառվում. նույնականացնող տվյալ չունեն
   */
  paymentSources: [
    { table: 'de_reportincomesmonetarydonationsofindividuals', label: 'Դրամական նվիրատվություն (1.1)', amountField: 'amount_amd', kind: 'monetary' },
    { table: 'de_reportincomesothernonmonetarydonations', label: 'Ոչ դրամական նվիրատվություն (2.5)', amountField: 'amount', kind: 'nonmonetary' },
    { table: 'de_reportincomesmembershipfees', label: 'Անդամավճար (3.2)', amountField: 'amount', kind: 'membership' },
    { table: 'de_reportincomesentryfees', label: 'Մուտքի վճար (3.1)', amountField: 'amount', kind: 'entry' },
  ],
  /** Նույն անձի վճարումների միավորման բանալի (PAR-02). identitydocumentnumber, իսկ բացակայության դեպքում՝ անուն-ազգանուն (Q-44) */
  personKey: (row) => {
    const idn = (row.identitydocumentnumber || '').trim();
    if (idn) return `id:${idn}`;
    return `name:${(row.fullname || '').toLocaleLowerCase('hy').split(/\s+/).filter(Boolean).sort().join(' ')}`;
  },
  /** Ռիսկային կուսակցություն (PAR-04). ռիսկային ֆիզիկական անձ կամ հաշվետվության մակարդակի աշխատած կանոն */
  isPartyRisky: ({ riskyPersons, reportFired, manual }) => riskyPersons > 0 || reportFired > 0 || manual > 0,
};

export const partyRules = [
  {
    id: 'PAR-R1',
    direction: 'parties',
    level: 'person',
    title: 'Նվիրատվության առավելագույն չափի գերազանցում',
    criterion: 'Ֆիզիկական անձի կողմից մեկ կամ մի քանի կուսակցություններին հաշվետու տարում կատարված դրամական և ոչ դրամական նվիրատվությունների, անդամավճարների և մուտքի վճարների ընդհանուր չափը գերազանցում է 10 մլն ՀՀ դրամը',
    srsRef: 'Բաժին 5, կանոն 1',
    requirements: ['PAR-01', 'PAR-02', 'PAR-03', 'PAR-05'],
    builderExpression: 'doc.total_payments > var.party_max_donation',
    params: [{ key: 'max', label: 'Նվիրատվության առավելագույն չափ', unit: 'AMD', default: { var: 'party_max_donation' } }],
    caveats: [
      'Միավորումը՝ ըստ identitydocumentnumber, իսկ դատարկ լինելու դեպքում՝ անուն-ազգանվամբ. նույն անձը տարբեր գրառումներում տարբեր կերպ լրացված լինելու դեպքում չի միավորվում (Q-44)',
      '1.2, 1.3 աղյուսակները չեն ներառվում (Q-44). անհատույց աշխատանքները և անշարժ գույքի օգտագործումը չեն ներառվում (նույնականացնող տվյալ չունեն)',
    ],
    evaluate(p, api) {
      const max = api.param('max');
      const byKind = {};
      for (const pay of p.payments) byKind[pay.label] = (byKind[pay.label] || 0) + pay.amount;
      const byParty = {};
      for (const pay of p.payments) byParty[pay.partyName] = (byParty[pay.partyName] || 0) + pay.amount;
      const values = [
        ...Object.entries(byKind).map(([k, s]) => v.amd(k, s)),
        v.text('Ըստ կուսակցությունների', Object.entries(byParty).map(([k, s]) => `${k}՝ ${Math.round(s).toLocaleString('hy-AM')} ֏`).join('; ')),
        v.amd('Ընդհանուր', p.total),
        v.amd('Առավելագույն չափ', max),
      ];
      return p.total > max ? fired(values, `Ընդհանուր չափը (${Math.round(p.total).toLocaleString('hy-AM')} ֏) գերազանցում է առավելագույնը`) : notFired(values, 'Ընդհանուր չափը չի գերազանցում առավելագույնը');
    },
  },
  {
    id: 'PAR-R6',
    direction: 'parties',
    level: 'person',
    title: 'Վճարողի նույնականացում ԲՊՌ-ի տվյալներով',
    criterion: 'Եթե ՀԾՀ-ն առկա չէ, կամ ԲՊՌ-ից ստացված անունը և ազգանունը չեն համընկնում լրացվածի հետ, անձը ռիսկային է',
    srsRef: 'Բաժին 5, կանոն 6',
    requirements: ['PAR-02', 'PAR-03', 'PAR-05', 'COM-09', 'COM-13', 'COM-14', 'COM-16', 'COM-17'],
    params: [],
    external: ['bpr'],
    caveats: [
      'Կանոնի փոփոխականներում ԲՊՌ-ի տվյալը նշված է «սահմանված չէ (Q-43)», սակայն 11.1-ում՝ «Կա», իսկ 11.4-ում՝ «ԲՊՌ-ը բավարար է». նախատիպում իրականացված է mock-ով (կարելի է անջատել)',
      'Հայրանունը չի համեմատվում. EPD-ում հայրանվան դաշտ չկա',
      'identitydocumentnumber-ի տեսակը (ՀԾՀ, փաստաթուղթ, տեղեկանք) որոշվում է ԲՊՌ-ի որոնման արդյունքով (Q-44). ոչ մի որոնմամբ չգտնվելու դեպքում՝ «չի գնահատվել»',
    ],
    evaluate(p, api) {
      if (!p.identifier) return fired([v.text('Լրացված անուն', p.names.join('; ')), v.text('identitydocumentnumber', '— (դատարկ)')], 'ՀԾՀ-ն (կամ նույնականացնող տվյալը) առկա չէ');
      const res = api.ext.get('bprIdentify', p.identifier);
      api.snap(res.snapshot);
      const b = res.value;
      if (!b.foundBy) throw new NotEvaluated(`ԲՊՌ-ում «${p.identifier}» համարով անձ չի գտնվել ո՛չ ՀԾՀ-ով, ո՛չ փաստաթղթի համարով`);
      const bprName = `${b.firstName} ${b.lastName}`;
      const mismatched = p.names.filter((n) => !samePersonName(n, bprName));
      const values = [
        v.text('identitydocumentnumber', p.identifier),
        v.text('Որոնման արդյունք', b.foundBy === 'psn' ? 'Գտնվել է ՀԾՀ-ով (search_by_psn)' : 'Գտնվել է փաստաթղթի համարով (search_by_doc_num)'),
        v.text('Լրացված անուն (EPD)', p.names.join('; ')),
        v.text('ԲՊՌ. անուն, ազգանուն, հայրանուն', `${b.firstName} ${b.lastName} ${b.patronymic}`),
      ];
      const reasons = [];
      if (b.foundBy === 'doc') reasons.push('ՀԾՀ-ն նշված չէ (նշված է անձը հաստատող փաստաթղթի համար)');
      if (mismatched.length) reasons.push(`Անունը/ազգանունը չի համընկնում ԲՊՌ-ի տվյալի հետ (${mismatched.join('; ')} ≠ ${bprName})`);
      return reasons.length ? fired(values, reasons.join('. ')) : notFired(values, 'Անունը և ազգանունը համընկնում են ԲՊՌ-ի տվյալի հետ');
    },
  },
];
