/**
 * Արտաքին համակարգերի mock տրանսպորտ։ Իրական HTTP հարցումներ չեն կատարվում (նախատիպ)։
 * Իրական ինտեգրման դեպքում այստեղ կլինի JSON POST՝ հաճախորդի սերտիֆիկատով և X-Signature
 * (RSA-SHA256) վերնագրով (SRS 11.3)։ Mock-ը պահպանում է հարցման/պատասխանի կառուցվածքը՝ ըստ ծառայությունների
 * փաստաթղթերի (docs/external_web_services/<ծառայություն>/Guideline.pdf, ճշգրտում են SRS 11.5-ը),
 * գրանցում է յուրաքանչյուր կանչ (COM-14-ի ցուցադրման համար) և թույլ է տալիս «անջատել» ծառայությունը (COM-17)։
 */
import { searchByPsn, searchByDocNum } from '../data/external/bpr.js';
import { taxSsn } from '../data/external/pek.js';
import { getRealtyOwned } from '../data/external/cadastre.js';
import { getVehicleInfo } from '../data/external/policeRoad.js';
import { getActs } from '../data/external/civil.js';
import { companyInfo } from '../data/external/business.js';

export const SERVICES = {
  bpr: {
    name: 'ԲՊՌ (անձնագրային ռեգիստր)',
    short: 'ԲՊՌ',
    srs: '11.5.1',
    docs: 'police-passport.search_by_psn.v1, police-passport.search_by_doc_num.v1',
    endpoints: {
      search_by_psn: { url: 'https://police-passport.gip.ekeng.am/search_by_psn/v1', handler: searchByPsn, sample: { pr_search_by_psn_request: { psn: '3105780123' } } },
      search_by_doc_num: { url: 'https://police-passport.gip.ekeng.am/search_by_doc_num/v1', handler: searchByDocNum, sample: { pr_search_by_docnum_request: { Document_Number: 'AT0456789' } } },
    },
  },
  pek: {
    name: 'ՊԵԿ (հարկային)',
    short: 'ՊԵԿ',
    srs: '11.5.2',
    docs: 'tax.ssn.v1',
    endpoints: { ssn: { url: 'https://tax.gip.ekeng.am/ssn/v1', handler: taxSsn, sample: { tax_ssn_request: { ssn: '1712850894', start_date: '2025-01', end_date: '2025-12' } } } },
  },
  cadastre: {
    name: 'Կադաստր',
    short: 'Կադաստր',
    srs: '11.5.3',
    docs: 'cadastre.get_realty_owned.v1',
    endpoints: { get_realty_owned: { url: 'https://cadastre.gip.ekeng.am/get_realty_owned/v1', handler: getRealtyOwned, sample: { cad_get_realty_owned_request: { by_ssn: { ssn: '2507750412', date_from: '01/01/2000', date_to: '31/12/2025' } } } } },
  },
  police: {
    name: 'ՃՈ (ճանապարհային ոստիկանություն)',
    short: 'ՃՈ',
    srs: '11.5.4',
    docs: 'police-road.get_vehicle_info.v1',
    endpoints: { get_vehicle_info: { url: 'https://police-road.gip.ekeng.am/get_vehicle_info/v1', handler: getVehicleInfo, sample: { rp_get_vehicle_info_request: { by_person_psn: { psn: '0306800215' } } } } },
  },
  civil: {
    name: 'ՔԿԱԳ',
    short: 'ՔԿԱԳ',
    srs: '11.5.5',
    docs: 'moj-civil.get_acts.v1',
    endpoints: { get_acts: { url: 'https://moj-civil.gip.ekeng.am/get_acts/v1', handler: getActs, sample: { moj_civil_get_acts_request: { ssn: '2209830385' } } } },
  },
  business: {
    name: 'ԻԱՊՌ (իրավաբանական անձանց ռեգիստր)',
    short: 'ԻԱՊՌ',
    srs: '11.5.6',
    docs: 'moj-business.company_info.v1',
    endpoints: { company_info: { url: 'https://moj-business.gip.ekeng.am/company_info/v1', handler: companyInfo, sample: { br_company_info_request: { by_tax_id: { tax_id: '02598765' } } } } },
  },
};

export class ServiceUnavailableError extends Error {
  constructor(service) {
    super(`${SERVICES[service]?.short || service} ծառայությունն անհասանելի է`);
    this.service = service;
  }
}

let outages = {};
export function setOutages(o) { outages = { ...(o || {}) }; }

const LOG_LIMIT = 300;
let log = [];
let logListeners = new Set();
export function getLog() { return log; }
export function clearLog() { log = []; logListeners.forEach((l) => l()); }
export function subscribeLog(fn) { logListeners.add(fn); return () => logListeners.delete(fn); }

let silent = 0;
/** Ամբողջական վերագնահատման ժամանակ մատյանը չի «աղմկում» UI-ը՝ գրանցումը կատարվում է, ծանուցումը՝ վերջում */
export function batch(fn) {
  silent++;
  try { return fn(); } finally { silent--; if (!silent) logListeners.forEach((l) => l()); }
}

/** Պատասխանում կա՞ տվյալ (null, դատարկ զանգված և դատարկ օբյեկտ՝ ոչ) */
function hasData(v) {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.some(hasData);
  if (typeof v === 'object') return Object.values(v).some(hasData);
  return true;
}

/** Mock կանչ. վերադարձնում է պատասխանը կամ նետում ServiceUnavailableError */
export function call(service, endpoint, request, meta = {}) {
  const svc = SERVICES[service];
  const ep = svc.endpoints[endpoint];
  const entry = { at: new Date().toISOString(), service, endpoint, url: ep.url, request, meta, ok: true, response: null };
  log = [entry, ...log].slice(0, LOG_LIMIT);
  if (outages[service]) {
    entry.ok = false;
    entry.error = 'Ծառայությունն անհասանելի է (սիմուլյացիա)';
    if (!silent) logListeners.forEach((l) => l());
    throw new ServiceUnavailableError(service);
  }
  const response = structuredClone(ep.handler(request));
  entry.response = response;
  entry.found = hasData(response);
  if (!silent) logListeners.forEach((l) => l());
  return response;
}
