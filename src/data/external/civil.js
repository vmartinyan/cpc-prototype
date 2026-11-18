/**
 * ՔԿԱԳ (moj-civil, get_acts/v1) mock — SRS 11.5.5։
 * Հարցում՝ moj_civil_get_acts_request { ssn }։ Պատասխան՝ csr_acts[1..1000].csr_act։
 * Ակտի տեսակը պատասխանում բացահայտ չի նշվում (csr_get_acts_type-ը նկարագրված չէ), հարցվող անձի դերը
 * ուղղակիորեն նշված չէ (Q-49)։ Mock-ում csr_get_acts_type-ը թողնված է դատարկ։
 * Նախատիպում ՔԿԱԳ-ի տվյալները կանոններում չեն օգտագործվում (բարեվարքության կանոն 1-ը չի իրականացված, Q-29, Q-37, Q-49)։
 */

const emptyResident = { house: '', street: '', country: 'ՀԱՅԱՍՏԱՆ', department: '', house_type: '', csr_get_acts_region: 'ԵՐԵՎԱՆ', csr_get_acts_community: '', csr_get_acts_residence: 'ԵՐԵՎԱՆ', csr_get_acts_start_date: '' };

function party(p, extra = {}) {
  if (!p) return {};
  return {
    id_type: 'id', id_number: p.doc || '', id_department: '011', id_issue_date: '', id_expirey_date: '', citizenship: 'ՀՀ',
    new_last_name: p.newLast || '', marital_status: p.marital || '', education_level: p.edu || 'high', marriage_number: p.marriageNo || '',
    csr_get_acts_psn: p.psn, ...extra,
  };
}
const baseInfo = (p) => (p ? { name: p.first, fathers_name: p.patronymic, nationality: 'հայ', employment_status: 'աշխատող', csr_get_acts_last_name: p.last, csr_get_acts_birth_date: p.birth, csr_get_acts_gender: p.gender } : {});

function act({ ref, date, office = 'ՔԿԱԳ Երևանի Կենտրոն բաժին', registered = '', child = null, person = null, person2 = null, presenter = null }) {
  return {
    csr_act: {
      ref_num: ref, full_ref_num: `${ref}/${date.slice(-4)}`, tracking_id: `TR-${ref}`, cert_date: date, registered, office_name: office,
      child: child ? { psn: child.psn, gender: child.gender === 'M' ? '1' : '2', birth: { region: 'ԵՐԵՎԱՆ', country: 'ՀԱՅԱՍՏԱՆ', community: '' }, resident: { house: '', region: 'ԵՐԵՎԱՆ', street: '', country: 'ՀԱՅԱՍՏԱՆ', apartment: '', community: '', residence: 'ԵՐԵՎԱՆ', department: '', house_type: '' }, base_info: { name: child.first, last_name: child.last, fathers_name: child.patronymic, birth_date: child.birth, nationality: 'հայ', birth_status: 'live', child_number: '1', count_children: '1' } } : {},
      person: party(person), person_birth: person ? { country: 'ՀԱՅԱՍՏԱՆ', csr_get_acts_region: 'ԵՐԵՎԱՆ' } : {}, person_resident: person ? emptyResident : {}, person_base_info: baseInfo(person),
      person2: party(person2, person2 ? { children: '', employment_status: 'աշխատող', csr_get_acts_cert_num: '', csr_get_acts_type: '' } : {}), person2_birth: person2 ? { country: 'ՀԱՅԱՍՏԱՆ', csr_get_acts_region: 'ԵՐԵՎԱՆ' } : {}, person2_resident: person2 ? emptyResident : {}, person2_base_info: baseInfo(person2),
      presenter: presenter ? { id_type: 'id', birth: { country: 'ՀԱՅԱՍՏԱՆ', csr_get_acts_region: 'ԵՐԵՎԱՆ' }, resident: emptyResident, base_info: { name: presenter.first, fathers_name: presenter.patronymic, nationality: 'հայ', csr_get_acts_last_name: presenter.last, csr_get_acts_birth_date: presenter.birth, csr_get_acts_gender: presenter.gender, csr_get_acts_psn: presenter.psn, id_number: '', citizenship: 'ՀՀ', id_department: '', id_issue_date: '', id_expirey_date: '' } } : {},
    },
  };
}

