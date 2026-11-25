/**
 * EPD mock տվյալներ՝ EPD-ի իրական կառուցվածքով (Database Guide v1.0 և թեստային բազայի knowledge base)։
 * Աղյուսակների և սյուների անունները, դասակարգիչների id-ները, տարբերակների/բաժինների/կլոնների
 * կառուցվածքը համապատասխանում են EPD-ին։ Անձինք, ՀԾՀ-ները, գումարները և կազմակերպությունները հորինված են։
 * Սցենարների նկարագրությունը՝ docs/MOCK_DATA.md։
 */
import { MockDb, money, yn } from './mockdb.js';
import { WF, FAMILY_MEMBER as FM, DECLARANT_TYPE, PERSON_TYPE, REPORT_TYPE } from './classifiers.js';

export const db = new MockDb();
/** Mock-ի «բանալիներ» → EPD row. սցենարներին և թեստերին հղվելու համար */
export const KEYS = { person: {}, declaration: {}, gift: {}, report: {}, party: {}, integrity: {} };

// ───────────────────────────── անձինք (կենդանի պրոֆիլներ, iscloned = 2)
// positiontype, institution՝ c_positiontype, c_institution իրական id-ներ
const PEOPLE = {
  'PR-101': { firstname: 'Արմեն', lastname: 'Հովհաննիսյան', middlename: 'Գագիկի', ssn: '0000101925', dateofbirth: '1975-07-25', gender: 1, positiontype: 8, institution: 30, positionatwork: 'Նախարարի տեղակալ' },
  'PR-102': { firstname: 'Լիլիթ', lastname: 'Հովհաննիսյան', middlename: 'Արտաշեսի', ssn: '0000100963', dateofbirth: '1979-03-14', gender: 2 },
  'PR-103': { firstname: 'Արման', lastname: 'Հովհաննիսյան', middlename: 'Արմենի', ssn: '0000100593', dateofbirth: '2011-11-09', gender: 1 },
  'PR-104': { firstname: 'Գայանե', lastname: 'Սարգսյան', middlename: 'Ռուբենի', ssn: '0000101370', dateofbirth: '1968-02-18', gender: 2, positiontype: 3, institution: 149, positionatwork: 'Դատավոր' },
  'PR-105': { firstname: 'Տիգրան', lastname: 'Մկրտչյան', middlename: 'Սամվելի', ssn: '0000100112', dateofbirth: '1980-06-03', gender: 1, positiontype: 2, institution: 43, positionatwork: 'Կոմիտեի նախագահ' },
  'PR-106': { firstname: 'Մարինե', lastname: 'Մկրտչյան', middlename: 'Վազգենի', ssn: '0000101666', dateofbirth: '1982-10-21', gender: 2 },
  'PR-107': { firstname: 'Նարինե', lastname: 'Ավետիսյան', middlename: 'Հրաչյայի', ssn: '0000101148', dateofbirth: '1987-01-15', gender: 2, positiontype: 9, institution: 40, positionatwork: 'Վարչության պետի տեղակալ' },
  'PR-108': { firstname: 'Դավիթ', lastname: 'Գրիգորյան', middlename: 'Աշոտի', ssn: '0000100445', dateofbirth: '1977-04-08', gender: 1, positiontype: 9, institution: 12, positionatwork: 'Վարչության պետ' },
  'PR-109': { firstname: 'Սուրեն', lastname: 'Վարդանյան', middlename: 'Կարենի', ssn: '0000101777', dateofbirth: '1983-09-22', gender: 1, positiontype: 9, institution: 52, positionatwork: 'Վարչության պետ' },
  'PR-110': { firstname: 'Անի', lastname: 'Խաչատրյան', middlename: 'Մհերի', ssn: '0000101333', dateofbirth: '1985-12-17', gender: 2, positiontype: 9, institution: 32, positionatwork: 'Վարչության պետ' },
  'PR-111': { firstname: 'Վահե', lastname: 'Ղազարյան', middlename: 'Մուշեղի', ssn: '0000102184', dateofbirth: '1972-01-30', gender: 1, positiontype: 4, institution: 67, positionatwork: 'Համայնքի ղեկավար' },
  'PR-112': { firstname: 'Լևոն', lastname: 'Բաբայան', middlename: 'Էդուարդի', ssn: '0000100704', dateofbirth: '1976-05-11', gender: 1, positiontype: 8, institution: 12, positionatwork: 'Նախարարի տեղակալ' },
  'PR-113': { firstname: 'Մարիամ', lastname: 'Գևորգյան', middlename: 'Արայի', ssn: '0000100371', dateofbirth: '1989-02-07', gender: 2, positiontype: 9, institution: 40, positionatwork: 'Վարչության պետ' },
  'PR-114': { firstname: 'Սամվել', lastname: 'Թորոսյան', middlename: 'Լյովայի', ssn: '0000101962', dateofbirth: '1969-03-26', gender: 1, positiontype: 4, institution: 67, positionatwork: 'Համայնքի ղեկավարի տեղակալ' },
  'PR-115': { firstname: 'Ռուզաննա', lastname: 'Պողոսյան', middlename: 'Արթուրի', ssn: '0000101555', dateofbirth: '1991-09-19', gender: 2 },
  'PR-116': { firstname: 'Գևորգ', lastname: 'Աբրահամյան', middlename: 'Վաչեի', ssn: '0000100186', dateofbirth: '1984-12-04', gender: 1 },
  'PR-117': { firstname: 'Էդգար', lastname: 'Սիմոնյան', middlename: 'Գրիգորի', ssn: '0000102147', dateofbirth: '1979-08-28', gender: 1 },
  'PR-118': { firstname: 'Լուսինե', lastname: 'Կարապետյան', middlename: 'Նորայրի', ssn: '0000101259', dateofbirth: '1993-10-16', gender: 2 },
  'PR-119': { firstname: 'Անահիտ', lastname: 'Սիմոնյան', middlename: 'Հակոբի', ssn: '0000100260', dateofbirth: '1981-05-05', gender: 2 },
  'PR-120': { firstname: 'Արսեն', lastname: 'Դանիելյան', middlename: 'Ռաֆայելի', ssn: '0000101444', dateofbirth: '1986-04-19', gender: 1, positiontype: 9, institution: 40, positionatwork: 'Վարչության պետի տեղակալ' },
  'PR-121': { firstname: 'Սոնա', lastname: 'Դանիելյան', middlename: 'Կարոյի', ssn: '0000100334', dateofbirth: '1988-02-07', gender: 2, positiontype: 9, institution: 12, positionatwork: 'Վարչության պետ' },
};

const profileFields = (p) => ({
  firstname: p.firstname, lastname: p.lastname, middlename: p.middlename, fullname: `${p.firstname} ${p.lastname} ${p.middlename}`,
  ssn: p.ssn, dateofbirth: p.dateofbirth, gender: p.gender, isalive: 1, havecertificateofnothavingssn: 2,
  positiontype: p.positiontype ?? null, institution: p.institution ?? null, positionatwork: p.positionatwork ?? null,
});

for (const [key, p] of Object.entries(PEOPLE)) KEYS.person[key] = db.versioned('de_profile', { ...profileFields(p), iscloned: yn(false), clonedfromprofile: null });

/** Պրոֆիլի կլոն մեկ հայտարարագրի/նվերի/հարցաթերթիկի համար՝ ընտանիքի անդամների կլոններով (Guide 4.1) */
function cloneProfile(key, { family = [], relatives = [], positions = [], otherPositions = [], overrides = {} } = {}) {
  const live = KEYS.person[key];
  const clone = db.versioned('de_profile', { ...profileFields(PEOPLE[key]), ...overrides, iscloned: yn(true), clonedfromprofile: live.instanceid });
  const members = {};
  for (const f of family) {
    const mc = cloneProfile(f.member).clone;
    members[f.member] = mc;
    db.detail('de_profilefamilymembers', clone, { profile: mc.instanceid, type: f.type, activationdate: f.from || '2010-01-01', deactivationdate: null, natureofrelationship: null });
  }
  for (const r of relatives) db.detail('de_profilerelatives', clone, { firstname: r.firstname, lastname: r.lastname, middlename: r.middlename, dateofbirth: r.dateofbirth, relativetype: r.relativetype });
  for (const p of positions) db.detail('de_profilepositionslist', clone, { institution: p.institution, institutionname: null, position: p.position, assumptiondate: p.assumptiondate, terminationdate: p.terminationdate ?? null });
  for (const p of otherPositions) db.detail('de_profileotherpositionslist', clone, { institution: p.institution ?? null, position: p.position, assumptiondate: p.assumptiondate, terminationdate: p.terminationdate ?? null, positiontype: null });
  return { clone, members };
}

// ───────────────────────────── հայտարարագրեր
const STATUS_WF = { published: WF.declaration.published, submitted: WF.declaration.submitted, draft: WF.declaration.draft, modification: WF.declaration.modification };
const ts = (d, t = '09:30:00') => (d ? `${d}T${t}` : null);

// c_relativetype. 1 ծնող, 2 չափահաս զավակ, 3 եղբայր, 4 քույր, 5 ամուսնու ծնող, 6 ամուսնու զավակ, 7 ամուսնու եղբայր, 8 ամուսնու քույր
const REL_ARMEN = [
  { firstname: 'Գագիկ', lastname: 'Մելքոնյան', middlename: 'Արտաշեսի', dateofbirth: '1976-04-02', relativetype: 7 },
  { firstname: 'Արուսյակ', lastname: 'Հովհաննիսյան', middlename: 'Լևոնի', dateofbirth: '1950-11-12', relativetype: 1 },
];
const REL_ANI = [
  { firstname: 'Հայկ', lastname: 'Խաչատրյան', middlename: 'Մհերի', dateofbirth: '1983-06-30', relativetype: 3 },
  { firstname: 'Մհեր', lastname: 'Խաչատրյան', middlename: 'Սարգսի', dateofbirth: '1955-01-19', relativetype: 1 },
];
const REL_SUREN = [{ firstname: 'Արթուր', lastname: 'Վարդանյան', middlename: 'Կարենի', dateofbirth: '1980-02-11', relativetype: 3 }];

