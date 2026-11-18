/**
 * Հայտարարագրերի կանոններ — SRS բաժին 4։
 * Գնահատման միավոր՝ «շրջանակ» (scope). հայտարարատուի առանձին հաշվարկ կամ ընդհանուր ընտանիքի կազմ (DEC-04)։
 * Քաշերը կարգավորվում են «Կանոններ» էջում (բաժին 9՝ «հայտարարագրերի չափորոշիչների քաշեր»)։
 */
import { v, fired, notFired } from './common.js';
import { EXPENSE_LABELS } from '../engine/annualExpense.js';

export const declarationRules = [
  {
    id: 'DEC-R1',
    direction: 'declarations',
    title: 'Ընթացիկ ծախսը բացասական է կամ ցածր է կենսաապահովման նվազագույն բյուջեից',
    criterion: 'Տարվա ընթացիկ ծախսը բացասական է կամ մոտ է (կամ ցածր է) կենսաապահովման նվազագույն բյուջեից. հայտարարագրված եկամուտները չեն բացատրում ծախսերը',
    srsRef: 'Բաժին 4, չափորոշիչ 1 (քաշ 30)',
    requirements: ['DEC-01', 'DEC-02', 'DEC-04', 'DEC-06', 'DEC-08', 'DEC-11', 'COM-18'],
    weight: 30,
    params: [{ key: 'budget', label: 'Կենսաապահովման նվազագույն բյուջե (1 անձ, ամսական)', unit: 'AMD', default: { var: 'min_living_budget' } }],
    caveats: [
      '«Մոտ է» պայմանը չի իրականացված. մոտիկության շեմը SRS-ում սահմանված չէ',
      'Բյուջեի արժեքը SRS-ում տրված չէ («ԿԿՀ-ից»). մինչև արժեքի մուտքագրումը կանոնը «չի գնահատվել»',
      'Բյուջեն համեմատվում է միջին ամսական ծախսի (ՄԱԾ) հետ՝ բազմապատկած անձանց թվով (DEC-02)',
    ],
    evaluate(scope, api) {
      const budget = api.param('budget');
      const e = scope.exp;
      const limit = budget * scope.persons;
      const values = [
        v.amd(EXPENSE_LABELS.Ds, e.Ds), v.amd(EXPENSE_LABELS.E, e.E), v.amd(EXPENSE_LABELS.G, e.G), v.amd(EXPENSE_LABELS.Dv, e.Dv),
        v.amd(EXPENSE_LABELS.Ps, e.Ps), v.amd(EXPENSE_LABELS.Pv, e.Pv), v.amd(EXPENSE_LABELS.C, e.C), v.amd(EXPENSE_LABELS.annual, e.annual),
        v.amd(EXPENSE_LABELS.monthly, e.monthly), v.amd('Կենսաապահովման նվազագույն բյուջե (1 անձ)', budget), v.num('Անձանց թիվ', scope.persons),
        v.amd('Համեմատման սահման (բյուջե × անձանց թիվ)', limit),
      ];
      if (e.annual < 0) return fired(values, `Ընթացիկ տարեկան ծախսը բացասական է (${Math.round(e.annual).toLocaleString('hy-AM')} ֏)`);
      if (e.monthly < limit) return fired(values, `Միջին ամսական ծախսը (${Math.round(e.monthly).toLocaleString('hy-AM')} ֏) ցածր է կենսաապահովման նվազագույն բյուջեից (${Math.round(limit).toLocaleString('hy-AM')} ֏)`);
      return notFired(values, 'Միջին ամսական ծախսը չի զիջում կենսաապահովման նվազագույն բյուջեին');
    },
  },
];

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
