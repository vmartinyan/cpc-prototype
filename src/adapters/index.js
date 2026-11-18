/**
 * Ադապտերներ (COM-13). յուրաքանչյուր արտաքին աղբյուր ունի առանձին ադապտեր, որը ծառայության
 * պատասխանը վերածում է կանոններին անհրաժեշտ միատեսակ «փաստերի»։ Ծառայության կառուցվածքի
 * փոփոխությունը ազդում է միայն համապատասխան ադապտերի վրա, ոչ թե կանոնների։
 *
 * Յուրաքանչյուր ֆունկցիա վերադարձնում է { value, snapshot }. snapshot-ը պահվում է գնահատման
 * արդյունքի հետ (COM-16)։ Կրկնակի հարցումներից խուսափելու համար օգտագործվում է ExternalContext-ի
 * քեշը (COM-14)՝ մեկ փաստաթղթի գնահատման ընթացքում։
 */
import { call } from './transport.js';

const lc = (s) => (s || '').toLocaleLowerCase('hy').replace(/\s+/g, ' ').trim();

function snap(service, endpoint, request, response) {
  return { service, endpoint, request, response, at: new Date().toISOString() };
}

export const adapters = {
  /** ԲՊՌ. անձի նույնականացում ՀԾՀ-ով, իսկ չգտնվելու դեպքում՝ փաստաթղթի համարով */
  bprIdentify(identifier, meta) {
    const snaps = [];
    const r1 = { pr_search_by_psn_request: { psn: identifier } };
    const p1 = call('bpr', 'search_by_psn', r1, meta);
    snaps.push(snap('bpr', 'search_by_psn', r1, p1));
    let rec = p1;
    let foundBy = p1 ? 'psn' : null;
    if (!rec) {
      const r2 = { pr_search_by_docnum_request: { Document_Number: identifier } };
      const p2 = call('bpr', 'search_by_doc_num', r2, meta);
      snaps.push(snap('bpr', 'search_by_doc_num', r2, p2));
      rec = p2;
      foundBy = p2 ? 'doc' : null;
    }
    if (!rec) return { value: { foundBy: null }, snapshot: snaps };
    const doc = rec.AVVDocuments.Document.find((d) => d.Document_Status === 'Primary Valid') || rec.AVVDocuments.Document[0];
    return {
      value: {
        foundBy,
        pnum: rec.AVVPerson.PNum,
        firstName: doc.Person.First_Name,
        lastName: doc.Person.Last_Name,
        patronymic: doc.Person.Patronymic_Name,
        birthDate: doc.Person.Birth_Date,
        isDead: rec.AVVPerson.IsDead === 'true',
        ssnIndicator: rec.AVVPerson.SSN_Indicator === 'true',
      },
      snapshot: snaps,
    };
  },

  /** ՊԵԿ. տարվա աշխատավարձային և քաղաքացիաիրավական եկամուտների գումար */
  pekIncomeForYear(ssn, year, meta) {
    const req = { tax_ssn_request: { ssn, start_date: `${year}-01`, end_date: `${year}-12` } };
    const res = call('pek', 'ssn', req, meta);
    const info = res.tax_ssn_response?.taxPayerInfo || [];
    let total = 0;
    for (const t of info) for (const p of t.personInfoPeriods.personInfoPeriod) total += (p.personInfo.salaryEquivPayments || 0) + (p.personInfo.civilLowContractPayments || 0);
    return { value: total, snapshot: [snap('pek', 'ssn', req, res)] };
  },

  /** Կադաստր. տվյալ ամսաթվի դրությամբ սեփականության իրավունքով պատկանող (չդադարեցված) գույքերի քանակ */
  cadastreOwnedCount(ssn, asOf, meta) {
    const [y, m, d] = asOf.split('-');
    const req = { cad_get_realty_owned_request: { by_ssn: { ssn, date_from: '01/01/1990', date_to: `${d}/${m}/${y}` } } };
    const res = call('cadastre', 'get_realty_owned', req, meta);
    const toIso = (s) => (s ? s.split('/').reverse().join('-') : '');
    const list = (res.owned_realties || []).filter((r) => r.cad_is_terminate !== 'true' && toIso(r.cad_registration_date) <= asOf);
    return { value: list.length, snapshot: [snap('cadastre', 'get_realty_owned', req, res)] };
  },

  /** ՃՈ. տվյալ ամսաթվի դրությամբ հաշվառված տրանսպորտային միջոցների քանակ */
  policeVehiclesCount(psn, asOf, meta) {
    const req = { rp_get_vehicle_info_request: { by_person_psn: { psn } } };
    const res = call('police', 'get_vehicle_info', req, meta);
    const list = (res.rp_vehicles || []).filter((v) => (v.vehicle_recording_date || '') <= asOf && (!v.vehicle_recording_out_date || v.vehicle_recording_out_date > asOf));
    return { value: list.length, snapshot: [snap('police', 'get_vehicle_info', req, res)] };
  },
};

/** Մեկ փաստաթղթի գնահատման քեշ (COM-14). նույն արժեքը կրկին չի հարցվում */
export class ExternalContext {
  constructor(meta) {
    this.meta = meta;
    this.cache = new Map();
  }
  get(fn, ...args) {
    const key = `${fn}|${JSON.stringify(args)}`;
    if (this.cache.has(key)) {
      const c = this.cache.get(key);
      if (c.error) throw c.error;
      return c.result;
    }
    try {
      const result = adapters[fn](...args, this.meta);
      this.cache.set(key, { result });
      return result;
    } catch (error) {
      this.cache.set(key, { error });
      throw error;
    }
  }
}

export const normalizeName = lc;