/*
 * Սպեցիֆիկացիայի տողերի դաշտեր (ընդլայնվում են EPD սյուների).
 *   cash/bank/eacc. { start, end, cur, rateDate, origin(c_sourceoforigin), filling, status }
 *   deposits. { bank, start, end }   loansGiven. { debtor, start, end, paid, repaid }
 *   incomes. { type(c_incometype), payer, tin, amount }   remaining. { type(1 վարկ, 2 փոխառություն), lender, balance, mortgage, subject }
 *   realestate. { tab(1 սկզբում, 2 ձեռք բերված, 3 օտարված), type(c_realestatetype), area, code, dealdate, deal, method(c_dealmethod), counterpart }
 *   vehicles. { tab, make, model, year, vin, regno, dealdate, deal, method }
 *   expenses. { type(c_expensetype), amount, summary }   contracts. { counterpart, subject, type, cost, sign, due }
 *   parties. { name, status }
 */
const SPECS = [
  // Արմեն Հովհաննիսյան (PR-101). ամուսինը հայտարարագրում է առանձին, անչափահաս որդու գույքը՝ պաշտոնյայի հայտարարագրում
  ...[2023, 2024, 2025].map((year) => ({
    code: `D-101-${year}`, person: 'PR-101', year, status: 'published', submittedon: { 2023: '2024-03-20', 2024: '2025-03-18', 2025: '2026-03-16' }[year],
    position: 'Նախարարի տեղակալ', institution: 30, positiontype: 8, assumptiondate: '2021-09-01',
    family: [{ member: 'PR-102', type: FM.spouse }, { member: 'PR-103', type: FM.minor }], relatives: REL_ARMEN,
    positions: [{ institution: 30, position: 'Նախարարի տեղակալ', assumptiondate: '2021-09-01' }],
    cash: year === 2025
      ? [{ start: 2000000, end: 8000000, origin: 8 }, { start: 0, end: 5000000, origin: 8, filling: 3, status: 2 /* մերժված պատճենված տող (DEC-06) */ }]
      : [{ start: { 2023: 1000000, 2024: 1500000 }[year], end: { 2023: 1500000, 2024: 2000000 }[year], origin: 4 }],
    bank: [{ bank: 'Ամերիաբանկ', start: { 2023: 800000, 2024: 1200000, 2025: 1500000 }[year], end: { 2023: 1200000, 2024: 1500000, 2025: 2940000 }[year], origin: 4 }],
    incomes: [{ type: 1, payer: 'ՀՀ էկոնոմիկայի նախարարություն', tin: '02500011', amount: { 2023: 7200000, 2024: 7500000, 2025: 7800000 }[year], filling: 2, status: 1 }],
    deposits: [{ bank: 'Ակբա բանկ', start: 2000000, end: 2000000 }],
    realestate: [{ tab: 1, type: 7, area: 96, code: '01-001-0123-0022', filling: 2, status: 1 }],
    vehicles: [{ tab: 1, make: 'Toyota', model: 'Camry', year: 2018, vin: 'JTNB11HK0J3000123', regno: '35 OO 123', filling: 2, status: 1 }],
    expenses: year === 2025 ? [{ type: 3, amount: 1200000, summary: 'Որդու մասնավոր դպրոցի վարձ' }] : [],
    minorRows: { member: 'PR-103', bank: [{ bank: 'Ամերիաբանկ', start: { 2023: 100000, 2024: 150000, 2025: 200000 }[year], end: { 2023: 150000, 2024: 200000, 2025: 250000 }[year], origin: 5 }] },
  })),
  ...[2023, 2024, 2025].map((year) => ({
    code: `D-102-${year}`, person: 'PR-102', parent: `D-101-${year}`, year, status: 'published', submittedon: { 2023: '2024-03-20', 2024: '2025-03-18', 2025: '2026-03-16' }[year],
    cash: [{ start: { 2023: 300000, 2024: 400000, 2025: 500000 }[year], end: { 2023: 400000, 2024: 500000, 2025: 600000 }[year], origin: 4 }],
    incomes: [{ type: 1, payer: '«Արմ Ֆարմ» ՍՊԸ', tin: '01234567', amount: { 2023: 3900000, 2024: 4000000, 2025: 4200000 }[year], filling: 2, status: 1 }],
  })),

  // Գայանե Սարգսյան (PR-104). առանց ռիսկի, USD հաշիվ. 2025-ը ուղղվել է (նախորդ տարբերակը ոչ ընթացիկ է)
  {
    code: 'D-104-2024', person: 'PR-104', year: 2024, status: 'published', submittedon: '2025-03-25', position: 'Դատավոր', institution: 149, positiontype: 3, assumptiondate: '2016-05-10',
    positions: [{ institution: 149, position: 'Դատավոր', assumptiondate: '2016-05-10' }],
    cash: [{ start: 250000, end: 300000, origin: 4 }],
    bank: [{ bank: 'Ինեկոբանկ', cur: 'USD', start: 3500, end: 4000, origin: 4 }],
    incomes: [{ type: 1, payer: 'ՀՀ վճռաբեկ դատարան', tin: '02500402', amount: 8700000, filling: 2, status: 1 }, { type: 9, payer: 'Վարձակալ ֆիզ. անձ', amount: 600000 }],
    realestate: [{ tab: 1, type: 7, area: 120, code: '01-002-0456-0009', filling: 2, status: 1 }, { tab: 1, type: 7, area: 64, code: '01-002-0789-0003', filling: 2, status: 1 }],
  },
  {
    code: 'D-104-2025', person: 'PR-104', year: 2025, status: 'published', submittedon: '2026-03-27', position: 'Դատավոր', institution: 149, positiontype: 3, assumptiondate: '2016-05-10',
    positions: [{ institution: 149, position: 'Դատավոր', assumptiondate: '2016-05-10' }],
    previousVersion: { submittedon: '2026-03-10', bank: [{ bank: 'Ինեկոբանկ', cur: 'USD', start: 4000, end: 50000, origin: 4 }], cash: [{ start: 300000, end: 200000, origin: 4 }], incomes: [{ type: 1, payer: 'ՀՀ վճռաբեկ դատարան', amount: 9000000 }] },
    cash: [{ start: 300000, end: 200000, origin: 4 }],
    bank: [{ bank: 'Ինեկոբանկ', cur: 'USD', start: 4000, end: 5000, origin: 4 }],
    incomes: [{ type: 1, payer: 'ՀՀ վճռաբեկ դատարան', tin: '02500402', amount: 9000000, filling: 2, status: 1 }, { type: 9, payer: 'Վարձակալ ֆիզ. անձ', amount: 600000 }],
    realestate: [{ tab: 1, type: 7, area: 120, code: '01-002-0456-0009', filling: 2, status: 1 }, { tab: 1, type: 7, area: 64, code: '01-002-0789-0003', filling: 2, status: 1 }],
    expenses: [{ type: 1, amount: 2500, cur: 'EUR', summary: 'Հանգստի ավիատոմսեր' }, { type: 6, amount: 800000, summary: 'Բնակարանի վերանորոգում' }],
  },

  // Տիգրան Մկրտչյան (PR-105). 2025-ին գնել է բնակարան 45 մլն՝ 30 մլն հիփոթեքային վարկով (եկամտի տեսակ 13)
  {
    code: 'D-105-2024', person: 'PR-105', year: 2024, status: 'published', submittedon: '2025-03-28', position: 'Կոմիտեի նախագահ', institution: 43, positiontype: 2, assumptiondate: '2022-02-01',
    family: [{ member: 'PR-106', type: FM.spouse }], relatives: [{ firstname: 'Սամվել', lastname: 'Մկրտչյան', middlename: 'Տիգրանի', dateofbirth: '1952-08-14', relativetype: 1 }, { firstname: 'Ռուզաննա', lastname: 'Մկրտչյան', middlename: 'Գևորգի', dateofbirth: '1955-02-02', relativetype: 1 }],
    positions: [{ institution: 43, position: 'Կոմիտեի նախագահ', assumptiondate: '2022-02-01' }],
    cash: [{ start: 2500000, end: 3000000, origin: 4 }],
    bank: [{ bank: 'Արդշինբանկ', start: 1500000, end: 2000000, origin: 4 }],
    incomes: [{ type: 1, payer: 'Ջրային կոմիտե', tin: '02500733', amount: 5800000, filling: 2, status: 1 }],
  },
  {
    code: 'D-105-2025', person: 'PR-105', year: 2025, status: 'published', submittedon: '2026-03-30', position: 'Կոմիտեի նախագահ', institution: 43, positiontype: 2, assumptiondate: '2022-02-01',
    family: [{ member: 'PR-106', type: FM.spouse }], relatives: [{ firstname: 'Սամվել', lastname: 'Մկրտչյան', middlename: 'Տիգրանի', dateofbirth: '1952-08-14', relativetype: 1 }, { firstname: 'Ռուզաննա', lastname: 'Մկրտչյան', middlename: 'Գևորգի', dateofbirth: '1955-02-02', relativetype: 1 }],
    positions: [{ institution: 43, position: 'Կոմիտեի նախագահ', assumptiondate: '2022-02-01' }],
    cash: [{ start: 3000000, end: 500000, origin: 4 }],
    bank: [{ bank: 'Արդշինբանկ', start: 2000000, end: 300000, origin: 4 }],
    incomes: [
      { type: 1, payer: 'Ջրային կոմիտե', tin: '02500733', amount: 6000000, filling: 2, status: 1 },
      { type: 13, payer: 'Արդշինբանկ', tin: '02520018', amount: 30000000 },
    ],
    remaining: [{ type: 1, lender: 'Արդշինբանկ', balance: 29500000, mortgage: true, subject: 'Բնակարան', address: 'Երևան, Դավիթաշեն 4-րդ թաղ., շ. 12, բն. 40' }],
    realestate: [{ tab: 2, type: 7, area: 110, code: '01-010-0321-0040', dealdate: '2025-06-12', deal: 45000000, method: 3, counterpart: '«Դավիթաշեն Դեվելոփմենթ» ՍՊԸ', filling: 2, status: 1 }],
  },
  // DEC-R6՝ ընտանիքի կանխիկ. Տիգրանի (2.5/3 մլն) և Մարինեի (3.95/4 մլն) կանխիկը առանձին չի գերազանցում 5 մլն շեմը, իսկ միասին՝
  // 6.45 մլն տարեսկզբին և 7 մլն տարեվերջին, որը 3 անգամ և ավելի գերազանցում է ընտանիքի անկանխիկ միջոցները (1.5/2 մլն)
  { code: 'D-106-2024', person: 'PR-106', parent: 'D-105-2024', year: 2024, status: 'published', submittedon: '2025-03-28',
    cash: [{ start: 3950000, end: 4000000, origin: 4 }], incomes: [{ type: 1, payer: 'Դպրոց N 45', amount: 2900000, filling: 2, status: 1 }] },
  { code: 'D-106-2025', person: 'PR-106', parent: 'D-105-2025', year: 2025, status: 'published', submittedon: '2026-03-30',
    cash: [{ start: 200000, end: 300000, origin: 4 }], incomes: [{ type: 1, payer: 'Դպրոց N 45', amount: 3000000, filling: 2, status: 1 }] },

  // Նարինե Ավետիսյան (PR-107). վաճառել և գնել է մեքենա, ավանդն աճել է (4.1-ի նշանի հարցը)
  {
    code: 'D-107-2024', person: 'PR-107', year: 2024, status: 'published', submittedon: '2025-03-12', position: 'Վարչության պետի տեղակալ', institution: 40, positiontype: 9, assumptiondate: '2021-06-01',
    positions: [{ institution: 40, position: 'Վարչության պետի տեղակալ', assumptiondate: '2021-06-01' }], parties: [],
    cash: [{ start: 400000, end: 500000, origin: 4 }], bank: [{ bank: 'Էվոկաբանկ', start: 300000, end: 500000, origin: 4 }],
    deposits: [{ bank: 'Էվոկաբանկ', start: 500000, end: 1000000 }],
    incomes: [{ type: 1, payer: 'ՀՀ ֆինանսների նախարարություն', tin: '02500044', amount: 5100000, filling: 2, status: 1 }],
    vehicles: [{ tab: 1, make: 'Kia', model: 'Rio', year: 2014, vin: 'KNADN512AE6000789', regno: '12 AB 345', filling: 2, status: 1 }],
  },
  {
    code: 'D-107-2025', person: 'PR-107', year: 2025, status: 'published', submittedon: '2026-03-11', position: 'Վարչության պետի տեղակալ', institution: 40, positiontype: 9, assumptiondate: '2021-06-01',
    positions: [{ institution: 40, position: 'Վարչության պետի տեղակալ', assumptiondate: '2021-06-01' }], parties: [],
    cash: [{ start: 500000, end: 700000, origin: 4 }], bank: [{ bank: 'Էվոկաբանկ', start: 500000, end: 800000, origin: 4 }],
    deposits: [{ bank: 'Էվոկաբանկ', start: 1000000, end: 3000000 }],
    incomes: [{ type: 1, payer: 'ՀՀ ֆինանսների նախարարություն', tin: '02500044', amount: 5400000, filling: 2, status: 1 }, { type: 8, payer: 'Ֆիզ. անձ (մեքենայի գնորդ)', amount: 4000000 }],
    vehicles: [
      { tab: 1, make: 'Kia', model: 'Rio', year: 2014, vin: 'KNADN512AE6000789', regno: '12 AB 345', filling: 2, status: 1 },
      { tab: 3, make: 'Kia', model: 'Rio', year: 2014, vin: 'KNADN512AE6000789', regno: '12 AB 345', dealdate: '2025-04-02', deal: 4000000, method: 2, filling: 2, status: 1 },
      { tab: 2, make: 'Hyundai', model: 'Tucson', year: 2019, vin: 'KMHJ381ABKU000321', regno: '01 HT 019', dealdate: '2025-04-20', deal: 6000000, method: 3, filling: 2, status: 1 },
    ],
  },

  // Դավիթ Գրիգորյան (PR-108). տեխնիկական վրիպում (25 000 000՝ 2 500 000-ի փոխարեն), DEC-10
  { code: 'D-108-2024', person: 'PR-108', year: 2024, status: 'published', submittedon: '2025-03-26', position: 'Վարչության պետ', institution: 12, positiontype: 9, assumptiondate: '2019-01-15',
    positions: [{ institution: 12, position: 'Վարչության պետ', assumptiondate: '2019-01-15' }],
    // DEC-R5. տարվա ընթացքում վերցրել է 1.2 մլն սպառողական վարկ, թեև տարեսկզբին ուներ 1.5 մլն կանխիկ. 15 մլն հիփոթեքային վարկը
    // (նկարագրությունում՝ «հիփոթեքային») չի հաշվվում. առանց դրա բացառման վարկերի գումարը (16.2 մլն) կգերազանցեր կանխիկը
    cash: [{ start: 1500000, end: 2000000, origin: 4 }], incomes: [{ type: 1, payer: 'ՀՀ առողջապահության նախարարություն', tin: '02500055', amount: 8100000, filling: 2, status: 1 }, { type: 13, payer: 'Ինեկոբանկ ՓԲԸ', amount: 1200000 },
      { type: 13, payer: 'Ամերիաբանկ ՓԲԸ', desc: 'Հիփոթեքային վարկ՝ բնակարանի ձեռքբերման համար', amount: 15000000 }],
    realestate: [{ tab: 2, type: 7, area: 72, code: '01-002-0145-0031', dealdate: '2024-06-14', method: 1, counterpart: 'Ա. Պետրոսյան', deal: 15000000 }],
    remaining: [{ type: 1, lender: 'Ինեկոբանկ ՓԲԸ', balance: 950000, mortgage: false, purpose: 'Սպառողական վարկ' }, { type: 1, lender: 'Ամերիաբանկ ՓԲԸ', balance: 14600000, mortgage: true, subject: 'Բնակարան', purpose: 'Բնակարանի ձեռքբերում' }] },
  { code: 'D-108-2025', person: 'PR-108', year: 2025, status: 'published', submittedon: '2026-03-24', position: 'Վարչության պետ', institution: 12, positiontype: 9, assumptiondate: '2019-01-15',
    positions: [{ institution: 12, position: 'Վարչության պետ', assumptiondate: '2019-01-15' }],
    cash: [{ start: 2000000, end: 25000000, origin: 4 }], incomes: [{ type: 1, payer: 'ՀՀ առողջապահության նախարարություն', tin: '02500055', amount: 8400000, filling: 2, status: 1 }] },

  // Սուրեն Վարդանյան (PR-109). բարեվարքության հարցաթերթիկի հետ համեմատության համար
  { code: 'D-109-2023', person: 'PR-109', year: 2023, status: 'published', submittedon: '2024-03-22', position: 'Վարչության պետի տեղակալ', institution: 52, positiontype: 9, assumptiondate: '2019-04-01', terminationdate: '2024-02-28',
    positions: [{ institution: 52, position: 'Վարչության պետի տեղակալ', assumptiondate: '2019-04-01', terminationdate: '2024-02-28' }], relatives: REL_SUREN,
    parties: [{ name: 'Միասնական առաջընթաց', status: 'Անդամ' }],
    cash: [{ start: 600000, end: 800000, origin: 4 }], bank: [{ bank: 'ԱյԴի բանկ', start: 400000, end: 700000, origin: 4 }],
    incomes: [{ type: 1, payer: 'Քաղաքաշինության կոմիտե', tin: '02500666', amount: 4800000, filling: 2, status: 1 }] },
  ...[2024, 2025].map((year) => ({
    code: `D-109-${year}`, person: 'PR-109', year, status: 'published', submittedon: { 2024: '2025-03-21', 2025: '2026-03-19' }[year], position: 'Վարչության պետ', institution: 52, positiontype: 9, assumptiondate: '2024-03-01',
    positions: [{ institution: 52, position: 'Վարչության պետ', assumptiondate: '2024-03-01' }],
    // ProfileOtherPositionsList-ում հաստատությունը միայն դասակարգիչ է (c_institution-ում բուհեր չկան), ուստի անվանումը լրացված է պաշտոնի դաշտում
    otherPositions: [{ institution: null, position: 'Դասախոս (Երևանի պետական համալսարան, համատեղությամբ)', assumptiondate: '2024-09-01' }],
    relatives: REL_SUREN, parties: [{ name: 'Միասնական առաջընթաց', status: 'Անդամ' }],
    cash: [{ start: { 2024: 800000, 2025: 900000 }[year], end: { 2024: 900000, 2025: 1100000 }[year], origin: 4 }],
    bank: [{ bank: 'ԱյԴի բանկ', start: { 2024: 700000, 2025: 900000 }[year], end: { 2024: 900000, 2025: 1000000 }[year], origin: 4 }],
    incomes: [{ type: 1, payer: 'Քաղաքաշինության կոմիտե', tin: '02500666', amount: { 2024: 5600000, 2025: 6000000 }[year], filling: 2, status: 1 }, ...(year === 2025 ? [{ type: 10, payer: 'Երևանի պետական համալսարան', tin: '02500099', amount: 900000, filling: 2, status: 1 }] : [])],
  })),

  // Անի Խաչատրյան (PR-110). նվերների ստացող, 5 մլն-ից ավել պայմանագրեր
  { code: 'D-110-2024', person: 'PR-110', year: 2024, status: 'published', submittedon: '2025-03-14', position: 'Վարչության պետ', institution: 32, positiontype: 9, assumptiondate: '2020-10-01',
    positions: [{ institution: 32, position: 'Վարչության պետ', assumptiondate: '2020-10-01' }], relatives: REL_ANI,
    // DEC-R6-ի (գ) օրինակ. 2024-ին վաճառել է բնակարան 8 մլն-ով, գումարը պահել է բանկային հաշվին
    cash: [{ start: 700000, end: 900000, origin: 4 }], bank: [{ bank: 'Ամերիաբանկ', start: 500000, end: 8800000, origin: 4 }],
    incomes: [{ type: 1, payer: 'ԿԳՄՍ նախարարություն', tin: '02500077', amount: 6200000, filling: 2, status: 1 }, { type: 8, payer: 'Արամ Պետրոսյան', amount: 8000000 }],
    realestate: [{ tab: 3, type: 7, area: 48, code: '01-005-0311-0021', dealdate: '2024-09-12', deal: 8000000, method: 2, counterpart: 'Արամ Պետրոսյան' }],
    contracts: [{ counterpart: '«Բիլդ Գրուպ» ՍՊԸ', subject: 'Բնակարանի վերանորոգման աշխատանքներ', type: 'Կապալ', cost: 12000000, sign: '2024-05-14', due: '2024-11-30' }] },
  { code: 'D-110-2025', person: 'PR-110', year: 2025, status: 'published', submittedon: '2026-03-13', position: 'Վարչության պետ', institution: 32, positiontype: 9, assumptiondate: '2020-10-01',
    positions: [{ institution: 32, position: 'Վարչության պետ', assumptiondate: '2020-10-01' }], relatives: REL_ANI,
    // DEC-R6. տարեվերջին 7 մլն կանխիկ (> 5 մլն և ≥ 3 × անկանխիկ), բայց հիմնավորվում է նախորդ տարիների խնայողությամբ (2024-ի վաճառք). չի աշխատում
    cash: [{ start: 900000, end: 7000000, origin: 8 }], bank: [{ bank: 'Ամերիաբանկ', start: 8800000, end: 1100000, origin: 4 }],
    incomes: [{ type: 1, payer: 'ԿԳՄՍ նախարարություն', tin: '02500077', amount: 6600000, filling: 2, status: 1 }, { type: 7, payer: 'Կրթական զարգացման հիմնադրամ', amount: 600000 }],
    contracts: [{ counterpart: '«ԱրմՏեխ» ՓԲԸ', subject: 'Համակարգչային տեխնիկայի ձեռքբերում', type: 'Առուվաճառք', cost: 6500000, sign: '2025-02-03', due: '2025-03-01' }] },

  // Վահե Ղազարյան (PR-111). 2025-ի տարեկան հայտարարագիրը չի ներկայացվել (սևագիր + overdue act)
  { code: 'D-111-2024', person: 'PR-111', year: 2024, status: 'published', submittedon: '2025-04-28', position: 'Համայնքի ղեկավար', institution: 67, positiontype: 4, assumptiondate: '2021-11-01',
    positions: [{ institution: 67, position: 'Համայնքի ղեկավար', assumptiondate: '2021-11-01' }],
    cash: [{ start: 1200000, end: 1300000, origin: 4 }], incomes: [{ type: 1, payer: 'Արտաշատի համայնքապետարան', amount: 5400000, filling: 2, status: 1 }] },
  { code: 'D-111-2025', person: 'PR-111', year: 2025, status: 'draft', submittedon: null, position: 'Համայնքի ղեկավար', institution: 67, positiontype: 4, assumptiondate: '2021-11-01', overdue: true },

  // Արսեն և Սոնա Դանիելյաններ (PR-120, PR-121). ամուսիններ, երկուսն էլ պաշտոնատար անձ. յուրաքանչյուրը ներկայացնում է միայն
  // իր պաշտոնյայի հայտարարագիրը (ինչպես EPD-ում). ընտանիքի կազմով հաշվարկում ներառվում է ամուսնու հայտարարագիրը.
  // առանց դրա Արսենի ընտանիքի կազմով DEC-R1-ը սխալմամբ կաշխատեր (1.5 մլն ծախս 2 անձի համար)։
  // Արսենի հայտարարագրում նշված է նաև Սոնայի բանկային հաշիվը (կրկնվող տող). այն չի հաշվվում, քանի որ վերցվում է Սոնայի հայտարարագրից
  { code: 'D-120-2025', person: 'PR-120', year: 2025, status: 'published', submittedon: '2026-03-20', position: 'Վարչության պետի տեղակալ', institution: 40, positiontype: 9, assumptiondate: '2023-02-01',
    positions: [{ institution: 40, position: 'Վարչության պետի տեղակալ', assumptiondate: '2023-02-01' }], family: [{ member: 'PR-121', type: FM.spouse }],
    cash: [{ start: 300000, end: 1200000, origin: 4 }], incomes: [{ type: 1, payer: 'ՀՀ ֆինանսների նախարարություն', tin: '02500044', amount: 2400000, filling: 2, status: 1 }],
    memberRows: { member: 'PR-121', type: FM.spouse, bank: [{ bank: 'Ակբա բանկ', start: 500000, end: 600000, origin: 4 }] } },
  { code: 'D-121-2025', person: 'PR-121', year: 2025, status: 'published', submittedon: '2026-03-18', position: 'Վարչության պետ', institution: 12, positiontype: 9, assumptiondate: '2021-09-01',
    positions: [{ institution: 12, position: 'Վարչության պետ', assumptiondate: '2021-09-01' }], family: [{ member: 'PR-120', type: FM.spouse }],
    bank: [{ bank: 'Ակբա բանկ', start: 500000, end: 600000, origin: 4 }], incomes: [{ type: 1, payer: 'ՀՀ առողջապահության նախարարություն', tin: '02500055', amount: 4800000, filling: 2, status: 1 }] },

  // Պաշտոնը ստանձնելու հայտարարագիր (declarationtype 2). վերլուծվում չէ, օգտագործվում է միայն տույժերի պատմության համար (DEC-R3)՝
  // Նարինե Ավետիսյանը 2021-ի ստանձնելու հայտարարագիրը հրապարակել է տույժից (20.08.2021) հետո → DEC-R3 նրա 2024 և 2025 տարեկան հայտարարագրերում
  { code: 'D-107-2021-Ս', type: 2, person: 'PR-107', year: 2021, date: '2021-06-01', status: 'published', submittedon: '2021-09-10', position: 'Վարչության պետի տեղակալ', institution: 40, positiontype: 9, assumptiondate: '2021-06-01' },
];

