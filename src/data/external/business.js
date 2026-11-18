/**
 * ԻԱՊՌ (moj-business, company_info/v1) mock — SRS 11.5.6։
 * Հարցում՝ br_company_info_request { by_name: { name, type } } | { by_tax_id: { tax_id } } | { by_reg_num: { reg_num } }։
 * Անձով (psn) որոնում ծառայությունում չկա (Q-53)։ br_company_documents-ի base64 դաշտերը թողնված են դատարկ (11.4)։
 * Նախատիպում ԻԱՊՌ-ի տվյալները կանոններում չեն օգտագործվում. դրանք հասանելի են «Արտաքին համակարգեր» էջում։
 */

const emptyAddr = { region: 'ԵՐԵՎԱՆ', br_email: '', br_phone: '', building: '', apartment: '', br_mobile: '', community: '', br_website: '', postal_index: '', building_type: '', residence_code: '', br_full_address: '', country_code_a2: 'AM', br_address_line_1: '', br_address_line_2: '', br_different_from_residence: false };
const idDetails = (psn, birth) => ({ psn, gender: '', src_tin: '', birth_date: birth || '', br_hide_psn: false, company_zcode: '', company_registered: '', company_insurer_code: '', company_type_long: '', pvd_document_type: 'ID card', pvd_document_issuer: '', pvd_document_number: '', pvd_document_issuance_date: '' });

function company(c) {
  return {
    br_company: {
      src_tin: c.tin, company_id: c.cid, company_type: c.type, company_type_id: c.type === 'ՍՊԸ' ? '13' : '14',
      company_type_long: c.type === 'ՍՊԸ' ? 'Սահմանափակ պատասխանատվությամբ ընկերություն' : 'Փակ բաժնետիրական ընկերություն',
      company_name_am: c.name, company_name_en: c.en || '', company_name_ru: '',
      company_reg_num: c.reg, company_registered: c.registered, company_registration_type: 'մշտական', company_certificate_number: `CRT-${c.reg}`,
      company_capital: c.capital, company_zcode: '', company_industry_code: c.industry || '', company_insurer_code: '',
      company_is_blocked: false, company_is_inactive: !!c.inactive,
      br_company_address: { ...emptyAddr, br_full_address: c.address || '' },
      br_company_documents: { br_company_charter: '', br_company_statement: '' },
      br_company_owners: c.owners.map((o) => ({
        br_company_owner: {
          psn: o.psn || '', last_name: o.last || '', first_name: o.first || '', patronic_name: o.patronymic || '', br_entity_name: o.entity || `${o.first} ${o.last}`,
          br_owner_shares: o.share, br_owner_joined_date: o.joined, br_owner_left_date: o.left || '', br_owner_is_founder: !!o.founder,
          br_owner_is_resident: true, br_owner_is_legal_entity: !!o.entity, br_owner_is_blocked: false, br_owner_certificate_number: '',
          br_nationality_country_code_a2: 'AM', br_owner_identification_number: 0, br_entity_identification_number: o.entityTin || '',
        },
        br_owner_share_details: { br_owner_share_count: o.share, br_owner_share_value: Math.round((c.capital * o.share) / 100), br_owner_share_percent: o.share, br_owner_share_fraction: `${o.share}/100` },
        br_owner_address: emptyAddr,
        br_owner_identification_details: idDetails(o.psn, o.birth),
      })),
      br_company_executive: { psn: c.exec.psn || '', last_name: c.exec.last, first_name: c.exec.first, patronic_name: c.exec.patronymic || '', br_entity_name: '', company_executive_position: 'Տնօրեն', br_nationality_country_code_a2: 'AM', br_entity_identification_number: '' },
      br_executive_address: emptyAddr,
      br_executive_identification_details: idDetails(c.exec.psn),
    },
  };
}

export const companies = [
  company({ tin: '02598765', cid: 50211, type: 'ՍՊԸ', name: 'Բիլդ Գրուպ', reg: '286.110.01234', registered: '2015-04-14', capital: 5000000, industry: '41.20', address: 'Երևան, Արշակունյաց 2',
    owners: [{ psn: '3006830442', first: 'Հայկ', last: 'Խաչատրյան', patronymic: 'Վահանի', share: 60, joined: '2015-04-14', founder: true }, { psn: '1109790221', first: 'Արտյոմ', last: 'Սահակյան', share: 40, joined: '2015-04-14', founder: true }],
    exec: { psn: '1109790221', first: 'Արտյոմ', last: 'Սահակյան' } }),
  company({ tin: '01566778', cid: 40118, type: 'ՓԲԸ', name: 'ԱրմՏեխ', reg: '264.120.04567', registered: '2009-09-09', capital: 20000000, industry: '46.51',
    owners: [{ entity: 'ԱրմՏեխ Հոլդինգ ՍՊԸ', entityTin: '01577889', share: 100, joined: '2009-09-09', founder: true }],
    exec: { psn: '2202750333', first: 'Նարեկ', last: 'Ավագյան' } }),
  company({ tin: '00812345', cid: 30777, type: 'ՍՊԸ', name: 'Լյուքս Թայմ', reg: '273.110.07788', registered: '2012-02-20', capital: 1000000, industry: '47.77',
    owners: [{ psn: '1501700119', first: 'Գրիգոր', last: 'Աղաջանյան', share: 100, joined: '2012-02-20', founder: true }],
    exec: { psn: '1501700119', first: 'Գրիգոր', last: 'Աղաջանյան' } }),
  company({ tin: '02512345', cid: 60321, type: 'ՍՊԸ', name: 'Ալֆա Կոնսալտ', reg: '290.110.09911', registered: '2018-06-01', capital: 500000, industry: '70.22',
    owners: [{ psn: '3105780123', first: 'Արսեն', last: 'Մարտիրոսյան', patronymic: 'Հակոբի', share: 100, joined: '2018-06-01', founder: true }],
    exec: { psn: '3105780123', first: 'Արսեն', last: 'Մարտիրոսյան' } }),
];

export function companyInfo(req) {
  const q = req?.br_company_info_request || {};
  let found = null;
  if (q.by_tax_id) found = companies.find((c) => c.br_company.src_tin === q.by_tax_id.tax_id);
  else if (q.by_reg_num) found = companies.find((c) => c.br_company.company_reg_num === q.by_reg_num.reg_num);
  else if (q.by_name) found = companies.find((c) => c.br_company.company_name_am === q.by_name.name && c.br_company.company_type === q.by_name.type);
  return found || { br_company: null };
}
