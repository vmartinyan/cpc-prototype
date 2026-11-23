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

/**
 * Զանգվածի տարր. Guideline-ներում տարրը ներկայացված է անվանված օբյեկտով (csr_act, rp_vehicle, owned_realty_object, ...),
 * սակայն JSON-ում այն կարող է լինել և՛ փաթաթված ({ csr_act: {...} }), և՛ ուղղակի ({...})։ Ադապտերն ընդունում է երկուսն էլ։
 */
const item = (el, key) => (el && typeof el === 'object' && el[key] && typeof el[key] === 'object' ? el[key] : el);
const items = (arr, key) => (Array.isArray(arr) ? arr.map((el) => item(el, key)) : []);

export const adapters = {
  /** ԲՊՌ. անձի նույնականացում ՀԾՀ-ով, իսկ չգտնվելու դեպքում՝ փաստաթղթի համարով */
  bprIdentify(identifier, meta) {
    const snaps = [];
    const r1 = { pr_search_by_psn_request: { psn: identifier } };
    const p1 = call('bpr', 'search_by_psn', r1, meta);
    snaps.push(snap('bpr', 'search_by_psn', r1, p1));
    // pr_search_response.AVVPerson. չգտնվելու դեպքում AVVPerson չկա
    let person = p1?.pr_search_response?.AVVPerson || null;
    let foundBy = person ? 'psn' : null;
    if (!person) {
      const r2 = { pr_search_by_docnum_request: { Document_Number: identifier } };
      const p2 = call('bpr', 'search_by_doc_num', r2, meta);
      snaps.push(snap('bpr', 'search_by_doc_num', r2, p2));
      person = p2?.pr_search_response?.AVVPerson || null;
      foundBy = person ? 'doc' : null;
    }
    if (!person) return { value: { foundBy: null }, snapshot: snaps };
    const docs = items(person.AVVDocuments?.Document, 'Document_object');
    const doc = docs.find((d) => d.Document_Status === 'Primary Valid') || docs[0] || {};
    const isTrue = (v) => String(v).toLowerCase() === 'true';
    return {
      value: {
        foundBy,
        pnum: person.PNum,
        firstName: doc.Person?.First_Name,
        lastName: doc.Person?.Last_Name,
        patronymic: doc.Person?.Patronymic_Name,
        birthDate: doc.Person?.Birth_Date,
        isDead: isTrue(person.IsDead),
        ssnIndicator: isTrue(person.SSN_Indicator),
      },
      snapshot: snaps,
    };
  },

  /** ՊԵԿ. տարվա աշխատավարձային և քաղաքացիաիրավական եկամուտների գումար */
  pekIncomeForYear(ssn, year, meta) {
    const req = { tax_ssn_request: { ssn, start_date: `${year}-01`, end_date: `${year}-12` } };
    const res = call('pek', 'ssn', req, meta);
    let total = 0;
    for (const t of items(res.tax_ssn_response?.taxPayerInfo, 'taxPayerInfoItem'))
      for (const p of items(t.personInfoPeriods?.personInfoPeriod, 'personInfoPeriodItem')) total += (p.personInfo?.salaryEquivPayments || 0) + (p.personInfo?.civilLowContractPayments || 0);
    return { value: total, snapshot: [snap('pek', 'ssn', req, res)] };
  },

  /** Կադաստր. տվյալ ամսաթվի դրությամբ սեփականության իրավունքով պատկանող (չդադարեցված) գույքերի քանակ */
  cadastreOwnedCount(ssn, asOf, meta) {
    const [y, m, d] = asOf.split('-');
    const req = { cad_get_realty_owned_request: { by_ssn: { ssn, date_from: '01/01/1990', date_to: `${d}/${m}/${y}` } } };
    const res = call('cadastre', 'get_realty_owned', req, meta);
    const toIso = (s) => (s ? s.split('/').reverse().join('-') : '');
    const list = items(res.cad_get_realty_owned_response?.owned_realties, 'owned_realty_object').filter((r) => r.cad_is_terminate !== 'true' && toIso(r.cad_registration_date) <= asOf);
    return { value: list.length, snapshot: [snap('cadastre', 'get_realty_owned', req, res)] };
  },

  /**
   * ՔԿԱԳ. անձի ամուսնության/ամուսնալուծության և իր երեխաների ծննդյան ակտերը (DEC-R2)։
   * Ակտում անձանց տեղերը ֆիքսված են (SRS 11.5.5). child՝ երեխա, person՝ հայր/ամուսին/մահացած,
   * person2՝ մայր/կին, presenter՝ դիմող։ Ակտի տեսակը և հարցվող անձի դերը բացահայտ չեն (Q-49), ուստի ենթադրվում է.
   *   • child լրացված, հարցվող անձը՝ person կամ person2 → իր երեխայի ծննդյան ակտ
   *   • child-ը հարցվող անձն է → իր սեփական ծննդյան ակտը (own_birth). person՝ հայր, person2՝ մայր
   *   • child չկա, person և person2 լրացված → ամուսնության ակտ, marital_status = d/v → ամուսնալուծության ակտ
   *   • child չկա, լրացված է միայն person-ը (մահացող) և այն հարցվող անձն է → մահվան ակտ (death). ամսաթիվը՝ cert_date
   * Ամուսինը ակտի մյուս կողմն է. եթե հարցվողը person-ն է՝ person2-ը, եթե person2-ն է՝ person-ը։
   */
  civilFamily(ssn, meta) {
    const req = { moj_civil_get_acts_request: { ssn } };
    const res = call('civil', 'get_acts', req, meta);
    const toIso = (s) => (s ? s.split('/').reverse().join('-') : '');
    const party = (a, side) => {
      const p = a[side] || {};
      const info = a[`${side}_base_info`] || {};
      return { psn: p.csr_get_acts_psn || '', firstName: info.name || '', lastName: p.new_last_name || info.csr_get_acts_last_name || '', birthDate: toIso(info.csr_get_acts_birth_date), marital: p.marital_status || '' };
    };
    const acts = [];
    for (const a of items(res.csr_get_acts_response?.csr_acts, 'csr_act')) {
      const role = a.person?.csr_get_acts_psn === ssn ? 'person' : a.person2?.csr_get_acts_psn === ssn ? 'person2' : a.child?.psn === ssn ? 'child' : null;
      if (!role) continue;
      const base = { actRef: a.full_ref_num, actDate: toIso(a.cert_date), office: a.office_name };
      if (role === 'child') {
        const parents = ['person', 'person2'].map((side) => party(a, side)).filter((p) => p.psn || p.firstName);
        acts.push({ ...base, actType: 'own_birth', parents });
        continue;
      }
      if (a.child?.psn) {
        const c = a.child;
        acts.push({ ...base, actType: 'birth', child: { psn: c.psn, firstName: c.base_info?.name || '', lastName: c.base_info?.last_name || '', birthDate: toIso(c.base_info?.birth_date) } });
        continue;
      }
      const spouse = party(a, role === 'person' ? 'person2' : 'person');
      if (!spouse.psn && !spouse.firstName) {
        if (role === 'person') acts.push({ ...base, actType: 'death' });
        continue;
      }
      const divorce = ['d', 'v'].includes(party(a, role).marital) || ['d', 'v'].includes(spouse.marital);
      acts.push({ ...base, actType: divorce ? 'divorce' : 'marriage', spouse });
    }
    return { value: acts, snapshot: [snap('civil', 'get_acts', req, res)] };
  },

  /** ՃՈ. տվյալ ամսաթվի դրությամբ հաշվառված տրանսպորտային միջոցների քանակ */
  policeVehiclesCount(psn, asOf, meta) {
    const req = { rp_get_vehicle_info_request: { by_person_psn: { psn } } };
    const res = call('police', 'get_vehicle_info', req, meta);
    const list = items(res.rp_get_vehicle_info_response?.rp_vehicles, 'rp_vehicle').filter((v) => (v.vehicle_recording_date || '') <= asOf && (!v.vehicle_recording_out_date || v.vehicle_recording_out_date > asOf));
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
