/**
 * ՃՈ (police-road, get_vehicle_info/v1) mock — docs/external_web_services/police-road.get_vehicle_info.v1։
 * Հարցում՝ rp_get_vehicle_info_request { by_person_psn: { psn, rp_vehicle_timestamp? } } (կամ by_vehicle_* տարբերակներ)։
 * Պատասխան՝ rp_get_vehicle_info_response { rp_vehicles[0..100] { rp_vehicle: {...} } }։ Բնադրումը՝ ըստ Guideline-ի.
 *   • rp_vehicle_holder-ի կազմում՝ rp_vehicle_holder_address, holder_registration_address
 *   • rp_vehicle_owners[ { rp_vehicle_owner: { ..., rp_vehicle_owner_address } } ]
 *   • yellow_number-ի կազմում՝ reg_num, cert_num, end_date
 *   • lenders[ { lender: { ..., address } } ]՝ միայն գրավի առկայության դեպքում
 * Գնի, գործարքի և գործարքի կողմերի դաշտեր ծառայությունում չկան։ Ամսաթվերի ձևաչափը նկարագրված չէ. mock-ում՝ YYYY-MM-DD։
 */

const addr = (extra = {}) => ({ region: 'ԵՐԵՎԱՆ', br_email: '', br_phone: '', building: '', apartment: '', br_mobile: '', community: '', br_website: '', postal_index: '', building_type: '', residence_code: '', br_address_line_1: '', br_address_line_2: '', ...extra });

function owner(o) {
  return {
    rp_vehicle_owner: {
      psn: o.psn, gender: o.gender, last_name: o.last, residence: 'ԵՐԵՎԱՆ', birth_date: o.birth, first_name: o.first, rp_is_holder: true, patronic_name: o.patronymic,
      pvd_document_type: 'ID card', rp_owner_joined_date: o.joined, rp_vehicle_owner_share: o.share || '1/1',
      rp_vehicle_owner_address: addr({ country_code_a2: 'AM' }),
      rp_person_is_legal_entity: false, rp_nationality_country_code_a2: 'AM', rp_entity_identification_number: '',
    },
  };
}

const lenderAddress = (descr) => ({ apt: '', email: '', house: '', phone: '', mobile: '', street1: '', street2: '', website: '', postcode: '', province: '', city_town: '', community: '', addr_descr: descr, country_id: 'AM', house_type: '' });

function vehicle(v) {
  const rec = {
    fuel: 'Բենզին',
    cert_num: `CERT-${v.reg}`, released: String(v.year), model_name: `${v.make} ${v.model}`, engine_type: 'ՆԱՇ', number_copy: '',
    vehicle_vin: v.vin, vehicle_make: v.make, vehicle_type: 'Մարդատար', owner_cert_id: `OWN-${v.reg}`, vehicle_color: v.color || 'Սև', vehicle_group: 'M1', vehicle_model: v.model,
    yellow_number: { name: '', number: '', tax_id: '', address: { apt: '', email: '', house: '', phone: '', mobile: '', street1: '', street2: '', website: '', postcode: '', province: '', city_town: '', community: '', country_id: '', house_type: '', city_town_code: '' }, reg_num: '', cert_num: '', end_date: '' },
    vehicle_number: v.number, vehicle_weight: '1550', vehicle_reg_num: v.reg, vehicle_type_id: 1,
    rp_vehicle_holder: {
      psn: v.owner.psn, gender: v.owner.gender, last_name: v.owner.last, birth_date: v.owner.birth, first_name: v.owner.first, patronic_name: v.owner.patronymic,
      country_code_a2: 'AM', pvd_document_type: 'ID card', rp_person_is_legal_entity: false,
      rp_vehicle_holder_address: addr({ residence: 'ԵՐԵՎԱՆ' }),
      holder_registration_address: { region: 'ԵՐԵՎԱՆ', street: '', building: '', apartment: '', community: '', residence: 'ԵՐԵՎԱՆ', building_type: '' },
      br_nationality_country_code_a2: 'AM', rp_entity_identification_number: '',
    },
    rp_vehicle_owners: [owner({ ...v.owner, joined: v.joined })],
    vehicle_body_type: v.body || 'Սեդան', vehicle_engine_hp: v.hp || 180, vehicle_fuel_type: 'Բենզին', vehicle_is_blocked: !!v.blocked, vehicle_max_weight: '2000',
    vehicle_model_code: v.code || '', vehicle_plate_type: 'Ստանդարտ', vehicle_body_number: v.vin, vehicle_is_inactive: !!v.out, vehicle_created_date: v.joined,
    vehicle_engine_power: Math.round((v.hp || 180) * 0.7355), vehicle_release_date: `${v.year}-01-01`, vehicle_engine_number: `ENG-${v.reg}`, vehicle_special_notes: '',
    vehicle_chassis_number: '', vehicle_recording_date: v.joined, vehicle_transit_number: '', vehicle_temporary_number: '', vehicle_recording_out_date: v.out || '',
    vehicle_registration_status: v.out ? 'Հանված է հաշվառումից' : 'Հաշվառված',
    rp_vehicle_insurance_details: { vehicle_insurance_company: 'Ապահովագրական ընկերություն', vehicle_insurance_end_date: '2026-04-30', vehicle_insurance_start_date: '2025-05-01' },
    vehicle_owner_certificate_number: `OWN-${v.reg}`, vehicle_registration_certificate_number: `CERT-${v.reg}`,
  };
  if (v.lender) {
    rec.lenders = [{ lender: { psn: '', sex: '', place: '', shares: String(v.lender.amount), address: lenderAddress(v.lender.name), currency: 'AMD', last_name: '', first_name: '', joined_date: v.joined, middle_name: '', document_type: '', allowed_lending: false, is_legal_entity: true, identification_no: v.lender.tin, nationality_country_id: 'AM' } }];
  }
  return { rp_vehicle: rec };
}