function addSections(root, owner, spec, ctx, opts = {}) {
  const sec = {};
  const section = (table, flags) => (sec[table] ||= db.section(table, root, { declarationtype: ctx.declarationtype, declaranttype: ctx.declaranttype, ...flags }, opts));
  const base = (r, tab, ownerClone, fmType) => ({
    tabtype: tab, profile: ownerClone.instanceid, familymembertype: fmType ?? null,
    datafillingoption: r.filling ?? 1, status: r.status ?? null, declarationtype: ctx.declarationtype, declaranttype: ctx.declaranttype,
  });
  const rd = (r) => r.rateDate || spec.submittedon;
  const add = (o, ownerClone, fmType) => {
    for (const r of o.cash || []) db.detail('de_financialmeanscash', section('de_financialmeans', { hasavailablecash: 1 }), {
      ...base(r, 1, ownerClone, fmType), ...money('amountatbeginningofyear', r.start, r.cur, rd(r)), ...money('amountatendofyear', r.end, r.cur, rd(r)),
      sourceoforiginatbeginningofyear: r.origin ?? null, sourceoforiginatendofyear: r.origin ?? null, ownerfullname: null });
    for (const r of o.bank || []) db.detail('de_financialmeansbankaccountbalances', section('de_financialmeans', { hasavailablebankaccountbalances: 1 }), {
      ...base(r, 1, ownerClone, fmType), bankname: r.bank, ...money('amountatbeginningofyear', r.start, r.cur, rd(r)), ...money('amountatendofyear', r.end, r.cur, rd(r)), sourceoforigine: r.origin ?? null });
    for (const r of o.deposits || []) db.detail('de_loansanddepositsdepositdetails', section('de_loansanddeposits', { hasavailabledeposits: 1 }), {
      ...base(r, 1, ownerClone, fmType), bankname: r.bank, ...money('amountatbeginningofyear', r.start, r.cur, rd(r)), ...money('amountatendofyear', r.end, r.cur, rd(r)), originofdeposite: 4 });
    for (const r of o.loansGiven || []) db.detail('de_loansanddepositsloandetails', section('de_loansanddeposits', { hasavailableloans: 1 }), {
      ...base(r, 1, ownerClone, fmType), debtorname: r.debtor, ...money('amountatbeginningofyear', r.start, r.cur, rd(r)), ...money('amountatendofyear', r.end, r.cur, rd(r)),
      ...money('amountpaidduringyear', r.paid, r.cur, rd(r)), ...money('amountrepaidduringyear', r.repaid, r.cur, rd(r)) });
    for (const r of o.incomes || []) db.detail('de_revenuesincomes', section('de_revenues', { hasavailableincome: 1 }), {
      ...base(r, null, ownerClone, fmType), incometype: r.type, incomepayerfullname: r.payer, description: r.desc ?? null, natureofrelationshipwithpayer: r.rel ?? null, tin: r.tin ?? null, ...money('amount', r.amount, r.cur, rd(r)) });
    for (const r of o.remaining || []) db.detail('de_revenuesremainingprincipals', section('de_revenues', r.type === 1 ? { hasprincipalbalance: 1 } : { hasprincipalbalanceforloan: 1 }), {
      ...base(r, null, ownerClone, fmType), type: r.type, lenderfullname: r.lender, hasmortgage: yn(r.mortgage), subjectofmortgage: r.subject ?? null, mortgageaddress: r.address ?? null,
      creditpurpose: r.type === 1 ? r.purpose ?? null : null, loanpurpose: r.type === 2 ? r.purpose ?? null : null,
      ...(r.type === 1 ? money('creditprincipalbalance', r.balance, r.cur, rd(r)) : money('loanbalance', r.balance, r.cur, rd(r))) });
    for (const r of o.realestate || []) db.detail('de_realestatedetails', section('de_realestate', { [{ 1: 'hasrealestateatbeginningofyear', 2: 'hasacquiredrealestate', 3: 'hasalienatedrealestate' }[r.tab]]: 1 }), {
      ...base(r, r.tab, ownerClone, fmType), realestatetype: r.type, area: r.area, code: r.code, dealdate: r.dealdate ?? null, dealmethod: r.method ?? null,
      counterpartfullname: r.counterpart ?? null, ...money('dealamount', r.deal, r.cur, r.dealdate || rd(r)), propertyownershiptype: 1, availableattheendoftheyear: r.tab === 3 ? 2 : 1 });
    for (const r of o.vehicles || []) db.detail('de_vehicledetails', section('de_vehicle', { [{ 1: 'hasvehicleatbeginningofyear', 2: 'hasacquiredvehicle', 3: 'hasalienatedvehicle' }[r.tab]]: 1 }), {
      ...base(r, r.tab, ownerClone, fmType), vehiclemakestring: r.make, vehiclemodelstring: r.model, releaseyear: r.year, vin: r.vin, registrationnumber: r.regno,
      dealdate: r.dealdate ?? null, dealmethod: r.method ?? null, ...money('dealamount', r.deal, r.cur, r.dealdate || rd(r)), availableattheendoftheyear: r.tab === 3 ? 2 : 1 });
    for (const r of o.expenses || []) db.detail('de_expensesdetails', section('de_expenses', { hasexpensestobedeclared: 1 }), {
      ...base(r, null, ownerClone, fmType), expensetype: r.type, expensesummary: r.summary, ...money('amount', r.amount, r.cur, rd(r)) });
    for (const r of o.contracts || []) db.detail('de_contractsupon5mlndetails', section('de_contractsupon5mln', { hascontracts: 1 }), {
      ...base(r, null, ownerClone, fmType), counterpartname: r.counterpart, contractsubject: r.subject, contracttype: r.type, cost: r.cost, actualcost: r.cost, contractsigndate: r.sign, contractduedate: r.due });
  };
  add(spec, owner.clone, null);
  if (spec.minorRows) add(spec.minorRows, owner.members[spec.minorRows.member], FM.minor);
  if (spec.memberRows) add(spec.memberRows, owner.members[spec.memberRows.member], spec.memberRows.type);
  if (spec.parties) {
    const s = section('de_membershipinparties', { hasmembership: yn(spec.parties.length > 0) });
    for (const p of spec.parties) db.detail('de_membershipinpartiesdetails', s, { partyname: p.name, statusinparty: p.status, profile: owner.clone.instanceid, datafillingoption: 1, status: null });
  }
}

