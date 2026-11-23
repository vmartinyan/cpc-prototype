/**
 * Նվերների ձևաթղթերի կանոններ — SRS բաժին 6։ Կանոնները քաշ չունեն (GIF-03, COM-18)։
 * Գնահատման միավոր՝ նվերի ձևաթուղթ։ Ագրեգատները (քանակ, արժեք ըստ տարվա) հաշվարկվում են
 * նույն ստացողի (originalprofile) բոլոր ձևաթղթերով (GIF-01)։
 */
import { v, fired, notFired, notApplicable, normName, samePersonName } from './common.js';
import { NotEvaluated } from '../engine/expression.js';
import { lk, PERSON_TYPE } from '../data/epd/classifiers.js';
import { CURRENCY_CODE } from '../data/epd/exchangeRates.js';

export const giftRules = [
  {
    id: 'GIF-R1',
    direction: 'gifts',
    title: 'Խոշոր արժեքի նվեր',
    criterion: 'Նվերի արժեքը գերազանցում է 1 մլն ՀՀ դրամը (կամ համարժեք արտարժույթը)',
    srsRef: 'Բաժին 6, կանոն «Խոշոր արժեքի նվեր» (ազդակ i)',
    requirements: ['GIF-01', 'GIF-02', 'GIF-03'],
    builderExpression: 'doc.amount_amd > var.gift_large_threshold',
    params: [{ key: 'threshold', label: 'Շեմ', unit: 'AMD', default: { var: 'gift_large_threshold' } }],
    evaluate(g, api) {
      const t = api.param('threshold');
      const values = [v.amd('Նվերի արժեքը (de_gift.amount_amd)', g.gift.amount_amd), v.amd('Շեմ', t)];
      if (g.gift.amount_currencyid !== 2) values.push(v.text('Սկզբնական արժույթ (amount_*)', `${g.gift.amount_amount} ${CURRENCY_CODE[g.gift.amount_currencyid]} × ${g.gift.amount_ratetodefault}`));
      return g.gift.amount_amd > t ? fired(values, 'Նվերի արժեքը գերազանցում է շեմը') : notFired(values, 'Նվերի արժեքը չի գերազանցում շեմը');
    },
  },
  {
    id: 'GIF-R2',
    direction: 'gifts',
    title: 'Նվերների քանակի աճ',
    criterion: 'Նույն պաշտոնատար անձի նվերների քանակը ընթացիկ տարում՝ նախորդ տարվա համեմատ (օր.՝ 30 նվեր 10-ի փոխարեն)',
    srsRef: 'Բաժին 6, կանոն «Նվերների քանակի աճ» (ազդակ ii)',
    requirements: ['GIF-01', 'GIF-03', 'COM-04'],
    builderExpression: 'doc.count_prev_year > 0 and doc.count_year / doc.count_prev_year >= var.gift_count_growth',
    params: [{ key: 'ratio', label: 'Աճի շեմ (ընթացիկ/նախորդ)', unit: 'անգամ', default: { var: 'gift_count_growth' } }],
    caveats: ['Շեմը մեկնաբանված է որպես հարաբերակցություն (30/10 = 3). եթե նախորդ տարում նվեր չկա, համեմատություն չի կատարվում'],
    evaluate(g, api) {
      const ratio = api.param('ratio');
      const cur = g.agg.countYear;
      const prev = g.agg.countPrevYear;
      const values = [v.num(`Նվերների քանակ ${g.gift.receiptyear}`, cur), v.num(`Նվերների քանակ ${g.gift.receiptyear - 1}`, prev), v.num('Աճի շեմ', ratio, 'անգամ')];
      if (!prev) return notFired(values, 'Նախորդ տարում նվեր չկա. աճի հարաբերակցությունը հնարավոր չէ հաշվել');
      values.push(v.num('Հարաբերակցություն', +(cur / prev).toFixed(2), 'անգամ'));
      return cur / prev >= ratio ? fired(values, `Նվերների քանակն աճել է ${(cur / prev).toFixed(2)} անգամ`) : notFired(values, 'Քանակի աճը շեմից ցածր է');
    },
  },
  {
    id: 'GIF-R3',
    direction: 'gifts',
    title: 'Նվերների արժեքի աճ',
    criterion: 'Նույն պաշտոնատար անձի նվերների ընդհանուր արժեքը ընթացիկ տարում՝ նախորդ տարվա համեմատ (օր.՝ 3 մլն՝ 500 հազարի փոխարեն)',
    srsRef: 'Բաժին 6, կանոն «Նվերների արժեքի աճ» (ազդակ ii)',
    requirements: ['GIF-01', 'GIF-03', 'COM-04'],
    builderExpression: 'doc.value_prev_year > 0 and doc.value_year / doc.value_prev_year >= var.gift_value_growth',
    params: [{ key: 'ratio', label: 'Աճի շեմ (ընթացիկ/նախորդ)', unit: 'անգամ', default: { var: 'gift_value_growth' } }],
    caveats: ['Շեմը մեկնաբանված է որպես հարաբերակցություն (3 մլն/500 հազար = 6)'],
    evaluate(g, api) {
      const ratio = api.param('ratio');
      const cur = g.agg.valueYear;
      const prev = g.agg.valuePrevYear;
      const values = [v.amd(`Նվերների արժեք ${g.gift.receiptyear}`, cur), v.amd(`Նվերների արժեք ${g.gift.receiptyear - 1}`, prev), v.num('Աճի շեմ', ratio, 'անգամ')];
      if (!prev) return notFired(values, 'Նախորդ տարում նվեր չկա. աճի հարաբերակցությունը հնարավոր չէ հաշվել');
      values.push(v.num('Հարաբերակցություն', +(cur / prev).toFixed(2), 'անգամ'));
      return cur / prev >= ratio ? fired(values, `Նվերների արժեքն աճել է ${(cur / prev).toFixed(2)} անգամ`) : notFired(values, 'Արժեքի աճը շեմից ցածր է');
    },
  },
  {
    id: 'GIF-R4',
    direction: 'gifts',
    title: 'Անսովոր արժեք նույն մակարդակի պաշտոնյաների համեմատ',
    criterion: 'Նույն պաշտոնի տեսակի և ենթադասակարգման՝ տվյալ տարվա նվերների նվազագույն արժեքը (0 և null բացառված) ռեֆերենս է. նվերը ռիսկային է, եթե արժեքը գերազանցում է ռեֆերենսը սահմանված բազմապատիկից ավելի',
    srsRef: 'Բաժին 6, կանոն «Անսովոր օրինաչափություն նույն մակարդակի պաշտոնյաների համեմատ» (ազդակ ii)',
    requirements: ['GIF-01', 'GIF-03', 'COM-04'],
    params: [{ key: 'mult', label: 'Նվազագույն արժեքի բազմապատկիչ', unit: 'անգամ', default: { var: 'gift_unusual_mult' } }],
    caveats: ['Բազմապատկիչի արժեքը SRS-ում սահմանված չէ. մինչև մուտքագրումը կանոնը «չի գնահատվել»', 'Պաշտոնի տեսակը վերցվում է նվերի պրոֆիլից (profile), Q-20, Q-39'],
    evaluate(g, api) {
      const mult = api.param('mult');
      const pt = g.positiontype;
      if (!g.gift.giftsubclassification) return notApplicable('Նվերի ենթադասակարգումը նշված չէ (այն սահմանված է միայն 1 և 2 դասակարգումների համար)');
      if (!pt) throw new NotEvaluated('Ստացողի պաշտոնի տեսակը լրացված չէ (Q-20)');
      const ref = g.agg.peerMin;
      const values = [
        v.text('Պաշտոնի տեսակ (profile.positiontype)', lk('c_positiontype', pt)),
        v.text('Ենթադասակարգում', lk('c_giftsubclassification', g.gift.giftsubclassification)),
        v.num('Համեմատվող նվերների քանակ', g.agg.peerCount),
        v.amd('Ռեֆերենս արժեք (նվազագույն)', ref),
        v.num('Բազմապատկիչ', mult, 'անգամ'),
        v.amd('Նվերի արժեքը', g.gift.amount_amd),
      ];
      if (!ref) return notFired(values, 'Համեմատվող նվերներ (0-ից տարբեր արժեքով) չկան');
      return g.gift.amount_amd > mult * ref
        ? fired(values, `Նվերի արժեքը ${(g.gift.amount_amd / ref).toFixed(1)} անգամ գերազանցում է ռեֆերենս արժեքը`)
        : notFired(values, 'Արժեքը չի գերազանցում ռեֆերենս արժեքի բազմապատիկը');
    },
  },
  {
    id: 'GIF-R6',
    direction: 'gifts',
    title: 'Նվիրատու կազմակերպություն՝ պայմանագրային հարաբերություններով',
    criterion: 'Նվիրատուի անվանումը համընկնում է ստացողի հայտարարագրերում նշված 5 մլն դրամից ավել պայմանագրի կողմի անվանման հետ',
    srsRef: 'Բաժին 6, կանոն «Նվիրատու կազմակերպություն՝ պայմանագրային հարաբերություններով» (ազդակ iv)',
    requirements: ['GIF-01', 'GIF-03'],
    params: [],
    caveats: ['Համադրումը ճշգրիտ է (փոքրատառ, առանց չակերտների և ավելորդ բացատների). գրելաձևերի տարբերությունները հաշվի չեն առնվում (Q-41)'],
    evaluate(g) {
      const giver = g.gift.giverlegalentityname || g.gift.givername;
      const contracts = g.recipientContracts.filter((c) => Number(c.cost) > 5000000);
      const match = contracts.filter((c) => normName(c.counterpartname) === normName(giver));
      const values = [
        v.text('Նվիրատու', giver),
        v.text('Ստացողի 5 մլն-ից ավել պայմանագրերի կողմեր', contracts.map((c) => `${c.counterpartname} (${Number(c.cost).toLocaleString('hy-AM')} ֏, ${c.contractsigndate})`).join('; ') || '—'),
      ];
      return match.length ? fired(values, `Նվիրատուն համընկնում է պայմանագրի կողմի հետ՝ ${match[0].counterpartname}`) : notFired(values, 'Համընկնում չկա');
    },
  },
  {
    id: 'GIF-R7',
    direction: 'gifts',
    title: 'Փոխկապակցված նվիրատու',
    criterion: 'Ֆիզիկական անձ նվիրատուի անուն-ազգանունը համընկնում է ստացողի ընտանիքի անդամի կամ մերձավոր ազգականի անուն-ազգանվան հետ',
    srsRef: 'Բաժին 6, կանոն «Փոխկապակցված նվիրատու» (ազդակ v)',
    requirements: ['GIF-01', 'GIF-03'],
    params: [],
    caveats: ['Համադրումը անուն-ազգանվամբ է (ճշգրիտ, անկախ հերթականությունից). ՀԾՀ, հայրանուն և ծննդյան ամսաթիվ նվիրատուի համար չկան (Q-41)'],
    evaluate(g) {
      if (g.gift.givertype !== PERSON_TYPE.individual) return notFired([v.text('Նվիրատուի տեսակ', 'Իրավաբանական անձ')], 'Նվիրատուն ֆիզիկական անձ չէ');
      const people = g.recipientRelated;
      const match = people.find((p) => samePersonName(p.name, g.gift.givername));
      const values = [v.text('Նվիրատու', g.gift.givername), v.text('Ստացողի ընտանիքի անդամներ և ազգականներ', people.map((p) => `${p.name} (${p.relation})`).join('; ') || '—')];
      return match ? fired(values, `Նվիրատուն համընկնում է՝ ${match.name} (${match.relation})`) : notFired(values, 'Համընկնում չկա');
    },
  },
];
