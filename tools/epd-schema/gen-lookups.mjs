/**
 * Գեներացնում է src/data/epd/lookups.generated.js՝ docs/epd-schema/lookups.json-ից
 * (EPD թեստային բազայի դասակարգիչներ, արտահանված extract.mjs-ով)։
 * Վերցվում են միայն նախատիպի համար անհրաժեշտ դասակարգիչները. id-ները և հայերեն անվանումները իրական են։
 *   node tools/epd-schema/gen-lookups.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const L = JSON.parse(readFileSync(join(root, 'docs', 'epd-schema', 'lookups.json'), 'utf8'));

const WANT = [
  'c_yesno', 'c_integrationstatus', 'c_datafillingoption', 'c_declarationtype', 'c_declaranttype', 'c_familymembertype', 'c_relativetype',
  'c_positiontype', 'c_institution', 'c_incometype', 'c_sourceoforigin', 'c_cashdetailstype', 'c_bankaccountbalancedetailstype',
  'c_electronicaccountscryptocurrencydetailstype', 'c_depositdetailstype', 'c_loandetailstype', 'c_realestatedetailstype', 'c_vehicledetailstype',
  'c_realestatetype', 'c_dealmethod', 'c_expensetype', 'c_revenuesremainingprincipalstype', 'c_persontype', 'c_giftclassification',
  'c_giftsubclassification', 'c_gifttype', 'c_aievaluationstatus', 'c_aiconfidencelevel', 'c_integritytype', 'c_integritycashdetailstype',
  'c_relationwithnominee', 'c_criminalsubcultureactivities', 'c_reporttype', 'c_reportkind', 'c_partyincomesgroup', 'c_partyexpenditurestype',
  'c_donationtype', 'c_wfstate',
];

const out = {};
const missing = [];
for (const t of WANT) {
  const x = L[t];
  if (!x || !Array.isArray(x.rows)) { missing.push(t); continue; }
  out[t] = {};
  for (const r of x.rows) {
    const id = r.entityid ?? r.wfstateid;
    const item = { name: r.name_arm };
    if (r.parentid !== undefined && r.parentid !== null) item.parent = r.parentid;
    if (r.wfprocessid !== undefined) item.process = r.wfprocessid;
    if (r.radiobuttonsystemname) item.flag = r.radiobuttonsystemname;
    if (r.deletedon) item.deleted = true;
    out[t][id] = item;
  }
}

const header = `/* Ավտոմատ գեներացված՝ tools/epd-schema/gen-lookups.mjs (աղբյուր՝ EPD թեստային բազայի դասակարգիչներ). ձեռքով չխմբագրել */\n`;
writeFileSync(join(root, 'src', 'data', 'epd', 'lookups.generated.js'), `${header}export const LOOKUPS = ${JSON.stringify(out, null, 1)};\n`);
console.log(`✓ ${Object.keys(out).length} դասակարգիչ${missing.length ? `, բացակայում են՝ ${missing.join(', ')}` : ''}`);
