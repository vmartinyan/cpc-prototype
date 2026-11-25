/**
 * ԲՊՌ (police-passport) mock — docs/external_web_services/police-passport.search_by_psn.v1 և search_by_doc_num.v1։
 * Հարցում՝ pr_search_by_psn_request { psn } կամ pr_search_by_docnum_request { Document_Number }։
 * Պատասխան՝ pr_search_response { AVVPerson { PNum, IsDead, AVVAddresses, AVVDocuments, SSN_Indicator } }.
 * AVVAddresses-ը, AVVDocuments-ը և SSN_Indicator-ը AVVPerson-ի կազմում են (ըստ Guideline-ի)։
 * Զանգվածի տարրերը՝ { AVVAddress_Item: {...} } և { Document_object: {...} } (Guideline-ի ծառի անուններով)։
 * Photo_ID-ն Document_object-ի մակարդակում է և թողնված է դատարկ (լուսանկարը չպետք է պահվի)։
 * Չգտնվելու դեպքում պատասխանը փաստաթղթում նկարագրված չէ. mock-ում՝ { pr_search_response: null }։
 */

const ARM = { CountryCode: '051', CountryName: 'ՀԱՅԱՍՏԱՆ', CountryShortName: 'ARM' };

function person({ psn, first, last, patronymic, birth, genus, docType = 'ID card', docNum, isDead = 'false', ssnIndicator = 'true', region = 'ԵՐԵՎԱՆ', community = 'ԿԵՆՏՐՈՆ', street = 'ՏԻԳՐԱՆ ՄԵԾԻ', building = '10', apartment = '5', en = ['', '', ''] }) {
  return {
    AVVPerson: {
      PNum: psn,
      IsDead: isDead,
      AVVAddresses: {
        AVVAddress: [
          {
            AVVAddress_Item: {
              Registration_Data: { Registration_Date: '12/05/2015', Registration_Type: 'CURRENT', Registration_Status: 'P', Registration_Department: '011' },
              ResidenceDocument: { Residence_Document: '', Residence_Document_Number: '' },
              Registration_Address: { type: 'Current', Region: region, Street: street, Building: building, Apartment: apartment, Community: community, Residence: region === 'ԵՐԵՎԱՆ' ? 'ԵՐԵՎԱՆ' : community, LocationCode: '0010', Postal_Index: '0010', Building_Type: 'ՇԵՆՔ' },
            },
          },
        ],
      },
      AVVDocuments: {
        Document: [
          {
            Document_object: {
              Person: {
                Genus: genus, Last_Name: last, Birth_Date: birth, First_Name: first,
                Citizenship: ARM, Nationality: { NationalityCode: '01', NationalityName: 'ՀԱՅ' },
                Birth_Region: region, Birth_Address: region, Birth_Country: ARM,
                Patronymic_Name: patronymic, English_Last_Name: en[1], English_First_Name: en[0], English_Patronymic_Name: en[2],
              },
              Photo_ID: '',
              PassportData: { Passport_Type: 'C', Related_Document_Date: '', Passport_Issuance_Date: '15/03/2019', Passport_Validity_Date: '15/03/2029', Related_Document_Number: '', Related_Document_Department: '' },
              BasicDocument: { Basic_Document_Code: '', Basic_Document_Name: '', Basic_Document_Number: '', Basic_Document_Country: ARM },
              Document_Type: docType,
              Document_Number: docNum,
              Document_Status: 'Primary Valid',
              Document_Department: '011',
            },
          },
        ],
      },
      SSN_Indicator: ssnIndicator,
    },
  };
}