for (const s of SPECS) {
  const parent = s.parent ? KEYS.declaration[s.parent] : null;
  const declaranttype = parent ? DECLARANT_TYPE.family : DECLARANT_TYPE.officer;
  const owner = cloneProfile(s.person, { family: s.family, relatives: s.relatives, positions: s.positions, otherPositions: s.otherPositions });
  const rootFields = {
    code: s.code, year: s.year, declarationtype: s.type ?? 1, declaranttype, date: s.date ?? `${s.year}-12-31`, law: 6, declarationkind: declaranttype === 1 ? 3 : 1,
    declarant: owner.clone.instanceid, originaldeclarant: KEYS.person[s.person].instanceid, ssn: PEOPLE[s.person].ssn,
    parentdeclaration: parent ? parent.instanceid : null, parentoriginaldeclarant: parent ? parent.originaldeclarant : null,
    position: s.position ?? null, institution: s.institution ?? null, positiontype: s.positiontype ?? null,
    positionassumptiondate: s.assumptiondate ?? null, positionterminationdate: s.terminationdate ?? null,
    wfstateid: STATUS_WF[s.status], submittedon: ts(s.submittedon), publishedon: s.status === 'published' ? ts(s.submittedon, '20:00:00') : null,
  };
  const ctx = { declaranttype, declarationtype: s.type ?? 1 };
  let root;
  if (s.previousVersion) {
    // նախորդ հրապարակված տարբերակը (ուղղումից առաջ). ոչ ընթացիկ տող նույն instanceid-ով
    const pv = { ...s, ...s.previousVersion, realestate: s.realestate, expenses: [] };
    const old = db.versioned('de_declaration', { ...rootFields, submittedon: ts(pv.submittedon), publishedon: ts(pv.submittedon, '20:00:00') }, { current: false });
    addSections(old, owner, pv, ctx, { current: false });
    root = db.versioned('de_declaration', rootFields, { instanceid: old.instanceid });
  } else {
    root = db.versioned('de_declaration', rootFields);
  }
  KEYS.declaration[s.code] = root;
  if (s.status === 'draft') {
    if (s.overdue) db.versioned('de_declarationoverdueact', { yearid: s.year, declarationnumber: s.code, declaranttypeid: declaranttype, ssn: PEOPLE[s.person].ssn, fullname: `${PEOPLE[s.person].firstname} ${PEOPLE[s.person].lastname}`, positionalwork: s.position, institutionid: s.institution, datecreated: '2026-05-05T08:00:00' });
    continue;
  }
  addSections(root, owner, s, ctx);
}

