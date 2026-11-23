/**
 * Վարչական տույժեր (արտաքին ֆայլ, COM-11; DEC-R3, DEC-R4; Q-17)։ Տվյալները մշակվում են «Արտաքին ֆայլեր → Տույժեր» էջում
 * (ավելացնել, խմբագրել, հեռացնել), ֆայլով ներմուծումը օժանդակ հնարավորություն է։
 * Օրինակ՝ docs/տույժեր-օրինակ.xlsx. մեկ տող՝ մեկ ՎԻՎ ակտ։ Սյունակները ճանաչվում են ըստ վերնագրի (ոչ թե դիրքի).
 *   ՎԻՎ Ա N · ՎԻՎ Ա ամսաթիվ · Անուն · Ազգանուն · Հայրանուն · ՀԾՀ · Հայտարարատուի տեսակ (Պ/Ա, Ը/Ա, Կ Պ/Ա) ·
 *   Պ/Ա-ի պաշտոն · Տարի · Հայտարարագրի կամ հաշվետվության տեսակ (Տարեկան, Ստանձնելու, Դադարեցնելու, Վերաբերելի չէ) ·
 *   ՎԻՎ հիմք · Մասնագետ · Վարչական ակտ · Որոշման հղում · Որոշման ամսաթիվ
 * Տույժը անձի հետ կապվում է ՀԾՀ-ով, հայտարարագրի հետ՝ ՀԾՀ + տարի + տեսակ (Q-17)։
 * Տույժի կիրառման ամսաթիվ՝ «ՎԻՎ Ա ամսաթիվ» (ԿԿՀ-ի որոշում, Q-17)։
 */
import { DECLARATION_TYPE } from './epd/classifiers.js';

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Սյունակի վերնագիր → դաշտ (համեմատվում է նորմալացված վերնագրի սկիզբը) */
const HEADERS = [
  ['vivNumber', /^ՎԻՎ Ա N$/],
  ['vivDate', /^ՎԻՎ Ա ամսաթիվ/],
  ['firstName', /^Անուն$/],
  ['lastName', /^Ազգանուն$/],
  ['patronymic', /^Հայրանուն$/],
  ['ssn', /^ՀԾՀ$/],
  ['declarantType', /^Հայտարարատուի տեսակ/],
  ['position', /^Պ\/Ա- ?պաշտոն/],
  ['year', /^Տարի$/],
  ['declarationKind', /^Հայտարարագրի/],
  ['basis', /^ՎԻՎ հիմք/],
  ['specialist', /^Մասնագետ/],
  ['act', /^Վարչական ակտ/],
  ['decisionUrl', /^Որոշման հղում/],
  ['decisionDate', /^Որոշման ամսաթիվ/],
];

/** Հայտարարագրի տեսակ ֆայլում → c_declarationtype */
const KIND = { 'տարեկան': DECLARATION_TYPE.yearly, 'ստանձնելու': DECLARATION_TYPE.assumption, 'դադարեցնելու': DECLARATION_TYPE.termination };

/** Excel-ի ամսաթիվ (սերիական համար կամ dd.mm.yyyy / dd/mm/yyyy տեքստ) → YYYY-MM-DD */
export function excelDate(v) {
  const s = norm(v);
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 864e5).toISOString().slice(0, 10);
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/**
 * Տողեր (readXlsx) → տույժերի գրառումներ։ Վերնագրի տողը՝ առաջին տողը, որտեղ կա «ՀԾՀ» սյունակ։
 * Վերադարձնում է { records, missingColumns }. ամեն գրառում ունի issues՝ կապակցման խնդիրներ։
 */
