/**
 * ԲՊՌ (police-passport) mock — SRS 11.5.1։
 * Ծառայություններ. search_by_psn/v1 (pr_search_by_psn_request.psn) և
 * search_by_doc_num/v1 (pr_search_by_docnum_request.Document_Number)։ Պատասխանը՝ pr_search_response։
 * Դաշտերի անունները և բնադրումը՝ ըստ 11.5.1-ի։ SSN_Indicator-ը 11.5.1 աղյուսակում տրված է
 * փաստաթղթի դաշտերից հետո, իսկ 11.2-ում՝ AVVPerson-ի կազմում. mock-ում այն AVVPerson-ում է։
 * Photo_ID-ն թողնված է դատարկ (11.4. լուսանկարը չպետք է պահվի)։
 */

const ARM = { CountryCode: '051', CountryName: 'ՀԱՅԱՍՏԱՆ', CountryShortName: 'ARM' };

function person({ psn, first, last, patronymic, birth, genus, docType = 'ID card', docNum, isDead = 'false', ssnIndicator = 'true', region = 'ԵՐԵՎԱՆ', community = 'ԿԵՆՏՐՈՆ', street = 'ՏԻԳՐԱՆ ՄԵԾԻ', building = '10', apartment = '5', en = ['', '', ''] }) {
  return {
    AVVPerson: { PNum: psn, IsDead: isDead, SSN_Indicator: ssnIndicator },
    AVVAddresses: {
      AVVAddress: [
        {
          Registration_Data: { Registration_Date: '12/05/2015', Registration_Type: 'CURRENT', Registration_Status: 'P', Registration_Department: '011' },
          ResidenceDocument: { Residence_Document: '', Residence_Document_Number: '' },
          Registration_Address: { type: 'Current', Region: region, Street: street, Building: building, Apartment: apartment, Community: community, Residence: region === 'ԵՐԵՎԱՆ' ? 'ԵՐԵՎԱՆ' : community, LocationCode: '0010', Postal_Index: '0010', Building_Type: 'ՇԵՆՔ' },
        },
      ],
    },
    AVVDocuments: {
      Document: [
        {
          Person: {
            Genus: genus, Last_Name: last, First_Name: first, Patronymic_Name: patronymic, Birth_Date: birth,
            Citizenship: ARM, Nationality: { NationalityCode: '01', NationalityName: 'ՀԱՅ' },
            Birth_Region: region, Birth_Address: region, Birth_Country: ARM,
            English_Last_Name: en[1], English_First_Name: en[0], English_Patronymic_Name: en[2], Photo_ID: '',
          },
          PassportData: { Passport_Type: 'C', Passport_Issuance_Date: '15/03/2019', Passport_Validity_Date: '15/03/2029', Related_Document_Date: '', Related_Document_Number: '', Related_Document_Department: '' },
          BasicDocument: { Basic_Document_Code: '', Basic_Document_Name: '', Basic_Document_Number: '', Basic_Document_Country: ARM },
          Document_Type: docType,
          Document_Number: docNum,
          Document_Status: 'Primary Valid',
          Document_Department: '011',
        },
      ],
    },
  };
}