// ───────────────────────────── նվերներ (de_gift)
// classification. 1 այցեր/միջոցառումներ, 2 կրթաթոշակ/դրամաշնորհ, 3 արարողակարգային, 4 պարգևատրում
// giftsubclassification. 1 Կրթաթոշակ, 2 Դրամաշնորհ, 3 Նպաստ (դաս. 2), 4 այցերի/միջոցառումների նվերներ, 5 հյուրասիրություն (դաս. 1)
const SUB_CLASS = { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1 };
function gift(o) {
  const currency = o.currency || 'AMD';
  const m = money('amount', o.amount, currency, o.receiptdate);
  const published = (o.wf ?? WF.gift.published) === WF.gift.published;
  const live = KEYS.person[o.recipient];
  const clone = cloneProfile(o.recipient).clone;
  const row = db.versioned('de_gift', {
    code: `GF-${String(Object.keys(KEYS.gift).length + 1).padStart(3, '0')}`,
    originalprofile: live.instanceid, clonedprofile: published ? clone.instanceid : null, profile: published ? clone.instanceid : live.instanceid,
    positionatwork: PEOPLE[o.recipient].positionatwork, institution: PEOPLE[o.recipient].institution,
    givertype: o.giverlegal ? PERSON_TYPE.legal : PERSON_TYPE.individual, givername: o.giverlegal ? null : o.giver, giverposition: o.giverposition ?? null,
    giverworkplace: o.giverworkplace ?? null, giverlegalentityname: o.giverlegal ?? null, giverlegalentitycountry: o.giverlegal ? (o.country ?? 1) : null,
    giverlegalentityactivityfield: o.activity ?? null,
    classification: o.sub ? SUB_CLASS[o.sub] : o.cls, giftsubclassification: o.sub ?? null, type: o.type ?? 1,
    description: o.description, ...m, amount_amd: Math.round(o.amount * (m.amount_ratetodefault || 1)),
    receiptdate: o.receiptdate, receiptyear: Number(o.receiptdate.slice(0, 4)), monthid: Number(o.receiptdate.slice(5, 7)), receiptcircumstance: o.circumstance || 'Աշխատանքային միջոցառում',
    wfstateid: o.wf ?? WF.gift.published, publishgift: yn(published), ishighvaluegift: Math.round(o.amount * (m.amount_ratetodefault || 1)) > 1000000,
    submittedon: ts(o.receiptdate, '12:00:00'), publishedon: published ? ts(o.receiptdate, '18:00:00') : null, acceptedevaluation: null, unabletodeterminevalue: false, amountfromaisuggestion: false,
  });
  KEYS.gift[o.description + (o.key || '')] = row;
  return row;
}

const GIFTS = [
  // Անի Խաչատրյան (PR-110). 2024՝ 3 նվեր, 2025՝ 10 նվեր (քանակի աճ)
  { recipient: 'PR-110', receiptdate: '2024-03-08', sub: 4, description: 'Ծաղկեփունջ և հուշանվեր', amount: 25000, giver: 'Կարեն Սողոմոնյան', giverposition: 'Տնօրեն', giverworkplace: 'Դպրոց N 12', key: '#1' },
  { recipient: 'PR-110', receiptdate: '2024-06-15', sub: 4, description: 'Գիրք-ալբոմ', amount: 30000, giverlegal: 'Կրթական զարգացման հիմնադրամ', activity: 'Կրթություն' },
  { recipient: 'PR-110', receiptdate: '2024-12-20', sub: 4, description: 'Ամանորյա հուշանվեր', amount: 40000, giverlegal: '«Բիլդ Գրուպ» ՍՊԸ', activity: 'Շինարարություն', key: '#ani2024' },
  { recipient: 'PR-110', receiptdate: '2025-01-20', sub: 1, type: 2, description: 'Կրթաթոշակ մագիստրոսական ծրագրի համար', amount: 600000, giverlegal: 'Կրթական զարգացման հիմնադրամ', activity: 'Կրթություն', circumstance: 'Հրապարակային մրցույթ' },
  { recipient: 'PR-110', receiptdate: '2025-02-14', sub: 4, description: 'Հուշանվեր՝ ձեռագործ գորգ (փոքր)', amount: 150000, giverlegal: '«Բիլդ Գրուպ» ՍՊԸ', activity: 'Շինարարություն' },
  { recipient: 'PR-110', receiptdate: '2025-03-08', sub: 4, description: 'Բջջային հեռախոս', amount: 450000, giver: 'Հայկ Խաչատրյան', circumstance: 'Ծննդյան օր' },
  { recipient: 'PR-110', receiptdate: '2025-04-02', sub: 4, description: 'Նոութբուք', amount: 700000, giverlegal: '«ԱրմՏեխ» ՍՊԸ', activity: 'Տեղեկատվական տեխնոլոգիաներ' },
  { recipient: 'PR-110', receiptdate: '2025-05-11', sub: 4, description: 'Գիրք', amount: 20000, giver: 'Լուսինե Մանուկյան', giverposition: 'Ուսուցչուհի', giverworkplace: 'Դպրոց N 3' },
  { recipient: 'PR-110', receiptdate: '2025-06-01', sub: 4, description: 'Հուշամեդալ', amount: 35000, giverlegal: 'Մանկավարժական համալսարան', activity: 'Կրթություն' },
  { recipient: 'PR-110', receiptdate: '2025-09-01', sub: 4, description: 'Ծաղկեփունջ և հուշանվեր', amount: 30000, giver: 'Արմինե Ղուկասյան', giverposition: 'Տնօրեն', giverworkplace: 'Դպրոց N 45', key: '#2' },
  { recipient: 'PR-110', receiptdate: '2025-10-05', sub: 5, type: 2, description: 'Համաժողովի մասնակցության հյուրընկալություն', amount: 250000, giverlegal: 'Եվրոպական կրթական ցանց', country: 22, activity: 'Կրթություն' },
  { recipient: 'PR-110', receiptdate: '2025-11-20', sub: 4, description: 'Գրքերի հավաքածու', amount: 60000, giverlegal: '«Էդիթ Պրինտ» հրատարակչություն', activity: 'Հրատարակչություն', wf: WF.gift.submitted },
  { recipient: 'PR-110', receiptdate: '2025-12-24', sub: 4, description: 'Ամանորյա հուշանվեր', amount: 45000, giverlegal: 'Կրթական զարգացման հիմնադրամ', activity: 'Կրթություն', key: '#ani2025' },
  // Մարիամ Գևորգյան (PR-113). 2024՝ 4, 2025՝ 5. կրթաթոշակ 100 000 (ռեֆերենս) և 0 արժեքով
  { recipient: 'PR-113', receiptdate: '2024-02-10', sub: 4, description: 'Հուշանվեր', amount: 20000, giverlegal: 'Ֆինանսական կրթության կենտրոն', key: '#m1' },
  { recipient: 'PR-113', receiptdate: '2024-05-20', sub: 4, description: 'Գիրք', amount: 15000, giver: 'Արամ Սահակյան', key: '#m2' },
  { recipient: 'PR-113', receiptdate: '2024-09-12', sub: 5, type: 2, description: 'Սեմինարի հյուրընկալություն', amount: 120000, giverlegal: 'Միջազգային ֆինանսական ինստիտուտ', country: 14 },
  { recipient: 'PR-113', receiptdate: '2024-12-28', sub: 4, description: 'Ամանորյա հուշանվեր', amount: 25000, giverlegal: 'Ֆինանսական կրթության կենտրոն', key: '#m3' },
  { recipient: 'PR-113', receiptdate: '2025-01-25', sub: 1, type: 2, description: 'Կրթաթոշակ վերապատրաստման դասընթացի համար', amount: 100000, giverlegal: 'Ֆինանսական կրթության կենտրոն', circumstance: 'Հրապարակային մրցույթ' },
  { recipient: 'PR-113', receiptdate: '2025-03-15', sub: 1, type: 2, description: 'Անվճար դասընթաց (կրթաթոշակ)', amount: 0, giverlegal: 'Ֆինանսական կրթության կենտրոն' },
  { recipient: 'PR-113', receiptdate: '2025-06-10', sub: 4, description: 'Հուշանվեր', amount: 18000, giver: 'Գոհար Մնացականյան', key: '#m4' },
  { recipient: 'PR-113', receiptdate: '2025-09-30', sub: 5, type: 2, description: 'Համաժողովի հյուրընկալություն', amount: 140000, giverlegal: 'Միջազգային ֆինանսական ինստիտուտ', country: 14 },
  { recipient: 'PR-113', receiptdate: '2025-12-27', sub: 4, description: 'Ամանորյա հուշանվեր', amount: 22000, giverlegal: 'Ֆինանսական կրթության կենտրոն', key: '#m5' },
  // Սուրեն Վարդանյան (PR-109)
  { recipient: 'PR-109', receiptdate: '2025-02-05', sub: 1, type: 2, description: 'Կրթաթոշակ մասնագիտական վերապատրաստման համար', amount: 120000, giverlegal: 'Քաղաքաշինական նախաձեռնությունների հիմնադրամ' },
  { recipient: 'PR-109', receiptdate: '2025-07-14', sub: 4, description: 'Հուշանվեր', amount: 35000, giver: 'Տաթևիկ Հարությունյան', key: '#s1' },
  // Արմեն Հովհաննիսյան (PR-101)
  { recipient: 'PR-101', receiptdate: '2024-10-10', sub: 4, description: 'Հուշանվեր՝ արծաթե գրիչ', amount: 90000, giverlegal: 'Գործարարների միություն' },
  { recipient: 'PR-101', receiptdate: '2025-03-21', cls: 3, description: 'Ձեռքի ժամացույց (շվեյցարական արտադրության)', amount: 1450000, giverlegal: '«Լյուքս Թայմ» ՍՊԸ', activity: 'Մանրածախ առևտուր' },
  { recipient: 'PR-101', receiptdate: '2025-08-05', sub: 5, type: 2, description: 'Հանգստյան գոտու ուղեգիր', amount: 300000, giver: 'Գագիկ Մելքոնյան', circumstance: 'Ծննդյան օր' },
  // Լևոն Բաբայան (PR-112)
  { recipient: 'PR-112', receiptdate: '2025-06-18', sub: 5, type: 2, description: 'Միջազգային համաժողովի ճանապարհածախս և կացություն', amount: 3000, currency: 'USD', giverlegal: 'Global Health Forum', country: 43, activity: 'Առողջապահություն' },
  { recipient: 'PR-112', receiptdate: '2025-11-02', sub: 4, description: 'Պլանշետ', amount: 1000000, giverlegal: '«ՄեդՏեխ» ՍՊԸ', activity: 'Բժշկական սարքավորումներ', wf: WF.gift.approved },
  // Սամվել Թորոսյան (PR-114). արժեքի աճ՝ 400 000 → 2 600 000
  { recipient: 'PR-114', receiptdate: '2024-04-12', sub: 4, description: 'Հուշանվեր', amount: 150000, giver: 'Ռաֆիկ Հովսեփյան', key: '#t1' },
  { recipient: 'PR-114', receiptdate: '2024-11-30', sub: 4, description: 'Գինու հավաքածու', amount: 250000, giverlegal: '«Արտաշատ Վայն» ՍՊԸ' },
  { recipient: 'PR-114', receiptdate: '2025-03-03', sub: 4, description: 'Հեռուստացույց', amount: 900000, giverlegal: '«Արարատ Ագրո» ՍՊԸ' },
  { recipient: 'PR-114', receiptdate: '2025-07-19', sub: 4, description: 'Ոսկե մանժետի կոճակներ', amount: 1000000, giver: 'Մանվել Ադամյան' },
  { recipient: 'PR-114', receiptdate: '2025-12-30', sub: 4, description: 'Սուրճի մեքենա', amount: 700000, giverlegal: '«Արարատ Ագրո» ՍՊԸ' },
];
GIFTS.forEach(gift);