export function parsePenaltyRows(rows) {
  const headerIdx = rows.findIndex((r) => r.some((c) => /^ՀԾՀ$/.test(norm(c))));
  if (headerIdx < 0) throw new Error('Ֆայլում չի գտնվել վերնագրի տող («ՀԾՀ» սյունակով)։ Ստուգեք, որ ֆայլը տույժերի ֆայլի ձևաչափով է');
  const header = rows[headerIdx].map(norm);
  const col = {};
  for (const [key, re] of HEADERS) { const i = header.findIndex((h) => re.test(h)); if (i >= 0) col[key] = i; }
  const missingColumns = HEADERS.filter(([k]) => col[k] === undefined).map(([k]) => k);
  const get = (r, k) => (col[k] === undefined ? '' : norm(r[col[k]]));
  const records = [];
  rows.slice(headerIdx + 1).forEach((r, i) => {
    if (!r.some((c) => norm(c))) return;
    const kindText = get(r, 'declarationKind');
    const rec = {
      row: headerIdx + i + 2,
      vivNumber: get(r, 'vivNumber'),
      vivDate: excelDate(get(r, 'vivDate')),
      firstName: get(r, 'firstName'), lastName: get(r, 'lastName'), patronymic: get(r, 'patronymic'),
      ssn: get(r, 'ssn').replace(/\D/g, ''),
      declarantType: get(r, 'declarantType'),
      position: get(r, 'position'),
      year: /^\d{4}$/.test(get(r, 'year')) ? Number(get(r, 'year')) : null,
      declarationKind: kindText,
      declarationType: KIND[kindText.toLocaleLowerCase('hy')] ?? null,
      basis: get(r, 'basis'),
      specialist: get(r, 'specialist'),
      act: get(r, 'act'),
      decisionUrl: get(r, 'decisionUrl'),
      decisionDate: excelDate(get(r, 'decisionDate')),
    };
    records.push(finalizeRecord(rec));
  });
  return { records, missingColumns };
}

/** Հայտարարագրի տեսակ → ֆայլի տեքստ */
export const KIND_LABEL = { [DECLARATION_TYPE.yearly]: 'Տարեկան', [DECLARATION_TYPE.assumption]: 'Ստանձնելու', [DECLARATION_TYPE.termination]: 'Դադարեցնելու' };

/** Գրառման հաշվարկվող դաշտեր. տեսակ (տեքստից, եթե տրված չէ) և կապակցման խնդիրներ */
export function finalizeRecord(rec) {
  const declarationType = rec.declarationType ?? KIND[(rec.declarationKind || '').toLocaleLowerCase('hy')] ?? null;
  const declarationKind = rec.declarationKind || KIND_LABEL[declarationType] || '';
  const r = { ...rec, declarationType, declarationKind, id: rec.id || `PN-${Math.random().toString(36).slice(2, 10)}` };
  r.issues = [
    !r.ssn && 'ՀԾՀ չկա',
    r.ssn && !/^\d{10}$/.test(r.ssn) && 'ՀԾՀ-ն 10 նիշ չէ',
    !r.year && 'տարին չկա',
    !r.declarationType && (declarationKind ? `տեսակը «${declarationKind}» հայտարարագրի տեսակ չէ` : 'տեսակը չկա'),
    !r.vivDate && 'ՎԻՎ Ա ամսաթիվ չկա',
  ].filter(Boolean);
  return r;
}

/** Կրկնօրինակի բանալի ներմուծման ժամանակ (նույն ՎԻՎ Ա, ամսաթիվ, ՀԾՀ) */
export const duplicateKey = (r) => `${r.vivNumber}|${r.vivDate}|${r.ssn}`;

/** Գրառումը կարելի՞ է կապել կոնկրետ հայտարարագրի հետ (ՀԾՀ + տարի + տեսակ + ամսաթիվ) */
export const isLinkable = (rec) => rec.issues.length === 0;
export const penaltyKey = (ssn, year, type) => `${ssn}|${year}|${type}`;

/** Գրառումները ըստ բանալու (ՀԾՀ|տարի|տեսակ) */
export function indexPenalties(records) {
  const map = new Map();
  for (const r of records || []) if (isLinkable(r)) { const k = penaltyKey(r.ssn, r.year, r.declarationType); map.set(k, [...(map.get(k) || []), r]); }
  for (const list of map.values()) list.sort((a, b) => a.vivDate.localeCompare(b.vivDate));
  return map;
}

/**
 * Ցուցադրական տույժեր (հորինված տվյալներ՝ mock EPD-ի անձանց համար). իրական տվյալները մուտքագրվում կամ ներմուծվում են «Արտաքին ֆայլեր → Տույժեր» էջում։
 * Դեպքեր. ուշացումով ներկայացում (DEC-R3), սևագիր (DEC-R4), հայտարարագիր չկա (DEC-R4), ներկայացված տույժից առաջ,
 * կապակցման համար անբավարար գրառումներ։
 */
