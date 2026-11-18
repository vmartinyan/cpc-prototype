/**
 * ՃՈ (police-road, get_vehicle_info/v1) mock — SRS 11.5.4։
 * Հարցում՝ rp_get_vehicle_info_request { by_person_psn: { psn, rp_vehicle_timestamp? } } (կամ by_vehicle_* տարբերակներ)։
 * Պատասխան՝ rp_vehicles[0..100]։ Գնի, գործարքի և գործարքի կողմերի դաշտեր ծառայությունում չկան,
 * ուստի mock-ում նույնպես չկան։ Դաշտերի բնադրումը 11.5.4-ում ամբողջովին հստակ չէ. mock-ը հետևում է աղյուսակի հերթականությանը։
 * lenders[1..1000]՝ ներառվում է միայն գրավի առկայության դեպքում։
 */

function owner(o) {
  return {
    rp_vehicle_owner: {
      psn: o.psn, gender: o.gender, last_name: o.last, first_name: o.first, patronic_name: o.patronymic, birth_date: o.birth,
      residence: 'ԵՐԵՎԱՆ', pvd_document_type: 'ID card', rp_is_holder: true, rp_owner_joined_date: o.joined, rp_vehicle_owner_share: o.share || '1/1',
      rp_person_is_legal_entity: false, rp_nationality_country_code_a2: 'AM', rp_entity_identification_number: '',
    },
    rp_vehicle_owner_address: { region: 'ԵՐԵՎԱՆ', br_email: '', br_phone: '', building: '', apartment: '', br_mobile: '', community: '', br_website: '', postal_index: '', building_type: '', residence_code: '', country_code_a2: 'AM', br_address_line_1: '', br_address_line_2: '' },
  };
}

function vehicle(v) {
  const rec = {
    vehicle_vin: v.vin, vehicle_make: v.make, vehicle_model: v.model, model_name: `${v.make} ${v.model}`, vehicle_model_code: v.code || '',
    vehicle_type: 'Մարդատար', vehicle_group: 'M1', vehicle_body_type: v.body || 'Սեդան', vehicle_type_id: 1,
    vehicle_color: v.color || 'Սև', vehicle_weight: '1550', vehicle_max_weight: '2000',
    vehicle_fuel_type: 'Բենզին', fuel: 'Բենզին', engine_type: 'ՆԱՇ',
    vehicle_engine_hp: v.hp || 180, vehicle_engine_power: Math.round((v.hp || 180) * 0.7355),
    vehicle_release_date: `${v.year}-01-01`, released: String(v.year),
    vehicle_number: v.number, number_copy: '', vehicle_plate_type: 'Ստանդարտ', vehicle_temporary_number: '', vehicle_transit_number: '',
    vehicle_reg_num: v.reg, reg_num: v.reg, cert_num: `CERT-${v.reg}`, vehicle_registration_certificate_number: `CERT-${v.reg}`, vehicle_owner_certificate_number: `OWN-${v.reg}`, owner_cert_id: `OWN-${v.reg}`,
    vehicle_body_number: v.vin, vehicle_engine_number: `ENG-${v.reg}`, vehicle_chassis_number: '',
    vehicle_special_notes: '',
    vehicle_is_inactive: !!v.out,
    vehicle_is_blocked: !!v.blocked,
    vehicle_registration_status: v.out ? 'Հանված է հաշվառումից' : 'Հաշվառված',
    vehicle_created_date: v.joined, vehicle_recording_date: v.joined, vehicle_recording_out_date: v.out || '',
    end_date: '',
    yellow_number: { name: '', number: '', tax_id: '', address: { apt: '', email: '', house: '', phone: '', mobile: '', street1: '', street2: '', website: '', postcode: '', province: '', city_town: '', community: '', country_id: '', house_type: '', city_town_code: '' } },
    rp_vehicle_holder: { psn: v.owner.psn, gender: v.owner.gender, last_name: v.owner.last, first_name: v.owner.first, patronic_name: v.owner.patronymic, birth_date: v.owner.birth, country_code_a2: 'AM', pvd_document_type: 'ID card', rp_person_is_legal_entity: false, rp_entity_identification_number: '', br_nationality_country_code_a2: 'AM' },
    rp_vehicle_holder_address: { region: 'ԵՐԵՎԱՆ', br_email: '', br_phone: '', building: '', apartment: '', br_mobile: '', community: '', residence: 'ԵՐԵՎԱՆ', br_website: '', postal_index: '', building_type: '', residence_code: '', br_address_line_1: '', br_address_line_2: '' },
    holder_registration_address: { region: 'ԵՐԵՎԱՆ', street: '', building: '', apartment: '', community: '', residence: 'ԵՐԵՎԱՆ', building_type: '' },
    rp_vehicle_owners: [owner({ ...v.owner, joined: v.joined })],
    rp_vehicle_insurance_details: { vehicle_insurance_company: 'Ապահովագրական ընկերություն', vehicle_insurance_start_date: '2025-05-01', vehicle_insurance_end_date: '2026-04-30' },
  };
  if (v.lender) {
    rec.lenders = [{ lender: { psn: '', first_name: '', middle_name: '', last_name: '', sex: '', joined_date: v.joined, place: '', shares: String(v.lender.amount), currency: 'AMD', allowed_lending: false, is_legal_entity: true, identification_no: v.lender.tin, document_type: '', nationality_country_id: 'AM', address: { apt: '', email: '', house: '', phone: '', mobile: '', street1: '', street2: '', website: '', postcode: '', province: '', city_town: '', community: '', addr_descr: v.lender.name, country_id: 'AM', house_type: '' } } }];
  }
  return rec;
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
  const psn = q.by_person_psn?.psn;
  if (psn) return { rp_vehicles: byPsn[psn] || [] };
  const vin = q.by_vehicle_vin?.vehicle_vin;
  if (vin) return { rp_vehicles: Object.values(byPsn).flat().filter((v) => v.vehicle_vin === vin) };
  return { rp_vehicles: [] };
}
export const policeKnownPsns = Object.keys(byPsn);