/** Ծառայության «բազա»՝ անձանց ցուցակ (pr_search_response օբյեկտներ) */
export const bprRecords = [
  // Հայտարարատուներ և ընտանիքի անդամներ
  person({ psn: '0000101925', first: 'ԱՐՄԵՆ', last: 'ՀՈՎՀԱՆՆԻՍՅԱՆ', patronymic: 'ԳԱԳԻԿԻ', birth: '25/07/1975', genus: 'M', docNum: '009812345' }),
  person({ psn: '0000100963', first: 'ԼԻԼԻԹ', last: 'ՀՈՎՀԱՆՆԻՍՅԱՆ', patronymic: 'ԱՐՏԱՇԵՍԻ', birth: '14/03/1979', genus: 'F', docNum: '009812346' }),
  person({ psn: '0000101370', first: 'ԳԱՅԱՆԵ', last: 'ՍԱՐԳՍՅԱՆ', patronymic: 'ՌՈՒԲԵՆԻ', birth: '18/02/1968', genus: 'F', docNum: '005512001' }),
  person({ psn: '0000100112', first: 'ՏԻԳՐԱՆ', last: 'ՄԿՐՏՉՅԱՆ', patronymic: 'ՍԱՄՎԵԼԻ', birth: '03/06/1980', genus: 'M', docNum: '007734120' }),
  person({ psn: '0000101148', first: 'ՆԱՐԻՆԵ', last: 'ԱՎԵՏԻՍՅԱՆ', patronymic: 'ՀՐԱՉՅԱՅԻ', birth: '15/01/1987', genus: 'F', docNum: '010245678' }),
  person({ psn: '0000100445', first: 'ԴԱՎԻԹ', last: 'ԳՐԻԳՈՐՅԱՆ', patronymic: 'ԱՇՈՏԻ', birth: '08/04/1977', genus: 'M', docNum: '006690112' }),
  person({ psn: '0000101777', first: 'ՍՈՒՐԵՆ', last: 'ՎԱՐԴԱՆՅԱՆ', patronymic: 'ԿԱՐԵՆԻ', birth: '22/09/1983', genus: 'M', docNum: '008823451' }),
  person({ psn: '0000101333', first: 'ԱՆԻ', last: 'ԽԱՉԱՏՐՅԱՆ', patronymic: 'ՄՀԵՐԻ', birth: '17/12/1985', genus: 'F', docNum: '009034512' }),
  person({ psn: '0000102184', first: 'ՎԱՀԵ', last: 'ՂԱԶԱՐՅԱՆ', patronymic: 'ՄՈՒՇԵՂԻ', birth: '30/01/1972', genus: 'M', docNum: '004412378', region: 'ԱՐԱՐԱՏ', community: 'ԱՐՏԱՇԱՏ' }),
  // Թեկնածուներ
  person({ psn: '0000101555', first: 'ՌՈՒԶԱՆՆԱ', last: 'ՊՈՂՈՍՅԱՆ', patronymic: 'ԱՐԹՈՒՐԻ', birth: '19/09/1991', genus: 'F', docNum: '011987654' }),
  person({ psn: '0000100186', first: 'ԳԵՎՈՐԳ', last: 'ԱԲՐԱՀԱՄՅԱՆ', patronymic: 'ՎԱՉԵԻ', birth: '04/12/1984', genus: 'M', docNum: '008876543' }),
  person({ psn: '0000102147', first: 'ԷԴԳԱՐ', last: 'ՍԻՄՈՆՅԱՆ', patronymic: 'ԳՐԻԳՈՐԻ', birth: '28/08/1979', genus: 'M', docNum: '007765432' }),
  // Կուսակցություններին վճարում կատարած անձինք
  person({ psn: '0000102295', first: 'ԱՐՍԵՆ', last: 'ՄԱՐՏԻՐՈՍՅԱՆ', patronymic: 'ՀԱԿՈԲԻ', birth: '31/05/1978', genus: 'M', docNum: '006123987' }),
  person({ psn: '0000100852', first: 'ԿԱՐԻՆԵ', last: 'ԴԱՎԹՅԱՆ', patronymic: 'ՍԵՐԳԵՅԻ', birth: '12/03/1985', genus: 'F', docNum: '009456123' }),
  person({ psn: '0000100297', first: 'ՀՐԱՆՏ', last: 'ՍԻՄՈՆՅԱՆ', patronymic: 'ԱՐԱՄԻ', birth: '07/02/1970', genus: 'M', docNum: '003789456' }),
  // ՀԾՀ-ն պատկանում է այլ անձի (EPD-ում՝ «Կարեն Մարտիրոսյան») → անհամապատասխանություն
  person({ psn: '0000101740', first: 'ԿԱՐԵՆ', last: 'ՄԱՆՈՒԿՅԱՆ', patronymic: 'ՎԻԳԵՆԻ', birth: '22/08/1981', genus: 'M', docNum: '007321654' }),
  // Գտնվում է միայն փաստաթղթի համարով (EPD-ում identitydocumentnumber = անձնագրի համար)
  person({ psn: '0000101999', first: 'ՍՈՆԱ', last: 'ՀԱԿՈԲՅԱՆ', patronymic: 'ՏԻԳՐԱՆԻ', birth: '26/11/1983', genus: 'F', docType: 'Biometric', docNum: 'AT0456789' }),
  person({ psn: '0000101000', first: 'ԳՈՌ', last: 'ԵՂԻԱԶԱՐՅԱՆ', patronymic: 'ՄԱՐՏԻՆԻ', birth: '14/04/1976', genus: 'M', docNum: '005647382' }),
  person({ psn: '0000102036', first: 'ՎԱՐԴԱՆ', last: 'ՊԵՏՐՈՍՅԱՆ', patronymic: 'ԱՇՈՏԻ', birth: '27/01/1969', genus: 'M', docNum: '003198765' }),
  person({ psn: '0000100630', first: 'ԱՆՆԱ', last: 'ՍՏԵՓԱՆՅԱՆ', patronymic: 'ՌՈԲԵՐՏԻ', birth: '10/02/1988', genus: 'F', docNum: '010293847' }),
  person({ psn: '0000101518', first: 'ՄՀԵՐ', last: 'ԶԱՔԱՐՅԱՆ', patronymic: 'ԳՈՒՐԳԵՆԻ', birth: '19/08/1975', genus: 'M', docNum: '005019283', isDead: 'true', region: 'ՇԻՐԱԿ', community: 'ԳՅՈՒՄՐԻ' }),
  person({ psn: '0000101851', first: 'ՆԱԻՐԱ', last: 'ՄՈՎՍԻՍՅԱՆ', patronymic: 'ԱՐՄԵՆԻ', birth: '23/04/1982', genus: 'F', docNum: '007564738' }),
  person({ psn: '0000101185', first: 'ՏԱՐՈՆ', last: 'ՄԵԼԻՔՅԱՆ', patronymic: 'ԱՐՄԱՆԻ', birth: '15/06/1990', genus: 'M', docNum: '011203948' }),
  person({ psn: '0000100149', first: 'ՇՈՒՇԱՆ', last: 'ԳԱԼՍՏՅԱՆ', patronymic: 'ՎԱՐԴԱՆԻ', birth: '03/10/1992', genus: 'F', docNum: '011938475' }),
  // ԿԿՀ-ի աշխատակիցներ (մոդուլի օգտատերեր. ավելացվում են ՀԾՀ-ով, մուտքը՝ ԵՍ ԵՄ, NFR-05…NFR-09)
  person({ psn: '0000100741', first: 'ԱՆՆԱ', last: 'ՄԵԼՔՈՒՄՅԱՆ', patronymic: 'ԿԱՐԵՆԻ', birth: '11/05/1988', genus: 'F', docNum: '010554321' }),
  person({ psn: '0000101814', first: 'ԳՈՌ', last: 'ՍԱՀԱԿՅԱՆ', patronymic: 'ԱՐՄԵՆԻ', birth: '23/03/1985', genus: 'M', docNum: '009321784' }),
  person({ psn: '0000100408', first: 'ԼՈՒՍԻՆԵ', last: 'ԱՌԱՔԵԼՅԱՆ', patronymic: 'ՍԱՄՎԵԼԻ', birth: '07/09/1990', genus: 'F', docNum: '011045672' }),
  person({ psn: '0000101222', first: 'ԱՐԱՄ', last: 'ԹԱԴԵՎՈՍՅԱՆ', patronymic: 'ԳՐԻԳՈՐԻ', birth: '15/12/1978', genus: 'M', docNum: '006781239' }),
  person({ psn: '0000102110', first: 'ՀՈՎՀԱՆՆԵՍ', last: 'ԲԵԳԼԱՐՅԱՆ', patronymic: 'ՌՈՒԲԵՆԻ', birth: '28/01/1983', genus: 'M', docNum: '008107654' }),
  // ԿԿՀ-ի աշխատակից, որը դեռ օգտատեր չէ (օգտատիրոջ ավելացման օրինակ)
  person({ psn: '0000100519', first: 'ՄԱՐԻԱՄ', last: 'ԿԻՐԱԿՈՍՅԱՆ', patronymic: 'ԴԱՎԹԻ', birth: '09/05/1992', genus: 'F', docNum: '011876502' }),
];

export function searchByPsn(req) {
  const psn = req?.pr_search_by_psn_request?.psn;
  return { pr_search_response: bprRecords.find((r) => r.AVVPerson.PNum === psn) || null };
}
export function searchByDocNum(req) {
  const num = req?.pr_search_by_docnum_request?.Document_Number;
  return { pr_search_response: bprRecords.find((r) => r.AVVPerson.AVVDocuments.Document.some((d) => d.Document_object.Document_Number === num)) || null };
}