const demo = (o) => ({ vivNumber: '', patronymic: '', declarantType: 'Պ/Ա', position: '', declarationKind: 'Տարեկան', basis: '169.28/5', specialist: 'Ցուցադրական', act: '', decisionUrl: '', decisionDate: null, ...o });
const DEMO_ROWS = [
  demo({ vivNumber: '41/25', vivDate: '2025-04-15', firstName: 'ՎԱՀԵ', lastName: 'ՂԱԶԱՐՅԱՆ', patronymic: 'ՄՈՒՇԵՂԻ', ssn: '3001720556', position: 'Արտաշատ համայնքի ղեկավար', year: 2024, act: '200․000', decisionDate: '2025-04-30' }),
  demo({ vivNumber: '57/26', vivDate: '2026-05-12', firstName: 'ՎԱՀԵ', lastName: 'ՂԱԶԱՐՅԱՆ', patronymic: 'ՄՈՒՇԵՂԻ', ssn: '3001720556', position: 'Արտաշատ համայնքի ղեկավար', year: 2025 }),
  demo({ vivNumber: '61/26', vivDate: '2026-05-20', firstName: 'ՍԱՄՎԵԼ', lastName: 'ԹՈՐՈՍՅԱՆ', patronymic: 'ԼՅՈՎԱՅԻ', ssn: '2603690617', position: 'Արտաշատ համայնքի ղեկավարի տեղակալ', year: 2025, act: '200․000', decisionDate: '2026-06-02' }),
  demo({ vivNumber: '62/26', vivDate: '2026-05-20', firstName: 'ԿԱՐԻՆԵ', lastName: 'ՄԱՆԱՍՅԱՆ', patronymic: 'ԱՐՏԱԿԻ', ssn: '0101900111', declarantType: 'Ը/Ա', position: 'Արտաշատ համայնքի ղեկավարի տեղակալ', year: 2025 }),
  demo({ vivNumber: '48/26', vivDate: '2026-04-10', firstName: 'ԴԱՎԻԹ', lastName: 'ԳՐԻԳՈՐՅԱՆ', patronymic: 'ԱՇՈՏԻ', ssn: '0804770163', position: 'Վարչության պետ', year: 2025, act: 'դեպք չկա', basis: '169.28/1' }),
  demo({ vivNumber: '70/26', vivDate: '2026-06-03', firstName: 'ԱՐՄԵՆ', lastName: 'ԱՌԱՔԵԼՅԱՆ', ssn: '', year: null, declarationKind: '', basis: '189.13/2' }),
  demo({ vivNumber: '71/26', vivDate: '2026-06-05', firstName: 'ՆԱՐԻՆԵ', lastName: 'ԱՎԵՏԻՍՅԱՆ', patronymic: 'ՀՐԱՉՅԱՅԻ', ssn: '1501870928', year: null, declarationKind: '', basis: '169.31/1' }),
];
export function demoPenalties() {
  return DEMO_ROWS.map((o, i) => finalizeRecord({ id: `PN-DEMO-${i + 1}`, row: i + 2, source: 'Ցուցադրական տվյալներ', ...o }));
}

/**
 * Լրացման նմուշ (.xlsx). առաջին թերթ՝ «Տույժեր» (վերնագրեր, որոնք ճանաչում է parsePenaltyRows-ը),
 * երկրորդ թերթ՝ «Հրահանգներ»։ ՀԾՀ-ն տեքստային սյունակ է (առաջին 0-ն չկորչելու համար), ամսաթվերը՝ dd.mm.yyyy։
 */