// EPD-ում AI գործիքով կատարված գնահատում (de_giftpriceevaluation, GIF-04). նախատիպում՝ միայն ցուցադրվում է
const EVALS = [
  { gift: 'Ձեռքի ժամացույց (շվեյցարական արտադրության)', item: 'Շվեյցարական մեխանիկական ձեռքի ժամացույց', value: 1300000, min: 1100000, max: 1650000, conf: 2, official: true, sources: [{ name: 'Պաշտոնական դիլերի կայք', url: 'https://example.am/watch', official: true, price: 1290000 }, { name: 'Առցանց խանութ', url: 'https://shop.example.com/watch', official: false, price: 1420000 }] },
  { gift: 'Նոութբուք', item: 'Նոութբուք 14", միջին դասի', value: 650000, min: 520000, max: 780000, conf: 1, official: true, sources: [{ name: 'Արտադրողի կայք', url: 'https://example.com/laptop', official: true, price: 640000 }] },
  { gift: 'Բջջային հեռախոս', item: 'Սմարթֆոն', value: 480000, min: 420000, max: 560000, conf: 1, official: false, sources: [{ name: 'Առցանց խանութ', url: 'https://shop.example.am/phone', official: false, price: 480000 }] },
  { gift: 'Հուշանվեր՝ ձեռագործ գորգ (փոքր)', unable: true, conf: 3, sources: [] },
  { gift: 'Հեռուստացույց', item: 'Հեռուստացույց 55"', value: 380000, min: 300000, max: 520000, conf: 2, official: false, sources: [{ name: 'Առցանց խանութ', url: 'https://shop.example.am/tv', official: false, price: 390000 }] },
];
for (const e of EVALS) {
  const g = KEYS.gift[e.gift];
  const ev = db.versioned('de_giftpriceevaluation', {
    gift: g.instanceid, status: 2, model: 'mock', identifieditem: e.item ?? null, estimatedvalue_amd: e.value ?? null, estimatedvaluemin_amd: e.min ?? null, estimatedvaluemax_amd: e.max ?? null,
    estimationconfidence: e.conf, identificationconfidence: e.conf, unabletodeterminevalue: !!e.unable, officialdatafound: !!e.official, requestedon: g.submittedon,
  });
  for (const s of e.sources) db.detail('de_giftpriceevaluationsource', ev, { url: s.url, sourcetype: s.name, isofficial: s.official, price: s.price, currency: 'AMD', priceinamd: s.price, foundinsearch: true });
}

// ───────────────────────────── կուսակցություններ և հաշվետվություններ (de_party, de_report)
const PARTIES = { 'PA-1': 'Միասնական առաջընթաց', 'PA-2': 'Քաղաքացիական ձայն', 'PA-3': 'Նոր հորիզոն', 'PA-4': 'Ազատ ընտրություն' };
for (const [k, name] of Object.entries(PARTIES)) KEYS.party[k] = db.versioned('de_party', { name, iscloned: yn(false), clonedfromparty: null, wfstateid: WF.party.approved, registrationdate: '2015-01-01' });

