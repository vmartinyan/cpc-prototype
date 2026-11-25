/**
 * ՔԿԱԳ (moj-civil, get_acts/v1) mock — docs/external_web_services/moj-civil.get_acts.v1։
 * Հարցում՝ moj_civil_get_acts_request { ssn }։ Պատասխան՝ csr_get_acts_response { csr_acts[1..1000] { csr_act: {...} } }։
 * Ակտում անձանց տեղերը ֆիքսված են. child (երեխա), person (հայր/ամուսին/մահացող), person2 (կին/մայր), presenter (դիմող)։
 * Բնադրումը՝ ըստ Guideline-ի. employment_status-ը, csr_get_acts_gender-ը (1 արական, 2 իգական) և csr_get_acts_psn-ը
 * person/person2/presenter-ի մակարդակում են, base_info-ում՝ անուն, հայրանուն, ազգություն, ազգանուն, ծննդյան ամսաթիվ։
 * Ակտի տեսակը պատասխանում բացահայտ չի նշվում (csr_get_acts_type-ը նկարագրված չէ), հարցվող անձի դերը
 * ուղղակիորեն նշված չէ (Q-49)։ Mock-ում csr_get_acts_type-ը թողնված է դատարկ։ Ամսաթվերի ձևաչափը նկարագրված չէ. mock-ում՝ dd/mm/yyyy։
 * Օգտագործվում է DEC-R2 կանոնում (ամուսին/կին + երեխաներ, adapters.civilFamily). բարեվարքության կանոն 1-ը չի իրականացված (Q-29, Q-37, Q-49)։
 */

const emptyResident = { house: '', street: '', country: 'ՀԱՅԱՍՏԱՆ', department: '', house_type: '', csr_get_acts_region: 'ԵՐԵՎԱՆ', csr_get_acts_community: '', csr_get_acts_residence: 'ԵՐԵՎԱՆ', csr_get_acts_start_date: '' };
const gender = (g) => (g === 'M' ? '1' : g === 'F' ? '2' : '');

function party(p, extra = {}) {
  if (!p) return {};
  return {
    id_type: 'id', id_number: p.doc || '', citizenship: 'ՀՀ', id_department: '011', id_issue_date: '',
    new_last_name: p.newLast || '', marital_status: p.marital || '', education_level: p.edu || 'high', id_expirey_date: '', marriage_number: p.marriageNo || '',
    csr_get_acts_psn: p.psn, employment_status: 'աշխատող', csr_get_acts_gender: gender(p.gender), ...extra,
  };
}
const baseInfo = (p) => (p ? { name: p.first, nationality: 'հայ', fathers_name: p.patronymic, csr_get_acts_last_name: p.last, csr_get_acts_birth_date: p.birth } : {});

function act({ ref, date, office = 'ՔԿԱԳ Երևանի Կենտրոն բաժին', registered = '', child = null, person = null, person2 = null, presenter = null }) {
  return {
    csr_act: {
      child: child ? { psn: child.psn, birth: { region: 'ԵՐԵՎԱՆ', country: 'ՀԱՅԱՍՏԱՆ', community: '' }, gender: gender(child.gender), resident: { house: '', region: 'ԵՐԵՎԱՆ', street: '', country: 'ՀԱՅԱՍՏԱՆ', apartment: '', community: '', residence: 'ԵՐԵՎԱՆ', department: '', house_type: '' }, base_info: { name: child.first, last_name: child.last, birth_date: child.birth, nationality: 'հայ', fathers_name: child.patronymic, birth_status: 'live', child_number: '1', count_children: '1' } } : {},
      person: party(person), person_birth: person ? { country: 'ՀԱՅԱՍՏԱՆ', csr_get_acts_region: 'ԵՐԵՎԱՆ' } : {}, person_resident: person ? emptyResident : {}, person_base_info: baseInfo(person),
      person2: party(person2, person2 ? { children: '', csr_get_acts_type: '', csr_get_acts_cert_num: '' } : {}), person2_birth: person2 ? { country: 'ՀԱՅԱՍՏԱՆ', csr_get_acts_region: 'ԵՐԵՎԱՆ' } : {}, person2_resident: person2 ? emptyResident : {}, person2_base_info: baseInfo(person2),
      ref_num: ref, cert_date: date,
      presenter: presenter ? {
        birth: { country: 'ՀԱՅԱՍՏԱՆ', csr_get_acts_region: 'ԵՐԵՎԱՆ' }, id_type: 'id', resident: emptyResident,
        base_info: { name: presenter.first, nationality: 'հայ', fathers_name: presenter.patronymic, csr_get_acts_last_name: presenter.last, csr_get_acts_birth_date: presenter.birth },
        id_number: '', citizenship: 'ՀՀ', id_department: '', id_issue_date: '', id_expirey_date: '', csr_get_acts_psn: presenter.psn, csr_get_acts_gender: gender(presenter.gender),
      } : {},
      registered, office_name: office, tracking_id: `TR-${ref}`, full_ref_num: `${ref}/${date.slice(-4)}`,
    },
  };
}