export const TEMPLATE_COLUMNS = [
  { header: 'N', width: 5, required: false, desc: 'Հերթական համար (ներմուծման ժամանակ չի օգտագործվում)', example: '1' },
  { header: 'ՎԻՎ Ա N', width: 10, required: false, desc: 'Վարչական իրավախախտման վարույթի արձանագրության համար', example: '01/25' },
  { header: 'ՎԻՎ Ա ամսաթիվ', width: 14, style: 'date', required: true, desc: 'Տույժի կիրառման ամսաթիվ (DEC-R3, DEC-R4). ձևաչափ՝ օր.ամիս.տարի', example: '15.04.2025' },
  { header: 'Անուն', width: 14, required: false, desc: 'Անձի անուն', example: 'ՎԱՀԵ' },
  { header: 'Ազգանուն', width: 16, required: false, desc: 'Անձի ազգանուն', example: 'ՂԱԶԱՐՅԱՆ' },
  { header: 'Հայրանուն', width: 14, required: false, desc: 'Անձի հայրանուն', example: 'ՄՈՒՇԵՂԻ' },
  { header: 'ՀԾՀ', width: 13, style: 'text', required: true, desc: 'Հանրային ծառայությունների համարանիշ՝ 10 նիշ. առանց ՀԾՀ-ի տույժը հայտարարագրին չի կապակցվում', example: '3001720556' },
  { header: 'Հայտարարատուի տեսակ', width: 14, list: ['Պ/Ա', 'Ը/Ա', 'Կ Պ/Ա'], required: false, desc: 'Պ/Ա՝ պաշտոնատար անձ, Ը/Ա՝ ընտանիքի անդամ, Կ Պ/Ա', example: 'Պ/Ա' },
  { header: 'Պ/Ա- պաշտոնը, Ը/Ա-ի դեպքում՝ Պ/Ա-ի պաշտոնը', width: 36, style: 'wrap', required: false, desc: 'Պաշտոն (ընտանիքի անդամի դեպքում՝ պաշտոնատար անձի պաշտոնը)', example: 'Համայնքի ղեկավար' },
  { header: 'Տարի', width: 8, required: true, desc: 'Հայտարարագրի տարի (4 նիշ)', example: '2024' },
  { header: 'Հայտարարագրի կամ հաշվետվության տեսակ', width: 18, list: ['Տարեկան', 'Ստանձնելու', 'Դադարեցնելու', 'Վերաբերելի չէ'], required: true, desc: 'Տարեկան, Ստանձնելու կամ Դադարեցնելու. «Վերաբերելի չէ» գրառումը հայտարարագրին չի կապակցվում', example: 'Տարեկան' },
  { header: 'ՎԻՎ հիմք', width: 12, required: false, desc: 'ՎԻՎ հիմքի կոդ', example: '169.28/5' },
  { header: 'Մասնագետ, որի կողմից կազմվել է ՎԻՎ Ա-ը', width: 22, required: false, desc: 'ՎԻՎ Ա-ն կազմած մասնագետ', example: '' },
  { header: 'Վարչական ակտ', width: 14, required: false, desc: 'Վարչական ակտ (օր.՝ տուգանքի գումար)', example: '200․000' },
  { header: 'Որոշման հղում', width: 30, required: false, desc: 'Որոշման հղում', example: 'https://…' },
  { header: 'Որոշման ամսաթիվ', width: 14, style: 'date', required: false, desc: 'Որոշման ամսաթիվ. ձևաչափ՝ օր.ամիս.տարի', example: '30.04.2025' },
];

export function penaltyTemplateSheets() {
  return [
    { name: 'Տույժեր', freezeHeader: true, columns: TEMPLATE_COLUMNS.map(({ header, width, style, list }) => ({ header, width, style, list })), rows: [] },
    {
      name: 'Հրահանգներ',
      columns: [{ header: 'Սյունակ', width: 34, style: 'wrap' }, { header: 'Պարտադիր', width: 11 }, { header: 'Նկարագրություն', width: 70, style: 'wrap' }, { header: 'Օրինակ', width: 16 }],
      rows: [
        ...TEMPLATE_COLUMNS.map((c) => [c.header, c.required ? 'Այո' : '', c.desc, c.example]),
        ['', '', '', ''],
        ['Ընդհանուր', '', 'Լրացրեք «Տույժեր» թերթը. մեկ տող՝ մեկ ՎԻՎ ակտ։ Վերնագրերի տեքստը մի փոխեք (սյունակների հերթականությունը կարելի է փոխել)։ Տույժը հայտարարագրին կապակցվում է ՀԾՀ + տարի + տեսակով։', ''],
        ['Ներմուծում', '', 'Մոդուլում՝ «Արտաքին ֆայլեր» → «Տույժեր» → «Ներմուծել ֆայլից (.xlsx)»։ «Ավելացնել» ռեժիմում արդեն առկա գրառումները (նույն ՎԻՎ Ա, ամսաթիվ, ՀԾՀ) չեն կրկնվում։', ''],
      ],
    },
  ];
}
