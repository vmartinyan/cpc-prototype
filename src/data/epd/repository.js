/**
 * EPD repository. տվյալների ընթերցում Database Guide-ի «reading recipe»-ով (գլ. 2.12).
 *   1. versioned աղյուսակներից վերցվում են միայն ընթացիկ տարբերակները (de_<table>publisheditem)
 *   2. section → root. parentid = root.instanceid; detail → section. parentid = section.entityid
 *   3. MAIN_ENTITY (declarant, profile, party...) = թիրախի instanceid → ընթացիկ տարբերակ pointer-ով
 *   4. money. AMD = x_amount × x_ratetodefault (XXX արժույթը AMD համարժեք չունի)
 *   5. մերժված տողերը (status = 2) հայտարարագրի մաս չեն (Guide 5.3)
 *
 * Նախատիպում աղբյուրը mock-ն է (seed.js)։ Իրական EPD-ին միանալիս այս ֆայլը փոխարինվում է SQL-ով
 * նույն ինտերֆեյսով (NFR-04՝ միայն կարդալու)։
 */
import { TABLES, KEYS } from './seed.js';
import { INTEGRATION_STATUS, YESNO } from './classifiers.js';

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}
deepFreeze(TABLES); // EPD-ն միայն կարդացվում է (NFR-04)

export const epd = TABLES;
export { KEYS };

const cache = new Map();
const memo = (key, fn) => (cache.has(key) ? cache.get(key) : (cache.set(key, fn()), cache.get(key)));

/** Ընթացիկ տարբերակի entityid-ների բազմություն versioned աղյուսակի համար */
const currentIds = (table) => memo(`cur|${table}`, () => new Set((TABLES[`${table}publisheditem`] || []).map((p) => p.entityid)));
export const isCurrent = (table, row) => currentIds(table).has(row.entityid);
/** Versioned աղյուսակի ընթացիկ տողերը */
export const current = (table) => memo(`rows|${table}`, () => (TABLES[table] || []).filter((r) => currentIds(table).has(r.entityid)));
/** instanceid → ընթացիկ տարբերակ */
export const byInstance = (table, instanceid) => memo(`inst|${table}`, () => new Map(current(table).map((r) => [r.instanceid, r]))).get(instanceid) || null;
/** Տվյալ instance-ի բոլոր տարբերակները (ներառյալ ոչ ընթացիկ) */
export const versionsOf = (table, instanceid) => (TABLES[table] || []).filter((r) => r.instanceid === instanceid).sort((a, b) => a.entityid - b.entityid);

const childIndex = (table) => memo(`child|${table}`, () => {
  const m = new Map();
  for (const r of TABLES[table] || []) {
    if (!m.has(r.parentid)) m.set(r.parentid, []);
    m.get(r.parentid).push(r);
  }
  return m;
});
/** Ծնողի (entityid կամ instanceid) երեխա տողերը */
export const children = (table, parentid) => childIndex(table).get(parentid) || [];