const don = (fullname, idn, amount, date, currency = 'AMD', extra = {}) => ({ fullname, identitydocumentnumber: idn, amount, date, currency, ...extra });
const REPORTS = [
  {
    code: 'RP-1-2025', party: 'PA-1', year: 2025, submittedon: '2026-03-25', wf: WF.report.published,
    previousVersion: { submittedon: '2026-03-10', monetary: [don('Արսեն Մարտիրոսյան', '0000102295', 16000000, '2025-03-10')] },
    monetary: [don('Արսեն Մարտիրոսյան', '0000102295', 6000000, '2025-03-10'), don('Կարինե Դավթյան', '0000100852', 9500000, '2025-05-05'), don('Անի Խաչատրյան', '0000101333', 800000, '2025-11-11'), don('Գոռ Եղիազարյան', '0000101000', 10000, '2025-08-15', 'USD'), don('Վարդան Պետրոսյան', '0000102036', 4000000, '2025-03-30')],
    membership: [don('Կարինե Դավթյան', '0000100852', 600000, '2025-12-15'), don('Անի Խաչատրյան', '0000101333', 240000, '2025-12-10'), don('Սուրեն Վարդանյան', '0000101777', 120000, '2025-12-10')],
    nonmonetary: [{ fullname: 'Գոռ Եղիազարյան', identitydocumentnumber: '0000101000', donationtype: 4, donationobject: 'Ավտոմեքենա Toyota Land Cruiser Prado, 2021', amount: 6500000, date: '2025-09-02' }],
    cheap: [{ cadastralnumber: '01-005-0111-0002', realestatetype: 10, cadastralvalue: 48000000, marketvalue: 60000000, amount: 0, nonmonetaryincome: 1200000, rentorusagedurationindays: 365, realestatearea: 120, renterfullname: 'Վարդան Պետրոսյան', fulllocation: 'Երևան, Մաշտոցի 33' }],
    cashflow: { begin: 3500000, expTotal: 25800000, correction: -15000, incomes: [[2, 24682000], [3, 960000]], exp: [[1, 9600000, 0], [10, 14200000, 6500000], [4, 2000000, 1200000]] },
  },
  {
    code: 'RP-2-2025', party: 'PA-2', year: 2025, submittedon: '2026-03-28', wf: WF.report.submitted,
    monetary: [don('Արսեն Մարտիրոսյան', '0000102295', 5000000, '2025-07-22'), don('Կարեն Մարտիրոսյան', '0000101740', 3000000, '2025-09-09'), don('Վարդան Պետրոսյան', '', 7000000, '2025-10-14'), don('Աննա Ստեփանյան', '0000100630', 500000, '2025-05-19')],
    membership: [don('Աննա Ստեփանյան', '0000100630', 60000, '2025-12-01'), don('Տարոն Մելիքյան', '0000101185', 60000, '2025-12-03')],
    entry: [don('Տարոն Մելիքյան', '0000101185', 10000, '2025-02-01')],
    nonmonetary: [{ fullname: 'Աննա Ստեփանյան', identitydocumentnumber: '0000100630', donationtype: 4, donationobject: 'Տպագրական ծառայություններ', amount: 250000, date: '2025-06-11' }],
    prohibited: [{ fullname: '«Ալֆա Կոնսալտ» ՍՊԸ', identitydocumentnumber: '02512345', amount: 2000000, date: '2025-05-02', returnamount_amd: 2000000, returndate: '2025-06-20' }],
    excessive: [{ amount: 2000000 }],
    realestate: [{ counterpartfullname: 'Կարեն Մարտիրոսյան', realestatetype: 10, cadastralprice: 9000000, marketprice: 14000000, dealamount: 9000000, dealdate: '2025-10-01', dealmethod: 3, cadastralnumber: '01-007-0222-0005' }],
    cashflow: { begin: 1200000, expTotal: 17500000, correction: 0, incomes: [[2, 17500000], [3, 70000]], exp: [[1, 6000000, 0], [4, 3500000, 0], [10, 8000000, 250000]] },
  },
  {
    code: 'RP-3-2025', party: 'PA-3', year: 2025, submittedon: '2026-03-20', wf: WF.report.published,
    monetary: [don('Հրանտ Սիմոնյան', '0000100297', 10000000, '2025-04-18'), don('Արտակ Բադալյան', '', 2000000, '2025-02-12'), don('Մհեր Զաքարյան', '0000101518', 1200000, '2025-12-02')],
    membership: [don('Մհեր Զաքարյան', '0000101518', 120000, '2025-11-28'), don('Շուշան Գալստյան', '0000100149', 120000, '2025-11-28')],
    entry: [don('Շուշան Գալստյան', '0000100149', 10000, '2025-01-15')],
    nonmonetary: [{ fullname: 'Արտակ Բադալյան', identitydocumentnumber: '', donationtype: 4, donationobject: 'Գրասենյակային կահույք', amount: 500000, date: '2025-03-20' }],
    freeofcharge: [{ fullname: 'Արտակ Բադալյան', natureofworkservice: 'Գրասենյակի վերանորոգում', amount: 900000, date: '2025-03-15' }],
    cheap: [{ cadastralnumber: '07-012-0045-0001', realestatetype: 10, cadastralvalue: 15000000, marketvalue: 18000000, amount: 200000, nonmonetaryincome: 175000, rentorusagedurationindays: 180, realestatearea: 70, renterfullname: 'Մհեր Զաքարյան', fulllocation: 'Գյումրի, Ռիժկովի 8' }],
    cashflow: { begin: 800000, expTotal: 12100000, correction: 4000, incomes: [[2, 13200000], [3, 250000]], exp: [[1, 4800000, 0], [10, 7300000, 1575000]] },
  },
  {
    code: 'RP-4-2025', party: 'PA-4', year: 2025, submittedon: '2026-03-30', wf: WF.report.submitted,
    monetary: [don('Սոնա Հակոբյան', 'AT0456789', 1500000, '2025-06-30'), don('Լիանա Գասպարյան', '0000100556', 800000, '2025-10-01'), don('Նաիրա Մովսիսյան', '0000101851', 300000, '2025-04-04')],
    membership: [don('Նաիրա Մովսիսյան', '0000101851', 36000, '2025-12-20'), don('Սոնա Հակոբյան', 'AT0456789', 36000, '2025-12-20')],
    entry: [don('Նաիրա Մովսիսյան', '0000101851', 5000, '2025-03-01')],
    noncompliant: [{ fullname: 'Անհայտ նվիրատու', identitydocumentnumber: '', amount: 400000, date: '2025-08-08', otherdata: 'Անանուն փոխանցում' }],
    cashflow: { begin: 250000, expTotal: 2900000, correction: 0, incomes: [[2, 2600000], [3, 77000]], exp: [[7, 2900000, 0]] },
  },
  {
    code: 'RP-1-2024', party: 'PA-1', year: 2024, submittedon: '2025-03-24', wf: WF.report.published,
    monetary: [don('Արսեն Մարտիրոսյան', '0000102295', 4000000, '2024-06-10'), don('Կարինե Դավթյան', '0000100852', 2000000, '2024-09-01')],
    cashflow: { begin: 1800000, expTotal: 4800000, correction: 0, incomes: [[2, 6000000]], exp: [[7, 4800000, 0]] },
  },
];

function reportSections(root, r, opts = {}) {
  const meta = { year: r.year, reporttype: REPORT_TYPE.yearly, reportkind: r.year >= 2025 ? 3 : 2 };
  const inc = db.section('de_reportincomes', root, { ...meta }, opts);
  for (const d of r.monetary || []) {
    const m = money('amount', d.amount, d.currency, d.date);
    db.detail('de_reportincomesmonetarydonationsofindividuals', inc, { ...meta, fullname: d.fullname, identitydocumentnumber: d.identitydocumentnumber, ...m, amount_amd: Math.round(d.amount * m.amount_ratetodefault), date: d.date, returnamount_amd: d.returnamount_amd ?? null, returndate: d.returndate ?? null, otherdata: null });
  }
  for (const d of r.membership || []) db.detail('de_reportincomesmembershipfees', inc, { ...meta, fullname: d.fullname, identitydocumentnumber: d.identitydocumentnumber, amount: d.amount, date: d.date, otherdata: null });
  for (const d of r.entry || []) db.detail('de_reportincomesentryfees', inc, { ...meta, fullname: d.fullname, identitydocumentnumber: d.identitydocumentnumber, amount: d.amount, date: d.date, otherdata: null });
  for (const d of r.nonmonetary || []) db.detail('de_reportincomesothernonmonetarydonations', inc, { ...meta, ...d, otherdata: null });
  for (const d of r.prohibited || []) db.detail('de_reportincomesprohibitedmonetarydonations', inc, { year: r.year, fullname: d.fullname, identitydocumentnumber: d.identitydocumentnumber, ...money('amount', d.amount, 'AMD', d.date), amount_amd: d.amount, date: d.date, returnamount_amd: d.returnamount_amd, returndate: d.returndate, otherdata: null });
  for (const d of r.noncompliant || []) db.detail('de_reportincomesnoncompliantandnottransferredmonetarydonations', inc, { fullname: d.fullname, identitydocumentnumber: d.identitydocumentnumber, ...money('amount', d.amount, 'AMD', d.date), amount_amd: d.amount, date: d.date, returnamount_amd: null, returndate: null, otherdata: d.otherdata });
  for (const d of r.excessive || []) db.detail('de_reportincomesexcessiveorprohibitedmonetarydonations', inc, { ...money('amount', d.amount, 'AMD'), amount_amd: d.amount, otherdata: null });
  for (const d of r.freeofcharge || []) db.detail('de_reportincomesfreeofchargeworksservices', inc, { ...d, otherdata: null });
  for (const d of r.cheap || []) db.detail('de_reportincomescheapordonatedrealestate', inc, { ...meta, ...d, otherdata: null });
  const monetaryTotal = (r.monetary || []).reduce((s, d) => s + d.amount * (money('amount', d.amount, d.currency, d.date).amount_ratetodefault), 0);
  inc.monetaryincomestotal = Math.round(monetaryTotal);
  inc.nonmonetaryincomestotal = (r.nonmonetary || []).reduce((s, d) => s + d.amount, 0) + (r.cheap || []).reduce((s, d) => s + d.nonmonetaryincome, 0);
  const cf = db.section('de_reportcashflow', root, { ...meta, amountatbeginningofyear: r.cashflow.begin, monetaryexpenditurestotal: r.cashflow.expTotal, amountcorrection: r.cashflow.correction }, opts);
  for (const [type, amount] of r.cashflow.incomes) db.detail('de_reportcashflowincomes', cf, { ...meta, type, amount });
  for (const [type, amount, non] of r.cashflow.exp) db.detail('de_reportcashflowexpenditures', cf, { ...meta, type, amount, nonmonetaryamount: non });
  if (r.realestate) {
    const re = db.section('de_reportrealestate', root, { ...meta }, opts);
    for (const d of r.realestate) db.detail('de_reportrealestatedetails', re, { ...d, type: 1 });
  }
}

for (const r of REPORTS) {
  const original = KEYS.party[r.party];
  const clone = db.versioned('de_party', { name: PARTIES[r.party], iscloned: yn(true), clonedfromparty: original.instanceid, wfstateid: WF.party.approved });
  const fields = { code: r.code, party: clone.instanceid, originalparty: original.instanceid, year: r.year, reporttype: REPORT_TYPE.yearly, reportkind: r.year >= 2025 ? 3 : 2, law: 9, wfstateid: r.wf, submittedon: ts(r.submittedon), publishedon: r.wf === WF.report.published ? ts(r.submittedon, '20:00:00') : null };
  let root;
  if (r.previousVersion) {
    const old = db.versioned('de_report', { ...fields, submittedon: ts(r.previousVersion.submittedon) }, { current: false });
    reportSections(old, { ...r, ...r.previousVersion, membership: [], nonmonetary: [], cheap: [] }, { current: false });
    root = db.versioned('de_report', fields, { instanceid: old.instanceid });
  } else root = db.versioned('de_report', fields);
  KEYS.report[r.code] = root;
  reportSections(root, r);
}
// Նախնական հաշվետվություն (reporttype = 1). չի վերլուծվում
{
  const original = KEYS.party['PA-1'];
  const clone = db.versioned('de_party', { name: PARTIES['PA-1'], iscloned: yn(true), clonedfromparty: original.instanceid, wfstateid: WF.party.approved });
  KEYS.report['RP-1-2025-PRE'] = db.versioned('de_report', { code: 'RP-1-2025-PRE', party: clone.instanceid, originalparty: original.instanceid, year: 2025, reporttype: REPORT_TYPE.preliminary, reportkind: 1, law: 9, wfstateid: WF.report.submitted, submittedon: ts('2025-05-20') });
}