/** Ծառայության «բազա»՝ անձանց ցուցակ (pr_search_response օբյեկտներ) */
export const bprRecords = [
  // Հայտարարատուներ և ընտանիքի անդամներ
  person({ psn: '2507750412', first: 'ԱՐՄԵՆ', last: 'ՀՈՎՀԱՆՆԻՍՅԱՆ', patronymic: 'ԳԱԳԻԿԻ', birth: '25/07/1975', genus: 'M', docNum: '009812345' }),
  person({ psn: '1403790526', first: 'ԼԻԼԻԹ', last: 'ՀՈՎՀԱՆՆԻՍՅԱՆ', patronymic: 'ԱՐՏԱՇԵՍԻ', birth: '14/03/1979', genus: 'F', docNum: '009812346' }),
  person({ psn: '1802680734', first: 'ԳԱՅԱՆԵ', last: 'ՍԱՐԳՍՅԱՆ', patronymic: 'ՌՈՒԲԵՆԻ', birth: '18/02/1968', genus: 'F', docNum: '005512001' }),
  person({ psn: '0306800215', first: 'ՏԻԳՐԱՆ', last: 'ՄԿՐՏՉՅԱՆ', patronymic: 'ՍԱՄՎԵԼԻ', birth: '03/06/1980', genus: 'M', docNum: '007734120' }),
  person({ psn: '1501870928', first: 'ՆԱՐԻՆԵ', last: 'ԱՎԵՏԻՍՅԱՆ', patronymic: 'ՀՐԱՉՅԱՅԻ', birth: '15/01/1987', genus: 'F', docNum: '010245678' }),
  person({ psn: '0804770163', first: 'ԴԱՎԻԹ', last: 'ԳՐԻԳՈՐՅԱՆ', patronymic: 'ԱՇՈՏԻ', birth: '08/04/1977', genus: 'M', docNum: '006690112' }),
  person({ psn: '2209830385', first: 'ՍՈՒՐԵՆ', last: 'ՎԱՐԴԱՆՅԱՆ', patronymic: 'ԿԱՐԵՆԻ', birth: '22/09/1983', genus: 'M', docNum: '008823451' }),
  person({ psn: '1712850894', first: 'ԱՆԻ', last: 'ԽԱՉԱՏՐՅԱՆ', patronymic: 'ՄՀԵՐԻ', birth: '17/12/1985', genus: 'F', docNum: '009034512' }),
  person({ psn: '3001720556', first: 'ՎԱՀԵ', last: 'ՂԱԶԱՐՅԱՆ', patronymic: 'ՄՈՒՇԵՂԻ', birth: '30/01/1972', genus: 'M', docNum: '004412378', region: 'ԱՐԱՐԱՏ', community: 'ԱՐՏԱՇԱՏ' }),
  // Թեկնածուներ
  person({ psn: '1909910732', first: 'ՌՈՒԶԱՆՆԱ', last: 'ՊՈՂՈՍՅԱՆ', patronymic: 'ԱՐԹՈՒՐԻ', birth: '19/09/1991', genus: 'F', docNum: '011987654' }),
  person({ psn: '0412840198', first: 'ԳԵՎՈՐԳ', last: 'ԱԲՐԱՀԱՄՅԱՆ', patronymic: 'ՎԱՉԵԻ', birth: '04/12/1984', genus: 'M', docNum: '008876543' }),
  person({ psn: '2808790863', first: 'ԷԴԳԱՐ', last: 'ՍԻՄՈՆՅԱՆ', patronymic: 'ԳՐԻԳՈՐԻ', birth: '28/08/1979', genus: 'M', docNum: '007765432' }),
  // Կուսակցություններին վճարում կատարած անձինք
  person({ psn: '3105780123', first: 'ԱՐՍԵՆ', last: 'ՄԱՐՏԻՐՈՍՅԱՆ', patronymic: 'ՀԱԿՈԲԻ', birth: '31/05/1978', genus: 'M', docNum: '006123987' }),
  person({ psn: '1203850456', first: 'ԿԱՐԻՆԵ', last: 'ԴԱՎԹՅԱՆ', patronymic: 'ՍԵՐԳԵՅԻ', birth: '12/03/1985', genus: 'F', docNum: '009456123' }),
  person({ psn: '0702700789', first: 'ՀՐԱՆՏ', last: 'ՍԻՄՈՆՅԱՆ', patronymic: 'ԱՐԱՄԻ', birth: '07/02/1970', genus: 'M', docNum: '003789456' }),
  // ՀԾՀ-ն պատկանում է այլ անձի (EPD-ում՝ «Կարեն Մարտիրոսյան») → անհամապատասխանություն
  person({ psn: '2208810321', first: 'ԿԱՐԵՆ', last: 'ՄԱՆՈՒԿՅԱՆ', patronymic: 'ՎԻԳԵՆԻ', birth: '22/08/1981', genus: 'M', docNum: '007321654' }),
  // Գտնվում է միայն փաստաթղթի համարով (EPD-ում identitydocumentnumber = անձնագրի համար)
  person({ psn: '2611830917', first: 'ՍՈՆԱ', last: 'ՀԱԿՈԲՅԱՆ', patronymic: 'ՏԻԳՐԱՆԻ', birth: '26/11/1983', genus: 'F', docType: 'Biometric', docNum: 'AT0456789' }),
  person({ psn: '1404760512', first: 'ԳՈՌ', last: 'ԵՂԻԱԶԱՐՅԱՆ', patronymic: 'ՄԱՐՏԻՆԻ', birth: '14/04/1976', genus: 'M', docNum: '005647382' }),
  person({ psn: '2701690348', first: 'ՎԱՐԴԱՆ', last: 'ՊԵՏՐՈՍՅԱՆ', patronymic: 'ԱՇՈՏԻ', birth: '27/01/1969', genus: 'M', docNum: '003198765' }),
  person({ psn: '1002880235', first: 'ԱՆՆԱ', last: 'ՍՏԵՓԱՆՅԱՆ', patronymic: 'ՌՈԲԵՐՏԻ', birth: '10/02/1988', genus: 'F', docNum: '010293847' }),
  person({ psn: '1908750677', first: 'ՄՀԵՐ', last: 'ԶԱՔԱՐՅԱՆ', patronymic: 'ԳՈՒՐԳԵՆԻ', birth: '19/08/1975', genus: 'M', docNum: '005019283', isDead: 'true', region: 'ՇԻՐԱԿ', community: 'ԳՅՈՒՄՐԻ' }),
  person({ psn: '2304820419', first: 'ՆԱԻՐԱ', last: 'ՄՈՎՍԻՍՅԱՆ', patronymic: 'ԱՐՄԵՆԻ', birth: '23/04/1982', genus: 'F', docNum: '007564738' }),
  person({ psn: '1506900183', first: 'ՏԱՐՈՆ', last: 'ՄԵԼԻՔՅԱՆ', patronymic: 'ԱՐՄԱՆԻ', birth: '15/06/1990', genus: 'M', docNum: '011203948' }),
  person({ psn: '0310920764', first: 'ՇՈՒՇԱՆ', last: 'ԳԱԼՍՏՅԱՆ', patronymic: 'ՎԱՐԴԱՆԻ', birth: '03/10/1992', genus: 'F', docNum: '011938475' }),
];

export function searchByPsn(req) {
  const psn = req?.pr_search_by_psn_request?.psn;
  return bprRecords.find((r) => r.AVVPerson.PNum === psn) || null;
}
export function searchByDocNum(req) {
  const num = req?.pr_search_by_docnum_request?.Document_Number;
  return bprRecords.find((r) => r.AVVDocuments.Document.some((d) => d.Document_Number === num)) || null;
}