const armen = { psn: '0000101925', first: 'Արմեն', last: 'Հովհաննիսյան', patronymic: 'Գագիկի', birth: '25/07/1975', gender: 'M', marital: 'm' };
const lilit = { psn: '0000100963', first: 'Լիլիթ', last: 'Մելքոնյան', newLast: 'Հովհաննիսյան', patronymic: 'Արտաշեսի', birth: '14/03/1979', gender: 'F', marital: 'm' };
const arman = { psn: '0000100593', first: 'Արման', last: 'Հովհաննիսյան', patronymic: 'Արմենի', birth: '09/11/2011', gender: 'M' };
const suren = { psn: '0000101777', first: 'Սուրեն', last: 'Վարդանյան', patronymic: 'Կարենի', birth: '22/09/1983', gender: 'M', marital: 'm' };
const liana = { psn: '0000100889', first: 'Լիանա', last: 'Մելիքյան', newLast: 'Վարդանյան', patronymic: 'Գուրգենի', birth: '12/07/1986', gender: 'F', marital: 'm' };
const edgar = { psn: '0000102147', first: 'Էդգար', last: 'Սիմոնյան', patronymic: 'Գրիգորի', birth: '28/08/1979', gender: 'M', marital: 'm' };
const anahit = { psn: '0000100260', first: 'Անահիտ', last: 'Հակոբյան', newLast: 'Սիմոնյան', patronymic: 'Հակոբի', birth: '05/05/1981', gender: 'F', marital: 'm' };
const gevorg = { psn: '0000100186', first: 'Գևորգ', last: 'Աբրահամյան', patronymic: 'Վաչեի', birth: '04/12/1984', gender: 'M' };
const arsen = { psn: '0000101444', first: 'Արսեն', last: 'Դանիելյան', patronymic: 'Ռաֆայելի', birth: '19/04/1986', gender: 'M', marital: 'm' };
const sona = { psn: '0000100334', first: 'Սոնա', last: 'Մարտիրոսյան', newLast: 'Դանիելյան', patronymic: 'Կարոյի', birth: '07/02/1988', gender: 'F', marital: 'm' };
const tatev = { psn: '0000101407', first: 'Տաթև', last: 'Ներսիսյան', patronymic: 'Արամի', birth: '18/03/1987', gender: 'F' };

