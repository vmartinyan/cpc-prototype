/**
 * Կադաստր (get_realty_owned/v1) mock — docs/external_web_services/cadastre.get_realty_owned.v1։
 * Հարցում՝ cad_get_realty_owned_request { by_ssn: { ssn, date_from, date_to } } կամ { by_pass: { passport, date_from, date_to } }, ամսաթվերը՝ dd/mm/yyyy։
 * Պատասխան՝ cad_get_realty_owned_response { owned_realties[ { owned_realty_object: {...} } ] }։
 * cad_registration_date-ի ձևաչափը նկարագրված չէ. mock-ում՝ dd/mm/yyyy։ Արժեքի, գործարքի և գործարքի կողմի դաշտեր ծառայությունում չկան,
 * ուստի mock-ում նույնպես չկան (կադաստրային արժեք, գործարքի գին և այլն)։
 */

function realty(o) {
  return { owned_realty_object: {
    UNIT_ADDRESS: o.unit,
    owned_realty_address: {
      house: o.house || '', region: o.region || 'ԵՐԵՎԱՆ', building: o.building || '', community: o.community || '',
      house_type: o.house_type || '', street_name: o.street || '', street_type: o.street_type || 'փողոց',
      building_type: o.building_type || 'շենք', substreet_name: '', substreet_type: '',
    },
    cad_bld_area: o.bld_area || '',
    cad_land_area: o.land_area || '',
    cad_is_terminate: o.terminated ? 'true' : 'false',
    cad_rgt_type_name: o.rgt || 'Սեփականություն',
    cad_prcl_rgt_type_name: o.land_area ? 'Սեփականություն' : '',
    cad_land_trg_prp_type: o.land_area ? 'Բնակավայրերի' : '',
    cad_land_designated_type: o.land_area ? 'Բնակելի կառուցապատման' : '',
    cad_bld_trg_prp_tps_name: o.bld_purpose || 'Բնակելի',
    cad_bld_purpose_of_use_name: o.bld_type || 'Բնակարան',
    cad_registration_date: o.regdate,
    cad_certificate_number: o.cert,
  } };
}

const byOwner = {
  // Արմեն Հովհաննիսյան. հայտարարագրված բնակարան + չհայտարարագրված ավտոտնակ
  '2507750412': [
    realty({ unit: 'Երևան, Կոմիտասի պող. 14, բն. 22', street: 'Կոմիտասի', building: '14', house: '22', community: 'Արաբկիր', bld_area: '96', regdate: '14/08/2012', cert: '01082012-01-0123' }),
    realty({ unit: 'Երևան, Կոմիտասի պող. 14/1, ավտոտնակ 7', street: 'Կոմիտասի', building: '14/1', house: '7', community: 'Արաբկիր', bld_area: '21', bld_purpose: 'Հասարակական', bld_type: 'Ավտոտնակ', regdate: '03/10/2025', cert: '03102025-01-0991' }),
  ],
  '1802680734': [
    realty({ unit: 'Երևան, Սայաթ-Նովայի պող. 5, բն. 9', street: 'Սայաթ-Նովայի', building: '5', house: '9', community: 'Կենտրոն', bld_area: '120', regdate: '21/02/2008', cert: '21022008-01-0456' }),
    realty({ unit: 'Երևան, Բաղրամյան պող. 70, բն. 3', street: 'Բաղրամյան', building: '70', house: '3', community: 'Արաբկիր', bld_area: '64', regdate: '11/07/2017', cert: '11072017-01-0789' }),
  ],
  '0306800215': [
    realty({ unit: 'Երևան, Դավիթաշեն 4-րդ թաղ., շ. 12, բն. 40', street: 'Դավիթաշեն 4-րդ թաղ.', building: '12', house: '40', community: 'Դավիթաշեն', bld_area: '110', rgt: 'Սեփականություն (գրավադրված)', regdate: '19/06/2025', cert: '19062025-01-0321' }),
  ],
  '2209830385': [
    realty({ unit: 'Երևան, Աջափնյակ, Մարգարյան փ. 23, բն. 15', street: 'Մարգարյան', building: '23', house: '15', community: 'Աջափնյակ', bld_area: '78', regdate: '05/05/2016', cert: '05052016-01-0555' }),
  ],
  '3105780123': [
    realty({ unit: 'Երևան, Արշակունյաց պող. 41, բն. 60', street: 'Արշակունյաց', building: '41', house: '60', community: 'Շենգավիթ', bld_area: '85', regdate: '17/09/2014', cert: '17092014-01-0222' }),
    realty({ unit: 'Կոտայքի մարզ, Ծաղկաձոր, Օրբելի փ. 9', region: 'ԿՈՏԱՅՔ', community: 'Ծաղկաձոր', street: 'Օրբելի', building: '9', bld_area: '240', land_area: '1200', bld_type: 'Առանձնատուն', regdate: '28/04/2025', cert: '28042025-07-0019' }),
    realty({ unit: 'Երևան, Մաշտոցի պող. 33, տարածք 2', street: 'Մաշտոցի', building: '33', house: '2', community: 'Կենտրոն', bld_area: '120', bld_purpose: 'Հասարակական', bld_type: 'Կոմերցիոն տարածք', regdate: '02/12/2019', cert: '02122019-01-0111', terminated: true }),
  ],
};

export function getRealtyOwned(req) {
  const q = req?.cad_get_realty_owned_request || {};
  const ssn = q.by_ssn?.ssn;
  return { cad_get_realty_owned_response: { owned_realties: (ssn && byOwner[ssn]) || [] } };
}
export const cadastreKnownSsns = Object.keys(byOwner);