/** Detail աղյուսակ → իր section աղյուսակը */
export const DETAIL_SECTION = {
  de_financialmeanscash: 'de_financialmeans',
  de_financialmeansbankaccountbalances: 'de_financialmeans',
  de_financialmeanselectronicaccountsandcryptocurrencies: 'de_financialmeans',
  de_revenuesincomes: 'de_revenues',
  de_revenuesremainingprincipals: 'de_revenues',
  de_realestatedetails: 'de_realestate',
  de_vehicledetails: 'de_vehicle',
  de_loansanddepositsloandetails: 'de_loansanddeposits',
  de_loansanddepositsdepositdetails: 'de_loansanddeposits',
  de_expensesdetails: 'de_expenses',
  de_contractsupon5mlndetails: 'de_contractsupon5mln',
  de_membershipinpartiesdetails: 'de_membershipinparties',
  de_integrityworkpositions: 'de_integritywork',
  de_integrityinterestspublicofficerelatives: 'de_integrityinterests',
  de_integrityinterestspartymembership: 'de_integrityinterests',
  de_integrityliabilitydisciplinary: 'de_integrityliability',
  de_integrityliabilitydisciplinaryadditionalinformation: 'de_integrityliability',
  de_integrityliabilitycriminal: 'de_integrityliability',
  de_integrityliabilityconviction: 'de_integrityliability',
  de_integrityliabilityrevocatedconviction: 'de_integrityliability',
  de_integrityliabilityunfulfilledterminatedprosecutions: 'de_integrityliability',
  de_integrityliabilityadministrative: 'de_integrityliability',
  de_integrityliabilityadministrativeadditionalinformation: 'de_integrityliability',
  de_integrityliabilitycivilcaseparticipation: 'de_integrityliability',
  de_integrityrelationtocriminalsubculturenomineeinfo: 'de_integrityrelationtocriminalsubculture',
  de_integrityfinancialmeanscash: 'de_integrityfinancialmeans',
  de_integrityfinancialmeansbankaccountbalances: 'de_integrityfinancialmeans',
  de_reportincomesmonetarydonationsofindividuals: 'de_reportincomes',
  de_reportincomesmembershipfees: 'de_reportincomes',
  de_reportincomesentryfees: 'de_reportincomes',
  de_reportincomesothernonmonetarydonations: 'de_reportincomes',
  de_reportincomesprohibitedmonetarydonations: 'de_reportincomes',
  de_reportincomesnoncompliantandnottransferredmonetarydonations: 'de_reportincomes',
  de_reportincomesexcessiveorprohibitedmonetarydonations: 'de_reportincomes',
  de_reportincomesfreeofchargeworksservices: 'de_reportincomes',
  de_reportincomescheapordonatedrealestate: 'de_reportincomes',
  de_reportcashflowincomes: 'de_reportcashflow',
  de_reportcashflowexpenditures: 'de_reportcashflow',
  de_reportrealestatedetails: 'de_reportrealestate',
};

/** Root-ի ընթացիկ section-ը (versioned, parentid = root.instanceid) */
export const sectionOf = (sectionTable, root) => children(sectionTable, root.instanceid).find((s) => isCurrent(sectionTable, s)) || null;

/**
 * Root-ի detail տողերը (ընթացիկ section-ի միջոցով)։
 * opts.includeRejected = true՝ ներառել նաև մերժված տողերը (ցուցադրման համար)
 */
export function detailRows(root, detailTable, { includeRejected = false } = {}) {
  const sec = sectionOf(DETAIL_SECTION[detailTable], root);
  if (!sec) return [];
  const rows = children(detailTable, sec.entityid);
  return includeRejected ? rows : rows.filter((r) => r.status !== INTEGRATION_STATUS.rejected);
}

/** Money դաշտի արժեքը ՀՀ դրամով (Guide 8.1). null, եթե գումար չկա կամ արժույթը XXX է */
export function amd(row, prefix) {
  const a = row?.[`${prefix}_amount`];
  if (a === null || a === undefined) return null;
  const r = row[`${prefix}_ratetodefault`];
  return r === null || r === undefined ? null : a * r;
}
export const isYes = (v) => v === YESNO.yes;

// ───────── անձինք
export const liveProfileOf = (profileRow) => (profileRow?.clonedfromprofile ? byInstance('de_profile', profileRow.clonedfromprofile) : profileRow);
export const profileName = (instanceid) => {
  const p = byInstance('de_profile', instanceid);
  return p ? `${p.firstname} ${p.lastname}` : `#${instanceid}`;
};
/** Պրոֆիլի (կլոնի) ընտանիքի անդամները, ազգականները, պաշտոնները (detail rows, parentid = profile.entityid) */
export const profileChildren = (table, profileInstanceId) => {
  const p = byInstance('de_profile', profileInstanceId);
  return p ? children(table, p.entityid) : [];
};
/** Կենդանի պրոֆիլներ (iscloned = 2) */
export const liveProfiles = () => current('de_profile').filter((p) => p.iscloned === YESNO.no);
export const liveProfileBySsn = (ssn) => liveProfiles().find((p) => p.ssn === ssn) || null;