const byPerson = {
  '0000101925': [act({ ref: '1543', date: '20/06/2008', registered: '20/06/2008 12:00', person: armen, person2: lilit }), act({ ref: '8812', date: '15/11/2011', child: arman, person: armen, person2: lilit, presenter: armen })],
  '0000101777': [act({ ref: '2231', date: '09/09/2012', registered: '09/09/2012 14:00', person: suren, person2: liana }), act({ ref: '9921', date: '02/04/2014', child: { psn: '0000100038', first: 'Կարեն', last: 'Վարդանյան', patronymic: 'Սուրենի', birth: '02/04/2014', gender: 'M' }, person: suren, person2: liana, presenter: suren })],
  // Արսեն և Սոնա Դանիելյաններ (երկուսն էլ պաշտոնատար անձ)
  '0000101444': [act({ ref: '3519', date: '17/06/2015', registered: '17/06/2015 14:00', person: arsen, person2: sona })],
  '0000102147': [act({ ref: '3310', date: '30/05/2010', registered: '30/05/2010 13:00', person: edgar, person2: anahit })],
  '0000100186': [
    act({ ref: '4410', date: '12/08/2011', registered: '12/08/2011 15:00', person: { ...gevorg, marital: 'm' }, person2: { ...tatev, marital: 'm' } }),
    act({ ref: '7745', date: '03/03/2018', office: 'ՔԿԱԳ Երևանի Արաբկիր բաժին', person: { ...gevorg, marital: 'd' }, person2: { ...tatev, marital: 'd' } }),
    act({ ref: '9102', date: '21/01/2013', child: { psn: '0000101629', first: 'Մարիա', last: 'Աբրահամյան', patronymic: 'Գևորգի', birth: '21/01/2013', gender: 'F' }, person: gevorg, person2: tatev, presenter: tatev }),
  ],
};

// ── Ծննդյան ակտեր՝ ծնողներ, եղբայրներ/քույրեր, խնամիներ (DEC-R2)
const asChild = (p) => ({ psn: p.psn, first: p.first, last: p.last, patronymic: p.patronymic, birth: p.birth, gender: p.gender });
// Արմեն Հովհաննիսյան. ծնողներ (մայրը հայտարարագրված է որպես «Ծնող», հայրը մահացել է 2019-ին), եղբայր/քույր չունի. կնոջ ծննդյան ակտը ՔԿԱԳ-ում չկա
const gagikH = { psn: '0000101296', first: 'Գագիկ', last: 'Հովհաննիսյան', patronymic: 'Լևոնի', birth: '17/04/1948', gender: 'M', marital: 'm' };
const arusyak = { psn: '0000100926', first: 'Արուսյակ', last: 'Հովհաննիսյան', patronymic: 'Լևոնի', birth: '12/11/1950', gender: 'F', marital: 'm' };
// Սուրեն Վարդանյան. եղբայր Արթուրը (հայտարարագրված է). կնոջ՝ Լիանայի ծնողները (խնամիներ, հայտարարագրված չեն)
const karenV = { psn: '0000100223', first: 'Կարեն', last: 'Վարդանյան', patronymic: 'Արթուրի', birth: '05/03/1955', gender: 'M', marital: 'm' };
const gohar = { psn: '0000101888', first: 'Գոհար', last: 'Վարդանյան', patronymic: 'Սերգեյի', birth: '23/09/1957', gender: 'F', marital: 'm' };
const artur = { psn: '0000100667', first: 'Արթուր', last: 'Վարդանյան', patronymic: 'Կարենի', birth: '11/02/1980', gender: 'M' };
const gurgen = { psn: '0000101037', first: 'Գուրգեն', last: 'Մելիքյան', patronymic: 'Համլետի', birth: '14/06/1958', gender: 'M', marital: 'm' };
const siranush = { psn: '0000100482', first: 'Սիրանուշ', last: 'Մելիքյան', patronymic: 'Վահրամի', birth: '08/08/1960', gender: 'F', marital: 'm' };
// Նարինե Ավետիսյան. քույր Մարինեն (հայտարարագրված չէ)
const hrachya = { psn: '0000101592', first: 'Հրաչյա', last: 'Ավետիսյան', patronymic: 'Գրիգորի', birth: '20/01/1959', gender: 'M', marital: 'm' };
const susanna = { psn: '0000100075', first: 'Սուսաննա', last: 'Ավետիսյան', patronymic: 'Աշոտի', birth: '03/04/1962', gender: 'F', marital: 'm' };
const narine = { psn: '0000101148', first: 'Նարինե', last: 'Ավետիսյան', patronymic: 'Հրաչյայի', birth: '15/01/1987', gender: 'F' };
const marina = { psn: '0000102073', first: 'Մարինա', last: 'Ավետիսյան', patronymic: 'Հրաչյայի', birth: '27/06/1990', gender: 'F' };
// Տիգրան Մկրտչյան. կինը (Մարինե) հայտարարագրված է, նրա ծնողները (խնամիներ)՝ ոչ
const tigran = { psn: '0000100112', first: 'Տիգրան', last: 'Մկրտչյան', patronymic: 'Սամվելի', birth: '03/06/1980', gender: 'M', marital: 'm' };
const marine = { psn: '0000101666', first: 'Մարինե', last: 'Սահակյան', newLast: 'Մկրտչյան', patronymic: 'Վազգենի', birth: '21/10/1982', gender: 'F', marital: 'm' };
const samvel = { psn: '0000101074', first: 'Սամվել', last: 'Մկրտչյան', patronymic: 'Տիգրանի', birth: '14/08/1952', gender: 'M', marital: 'm' };
const vazgen = { psn: '0000102258', first: 'Վազգեն', last: 'Սահակյան', patronymic: 'Մհերի', birth: '30/11/1954', gender: 'M', marital: 'm' };
const nune = { psn: '0000101481', first: 'Նունե', last: 'Սահակյան', patronymic: 'Արամի', birth: '19/05/1956', gender: 'F', marital: 'm' };

