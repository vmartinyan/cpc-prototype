/**
 * Դասակարգիչներ (c_*). id-ները և անվանումները՝ EPD թեստային բազայից (lookups.generated.js)։
 * lk('c_incometype', 13) → «Ստացված փոխառություններ (վարկեր)»
 */
import { LOOKUPS } from './lookups.generated.js';

export { LOOKUPS };
export const lk = (table, id) => (id === null || id === undefined ? null : LOOKUPS[table]?.[id]?.name ?? `${table}#${id}`);
export const lkRow = (table, id) => LOOKUPS[table]?.[id] || null;
export const lkOptions = (table) => Object.entries(LOOKUPS[table] || {}).filter(([, v]) => !v.deleted).map(([k, v]) => ({ id: Number(k), name: v.name }));

// Հաճախ օգտագործվող id-ներ (Database Guide, գլ. 2.6, 2.10, 4.3, 5.1, 7)
export const YESNO = { yes: 1, no: 2 };
export const INTEGRATION_STATUS = { saved: 1, rejected: 2, pending: 3 };
export const DATA_FILLING = { manual: 1, loaded: 2, copied: 3 };
export const DECLARATION_TYPE = { yearly: 1, assumption: 2, termination: 3 };
export const DECLARANT_TYPE = { officer: 1, family: 2, partyLeader: 3 };
export const FAMILY_MEMBER = { spouse: 1, minor: 2, cohabitant: 3, ward: 4 };
/** Ընտանիքի անդամներ, որոնք ներկայացնում են առանձին հայտարարագիր (isdeclarant = 1)՝ ամուսին և համատեղ բնակվող չափահաս */
export const SEPARATELY_DECLARING = [FAMILY_MEMBER.spouse, FAMILY_MEMBER.cohabitant];
export const PERSON_TYPE = { individual: 1, legal: 2 };
export const REPORT_TYPE = { preliminary: 1, yearly: 2 };

export const WF = {
  declaration: { draft: 5, submitted: 6, published: 7, modificationRequested: 36, modification: 37 },
  report: { draft: 14, submitted: 27, published: 49, modificationRequested: 50, modification: 48 },
  party: { approved: 45, deactivated: 46 },
  gift: { draft: 51, submitted: 52, approved: 62, published: 53 },
  integrity: { draft: 58, submitted: 59, received: 64, screening: 60, completed: 61, archived: 63, suspended: 65 },
};
/**
 * «Ուսումնասիրության ենթակա» կարգավիճակ (INT-01, Q-36). c_wfstate-ում integrity պրոցեսի 60 = «Ուսումնասիրության փուլ»։
 * ԿԿՀ-ի կողմից հաստատման կարիք ունի։
 */
export const INTEGRITY_STUDY_STATE = WF.integrity.screening;

// tabtype-ի այն արժեքները, որոնք օգտագործվում են տարեկան հայտարարագրի «առկա» ցանկերի համար
export const TAB = {
  cashAvailable: 1, bankAvailable: 1, eaccAvailable: 1, depositAvailable: 1, loanGiven: 1,
  realestateAtStart: 1, realestateAcquired: 2, realestateAlienated: 3, realestateActual: 4,
  vehicleAtStart: 1, vehicleAcquired: 2, vehicleAlienated: 3,
};