const P = {
  armen: { psn: '2507750412', first: 'ԱՐՄԵՆ', last: 'ՀՈՎՀԱՆՆԻՍՅԱՆ', patronymic: 'ԳԱԳԻԿԻ', birth: '25/07/1975', gender: 'M' },
  tigran: { psn: '0306800215', first: 'ՏԻԳՐԱՆ', last: 'ՄԿՐՏՉՅԱՆ', patronymic: 'ՍԱՄՎԵԼԻ', birth: '03/06/1980', gender: 'M' },
  narine: { psn: '1501870928', first: 'ՆԱՐԻՆԵ', last: 'ԱՎԵՏԻՍՅԱՆ', patronymic: 'ՀՐԱՉՅԱՅԻ', birth: '15/01/1987', gender: 'F' },
  gor: { psn: '1404760512', first: 'ԳՈՌ', last: 'ԵՂԻԱԶԱՐՅԱՆ', patronymic: 'ՄԱՐՏԻՆԻ', birth: '14/04/1976', gender: 'M' },
  davit: { psn: '0804770163', first: 'ԴԱՎԻԹ', last: 'ԳՐԻԳՈՐՅԱՆ', patronymic: 'ԱՇՈՏԻ', birth: '08/04/1977', gender: 'M' },
};

const byPsn = {
  '2507750412': [vehicle({ owner: P.armen, vin: 'JTNB11HK0J3000123', make: 'TOYOTA', model: 'CAMRY', year: 2018, number: '35 OO 123', reg: 'R000123', joined: '2018-07-12' })],
  // Տիգրան Մկրտչյան. հաշվառված BMW X5, որը հայտարարագրում չկա
  '0306800215': [vehicle({ owner: P.tigran, vin: 'WBACV61010LL00456', make: 'BMW', model: 'X5', year: 2020, body: 'Ամենագնաց', hp: 340, number: '77 XX 777', reg: 'R000456', joined: '2025-08-30', lender: { name: 'Արդշինբանկ', tin: '02520018', amount: 18000000 } })],
  '1501870928': [
    vehicle({ owner: P.narine, vin: 'KNADN512AE6000789', make: 'KIA', model: 'RIO', year: 2014, number: '12 AB 345', reg: 'R000789', joined: '2016-03-01', out: '2025-04-02' }),
    vehicle({ owner: P.narine, vin: 'KMHJ381ABKU000321', make: 'HYUNDAI', model: 'TUCSON', year: 2019, body: 'Ամենագնաց', number: '01 HT 019', reg: 'R000321', joined: '2025-04-20' }),
  ],
  '1404760512': [vehicle({ owner: P.gor, vin: 'JTEBR3FJ10K000654', make: 'TOYOTA', model: 'LAND CRUISER PRADO', year: 2021, body: 'Ամենագնաց', hp: 280, number: '99 GG 999', reg: 'R000654', joined: '2021-05-05', out: '2025-09-02' })],
  '0804770163': [],
};

export function getVehicleInfo(req) {
  const q = req?.rp_get_vehicle_info_request || {};
  const out = (rp_vehicles) => ({ rp_get_vehicle_info_response: { rp_vehicles } });
  const psn = q.by_person_psn?.psn;
  if (psn) return out(byPsn[psn] || []);
  const vin = q.by_vehicle_vin?.vehicle_vin;
  if (vin) return out(Object.values(byPsn).flat().filter((v) => v.rp_vehicle.vehicle_vin === vin));
  return out([]);
}
export const policeKnownPsns = Object.keys(byPsn);