const birthActs = [
  act({ ref: '0751', date: '25/07/1975', child: asChild(armen), person: gagikH, person2: arusyak, presenter: gagikH }),
  act({ ref: '0244', date: '11/02/1980', child: artur, person: karenV, person2: gohar, presenter: karenV }),
  act({ ref: '0912', date: '22/09/1983', child: asChild(suren), person: karenV, person2: gohar, presenter: karenV }),
  act({ ref: '0713', date: '12/07/1986', child: asChild(liana), person: gurgen, person2: siranush, presenter: gurgen }),
  act({ ref: '0115', date: '15/01/1987', child: narine, person: hrachya, person2: susanna, presenter: hrachya }),
  act({ ref: '0627', date: '27/06/1990', child: marina, person: hrachya, person2: susanna, presenter: susanna }),
  act({ ref: '0603', date: '03/06/1980', child: asChild(tigran), person: samvel, person2: { psn: '', first: 'Ռուզաննա', last: 'Մկրտչյան', patronymic: 'Գևորգի', birth: '02/02/1955', gender: 'F' }, presenter: samvel }),
  act({ ref: '1021', date: '21/10/1982', child: asChild(marine), person: vazgen, person2: nune, presenter: vazgen }),
  act({ ref: '3307', date: '14/07/2007', registered: '14/07/2007 15:00', person: tigran, person2: marine }),
  // Մահվան ակտ. Արմենի հայրը (DEC-R2-ում հաշվի չի առնվում)
  act({ ref: '5519', date: '11/03/2019', office: 'ՔԿԱԳ Երևանի Արաբկիր բաժին', person: gagikH, presenter: arusyak }),
];

// Ակտը վերադարձվում է իր ցանկացած մասնակցի ՀԾՀ-ով (child, person, person2), ինչպես իրական ծառայությունում
const ALL_ACTS = [...new Map([...Object.values(byPerson).flat(), ...birthActs].map((a) => [a.csr_act.full_ref_num, a])).values()];
const participants = (a) => [a.csr_act.child?.psn, a.csr_act.person?.csr_get_acts_psn, a.csr_act.person2?.csr_get_acts_psn].filter(Boolean);

export function getActs(req) {
  const ssn = req?.moj_civil_get_acts_request?.ssn;
  return { csr_get_acts_response: { csr_acts: ssn ? ALL_ACTS.filter((a) => participants(a).includes(ssn)) : [] } };
}
export const civilKnownSsns = [...new Set(ALL_ACTS.flatMap(participants))];