const armen = { psn: '2507750412', first: 'Արմեն', last: 'Հովհաննիսյան', patronymic: 'Գագիկի', birth: '25/07/1975', gender: 'M', marital: 'm' };
const lilit = { psn: '1403790526', first: 'Լիլիթ', last: 'Մելքոնյան', newLast: 'Հովհաննիսյան', patronymic: 'Արտաշեսի', birth: '14/03/1979', gender: 'F', marital: 'm' };
const arman = { psn: '0911110311', first: 'Արման', last: 'Հովհաննիսյան', patronymic: 'Արմենի', birth: '09/11/2011', gender: 'M' };
const suren = { psn: '2209830385', first: 'Սուրեն', last: 'Վարդանյան', patronymic: 'Կարենի', birth: '22/09/1983', gender: 'M', marital: 'm' };
const liana = { psn: '1207860611', first: 'Լիանա', last: 'Մելիքյան', newLast: 'Վարդանյան', patronymic: 'Գուրգենի', birth: '12/07/1986', gender: 'F', marital: 'm' };
const edgar = { psn: '2808790863', first: 'Էդգար', last: 'Սիմոնյան', patronymic: 'Գրիգորի', birth: '28/08/1979', gender: 'M', marital: 'm' };
const anahit = { psn: '0505810577', first: 'Անահիտ', last: 'Հակոբյան', newLast: 'Սիմոնյան', patronymic: 'Հակոբի', birth: '05/05/1981', gender: 'F', marital: 'm' };
const gevorg = { psn: '0412840198', first: 'Գևորգ', last: 'Աբրահամյան', patronymic: 'Վաչեի', birth: '04/12/1984', gender: 'M' };
const tatev = { psn: '1803870744', first: 'Տաթև', last: 'Ներսիսյան', patronymic: 'Արամի', birth: '18/03/1987', gender: 'F' };

const byPerson = {
  '2507750412': [act({ ref: '1543', date: '20/06/2008', registered: '20/06/2008 12:00', person: armen, person2: lilit }), act({ ref: '8812', date: '15/11/2011', child: arman, person: armen, person2: lilit, presenter: armen })],
  '2209830385': [act({ ref: '2231', date: '09/09/2012', registered: '09/09/2012 14:00', person: suren, person2: liana }), act({ ref: '9921', date: '02/04/2014', child: { psn: '0204140377', first: 'Կարեն', last: 'Վարդանյան', patronymic: 'Սուրենի', birth: '02/04/2014', gender: 'M' }, person: suren, person2: liana, presenter: suren })],
  '2808790863': [act({ ref: '3310', date: '30/05/2010', registered: '30/05/2010 13:00', person: edgar, person2: anahit })],
  '0412840198': [
    act({ ref: '4410', date: '12/08/2011', registered: '12/08/2011 15:00', person: { ...gevorg, marital: 'm' }, person2: { ...tatev, marital: 'm' } }),
    act({ ref: '7745', date: '03/03/2018', office: 'ՔԿԱԳ Երևանի Արաբկիր բաժին', person: { ...gevorg, marital: 'd' }, person2: { ...tatev, marital: 'd' } }),
    act({ ref: '9102', date: '21/01/2013', child: { psn: '2101130455', first: 'Մարիա', last: 'Աբրահամյան', patronymic: 'Գևորգի', birth: '21/01/2013', gender: 'F' }, person: gevorg, person2: tatev, presenter: tatev }),
  ],
};

export function getActs(req) {
  const ssn = req?.moj_civil_get_acts_request?.ssn;
  return { csr_acts: byPerson[ssn] || [] };
}
export const civilKnownSsns = Object.keys(byPerson);