// ───────────────────────────── բարեվարքության հարցաթերթիկներ (de_integrity)
const QUESTIONNAIRES = [
  {
    code: 'IQ-201', person: 'PR-109', type: 2, wf: WF.integrity.screening, submissiondate: '2026-09-14',
    work: [
      { institutionname: 'Քաղաքաշինության կոմիտե', position: 'Վարչության պետ', startmonth: 3, startyear: 2024 },
      { institutionname: 'Երևանի պետական համալսարան', position: 'Դասախոս (համատեղությամբ)', startmonth: 9, startyear: 2024 },
      { institutionname: 'Երևանի քաղաքապետարան', position: 'Առաջատար մասնագետ', startmonth: 2, startyear: 2015, endmonth: 3, endyear: 2019 },
    ],
    interests: { relatives: true, party: false },
    relatives: [
      { relationwithnominee: 4, relativefullname: 'Արթուր Վարդանյան', employername: 'Կադաստրի կոմիտե', position: 'Բաժնի պետ', startdate: '2020-01-15' },
      { relationwithnominee: 9, relativefullname: 'Կարինե Մելիքյան', employername: 'Քաղաքաշինության կոմիտե', position: 'Գլխավոր մասնագետ', startdate: '2022-04-01' },
    ],
    liability: { administrative: true },
    administrative: [
      { liabilitytype: 'Տուգանք', basis: 'Վարչական իրավախախտումների օրենսգրքի 123 հոդված', date: '2025-12-02', applyingbody: 'Ճանապարհային ոստիկանություն' },
      { liabilitytype: 'Տուգանք', basis: 'Վարչական իրավախախտումների օրենսգրքի 126 հոդված', date: '2026-05-14', applyingbody: 'Ճանապարհային ոստիկանություն' },
    ],
    administrativeInfo: [{ circumstancesdescription: 'Արագության գերազանցում, ոչ սթափ վիճակի ստուգում չի կատարվել', appealinformationandgrounds: 'Չի բողոքարկվել' }],
    cash: [{ amount: 1200000, origin: 4 }],
  },
  { code: 'IQ-202', person: 'PR-115', type: 1, wf: WF.integrity.screening, submissiondate: '2026-09-20', work: [{ institutionname: '«Լեքս» իրավաբանական ընկերություն', position: 'Փաստաբան', startmonth: 1, startyear: 2017 }], interests: {}, liability: {}, cash: [{ amount: 1200000, origin: 4 }], bank: [{ bankname: 'Ամերիաբանկ', amount: 2500000 }] },
  {
    code: 'IQ-203', person: 'PR-116', type: 1, wf: WF.integrity.screening, submissiondate: '2026-10-02',
    work: [{ institutionname: 'Գլխավոր դատախազություն', position: 'Դատախազի օգնական', startmonth: 5, startyear: 2014 }], interests: {},
    liability: { disciplinary: true, conviction: true, revoked: true, civil: true },
    disciplinary: [{ organizationname: 'Գլխավոր դատախազություն', liabilitytype: 'Նկատողություն', basis: 'Դատավարական ժամկետների խախտում', date: '2021-11-03' }],
    disciplinaryInfo: [{ circumstancesdescription: 'Մեղադրական եզրակացության ներկայացումը ձգձգել է ավելի քան երկու ամիս՝ ծանրաբեռնվածության պատճառով', appealinformationandgrounds: 'Չի բողոքարկվել', appellationfinalresult: 'Նկատողությունը մնացել է ուժի մեջ' }],
    conviction: [{ casenumber: 'ԵԴ/0451/01/08', criminalcodearticle: '242 հոդվածի 1-ին մաս', punishmenttype: 'Տուգանք', actdate: '2009-02-17' }],
    revoked: [{ judicialcasenumber: 'ԵԴ/0451/01/08', criminalcodebasis: '242 հոդվածի 1-ին մաս', judicialactdate: '2010-02-17' }],
    civil: [
      { partystatus: 'Պատասխանող', casenumber: 'ԵԴ/12345/02/19', requirement: 'Ալիմենտի բռնագանձում', actdate: '2019-09-10', actnature: 'Վճիռ', additionalinformation: 'Ալիմենտի վճարումը կատարվում է ամսական' },
      { partystatus: 'Հայցվոր', casenumber: 'ԵԴ/22410/02/21', requirement: 'Պարտքի բռնագանձում', actdate: '2021-06-01', actnature: 'Հաշտության համաձայնություն', additionalinformation: '' },
      { partystatus: 'Երրորդ անձ', casenumber: 'ԵԴ/30117/02/23', requirement: 'Սեփականության իրավունքի ճանաչում', actdate: '2023-04-18', actnature: 'Վճիռ', additionalinformation: '' },
      { partystatus: 'Պատասխանող', casenumber: 'ԵԴ/41007/02/25', requirement: 'Վնասի հատուցում', actdate: '2025-02-27', actnature: 'Վճիռ', additionalinformation: 'Պահանջը մերժվել է' },
    ],
    cash: [{ amount: 2000, cur: 'USD', origin: 8 }],
  },
  {
    code: 'IQ-204', person: 'PR-117', type: 1, wf: WF.integrity.screening, submissiondate: '2026-10-11', family: [{ member: 'PR-119', type: FM.spouse }],
    work: [{ institutionname: 'Քննչական կոմիտե', position: 'Ավագ քննիչ', startmonth: 9, startyear: 2012 }], interests: {},
    liability: { prosecutions: true },
    prosecutions: [{ basisarticle: '309 հոդվածի 1-ին մաս', startdate: '2018-03-12', enddate: '2018-11-30', prosecutingauthority: 'Հատուկ քննչական ծառայություն', prosecutiondecision: 'Քրեական հետապնդումը դադարեցվել է ոչ արդարացնող հիմքով՝ վաղեմության ժամկետն անցնելու պատճառով', prosecutiondecisiondocument: 'FILE-77812' }],
    subculture: { 3: 'Հարևանների հետ վեճի ժամանակ դիմել է ծանոթի միջնորդությանը' },
    cash: [{ amount: 4000000, origin: 8 }, { amount: 1500000, origin: 5, member: 'PR-119' }],
    bank: [{ bankname: 'Ակբա բանկ', amount: 300000 }],
  },
  { code: 'IQ-205', person: 'PR-107', type: 2, wf: WF.integrity.screening, submissiondate: '2026-10-20', work: [{ institutionname: 'Ֆինանսների նախարարություն', position: 'Վարչության պետի տեղակալ', startmonth: 6, startyear: 2021 }], interests: {},
    liability: {}, administrative: [{ liabilitytype: 'Նախազգուշացում', basis: '—', date: '2019-01-10', applyingbody: 'Ճանապարհային ոստիկանություն' }],
    administrativeInfo: [{ circumstancesdescription: 'Կայանման խախտում (ոչ սթափ վիճակի հետ կապ չունի)' }], cash: [{ amount: 700000, origin: 4 }] },
  // «Ուսումնասիրության փուլ» կարգավիճակ չունի → մոդուլը չի վերցնում (INT-01)
  { code: 'IQ-206', person: 'PR-118', type: 1, wf: WF.integrity.submitted, submissiondate: '2026-11-05', work: [], interests: {}, liability: {}, cash: [] },
];

for (const q of QUESTIONNAIRES) {
  const { clone, members } = cloneProfile(q.person, { family: q.family || [] });
  const year = Number(q.submissiondate.slice(0, 4));
  const meta = { integritytype: q.type, integritykind: 1 };
  const root = db.versioned('de_integrity', {
    code: q.code, ...meta, year, month: Number(q.submissiondate.slice(5, 7)), date: q.submissiondate, submissiondate: q.submissiondate,
    receiveddate: q.wf === WF.integrity.screening ? q.submissiondate : null, profile: clone.instanceid, originalprofile: KEYS.person[q.person].instanceid, wfstateid: q.wf,
  });
  KEYS.integrity[q.code] = root;
  for (const f of q.family || []) db.detail('de_integrityfamilymemberconsents', root, { profile: members[f.member].instanceid, familymembertype: f.type, consentdocument: 'FILE-CONSENT' });
  const work = db.section('de_integritywork', root, { ...meta, haveworkexperience: yn(q.work.length > 0) });
  for (const w of q.work) db.detail('de_integrityworkpositions', work, { institutionname: w.institutionname, position: w.position, startmonth: w.startmonth, startyear: w.startyear, endmonth: w.endmonth ?? null, endyear: w.endyear ?? null, terminationreason: null });
  const int = db.section('de_integrityinterests', root, { ...meta, haverelationshipwithpositionholders: yn(!!q.interests.relatives), havepartymembership: yn(!!q.interests.party), hadsocialmediaaccounts: yn(false) });
  for (const r of q.relatives || []) db.detail('de_integrityinterestspublicofficerelatives', int, { ...r, enddate: r.enddate ?? null });
  for (const p of q.partyMembership || []) db.detail('de_integrityinterestspartymembership', int, p);
  const L = q.liability;
  const lia = db.section('de_integrityliability', root, {
    ...meta, havedisciplinaryliabilities: yn(!!L.disciplinary), havecriminalliabilities: yn(!!L.criminal), haveconviction: yn(!!L.conviction), isconvictionrevoked: yn(!!L.revoked),
    haveunfulfilledterminatedprosecutions: yn(!!L.prosecutions), haveadministrativeliabilities: yn(!!L.administrative), havecivilcaseparticipation: yn(!!L.civil),
  });
  for (const [key, table] of [['disciplinary', 'de_integrityliabilitydisciplinary'], ['disciplinaryInfo', 'de_integrityliabilitydisciplinaryadditionalinformation'], ['conviction', 'de_integrityliabilityconviction'], ['revoked', 'de_integrityliabilityrevocatedconviction'], ['prosecutions', 'de_integrityliabilityunfulfilledterminatedprosecutions'], ['administrative', 'de_integrityliabilityadministrative'], ['administrativeInfo', 'de_integrityliabilityadministrativeadditionalinformation'], ['civil', 'de_integrityliabilitycivilcaseparticipation']])
    for (const r of q[key] || []) db.detail(table, lia, r);
  const sub = db.section('de_integrityrelationtocriminalsubculture', root, { ...meta, haverelation: yn(!!q.subculture), havefamilymemberrelation: yn(false) });
  for (const a of [1, 2, 3, 4]) db.detail('de_integrityrelationtocriminalsubculturenomineeinfo', sub, { activity: a, haverelation: yn(!!q.subculture?.[a]), description: q.subculture?.[a] || null });
  const fin = db.section('de_integrityfinancialmeans', root, { ...meta, hascash: yn(q.cash.length > 0), hasbankaccountbalances: yn(!!q.bank?.length) });
  for (const c of q.cash) {
    const ownerClone = c.member ? members[c.member] : clone;
    db.detail('de_integrityfinancialmeanscash', fin, { ...meta, type: 1, profile: ownerClone.instanceid, familymembertype: c.member ? FM.spouse : null, sourceoforigin: c.origin, ...money('amount', c.amount, c.cur, q.submissiondate), datafillingoption: 1, status: null, ownerfullname: null });
  }
  for (const b of q.bank || []) db.detail('de_integrityfinancialmeansbankaccountbalances', fin, { ...meta, type: 1, profile: clone.instanceid, familymembertype: null, bankname: b.bankname, ...money('amount', b.amount, 'AMD', q.submissiondate), datafillingoption: 1, status: null });
}

export const TABLES = db.tables;
