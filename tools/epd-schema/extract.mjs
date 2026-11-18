/**
 * EPD-ի կառուցվածքի արտահանում (միայն կարդալու)։
 *
 * Արտահանում է ՄԻԱՅՆ կառուցվածք և ագրեգատներ. անձնական տվյալներով տողեր չեն կարդացվում.
 *   1. knowledge base. meta_category, meta_field (prefix = 'de-service')
 *   2. data-entry սխեմայի ֆիզիկական սյուները (information_schema)
 *   3. դասակարգիչների (c_*) արժեքները՝ բացի համակարգային (c_user, c_group, c_role, c_organization …)
 *   4. ագրեգատներ. վիճակների, տեսակների, tabtype/status/datafillingoption բաշխումներ և դաշտերի լրացվածություն
 *      (միայն քանակներ, արժեքների ձևաչափի դասեր՝ առանց արժեքների)
 *
 * Գործարկում (ԿԿՀ-ի ցանցից կամ VPN-ով).
 *   npm run epd:schema
 * Արդյունքը՝ docs/epd-schema/*.json
 */
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const env = process.env;
for (const k of ['EPD_PGHOST', 'EPD_PGPORT', 'EPD_PGDATABASE', 'EPD_PGUSER', 'EPD_PGPASSWORD', 'EPD_SCHEMA_KB', 'EPD_SCHEMA_DE']) {
  if (!env[k]) { console.error(`Բացակայում է ${k} (.env.local)`); process.exit(1); }
}
const KB = env.EPD_SCHEMA_KB;
const DE = env.EPD_SCHEMA_DE;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'epd-schema');
mkdirSync(OUT, { recursive: true });

const client = new pg.Client({
  host: env.EPD_PGHOST, port: Number(env.EPD_PGPORT), database: env.EPD_PGDATABASE,
  user: env.EPD_PGUSER, password: env.EPD_PGPASSWORD,
  connectionTimeoutMillis: 15000, statement_timeout: 300000, application_name: 'cpc-risk-prototype-schema',
});

const q = async (sql, params) => (await client.query(sql, params)).rows;
const save = (name, data) => { writeFileSync(join(OUT, name), JSON.stringify(data, null, 2)); console.log(`✓ ${name}`); };
const ident = (s) => `"${String(s).replace(/"/g, '""')}"`;

// Համակարգային և անձնական տվյալներ պարունակող դասակարգիչներ. չեն արտահանվում
const SKIP_LOOKUPS = new Set(['c_user', 'c_group', 'c_role', 'c_organization', 'c_wfaction_role', 'c_usergroup', 'c_userrole']);
// Դասակարգիչների սյուներից արտահանվում են միայն այս անվանումներով սյուները
const SAFE_LOOKUP_COLS = /^(entityid|wfstateid|wfprocessid|wfactionid|wftargetstateid|name_arm|name_eng|name_rus|code|parentid|orderid|deletedon|radiobuttonsystemname|isfinal|hasinterests|isdeclarant|activationdate|childcategories|declarationtype|declaranttype|abbreviation|systemname|system_name)$/;

async function main() {
  await client.connect();
  await q("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  console.log('Միացում՝ OK');

  // 1. knowledge base
  const cats = await q(`SELECT system_name, table_name, display_name_multilingual->>'1' AS label_hy, display_name_multilingual->>'7' AS label_en,
      is_classifier, is_with_versioning, is_root, is_child, is_system, wf_process_id, date_updated
    FROM ${ident(KB)}.meta_category WHERE prefix = 'de-service' ORDER BY system_name`);
  save('meta_category.json', cats);
  const fields = await q(`SELECT meta_category_system_name AS category, system_name, lower(column_name) AS column_name, meta_field_type AS type,
      meta_category_id AS target, group_system_name AS grp, is_system_field, is_transient, is_key_field, max_length,
      display_name_multilingual->>'1' AS label_hy, display_name_multilingual->>'7' AS label_en
    FROM ${ident(KB)}.meta_field WHERE prefix = 'de-service'
    ORDER BY meta_category_system_name, group_system_name, (sort_info->>'sortIndex')::int NULLS LAST`);
  save('meta_field.json', fields);

  // 2. ֆիզիկական սյուներ
  const cols = await q(`SELECT table_name, column_name, data_type, ordinal_position
    FROM information_schema.columns WHERE table_schema = $1 ORDER BY table_name, ordinal_position`, [DE]);
  const tables = {};
  for (const c of cols) (tables[c.table_name] ||= []).push(`${c.column_name}:${c.data_type}`);
  save('physical_columns.json', tables);

  // 3. դասակարգիչներ
  const lookups = {};
  for (const t of Object.keys(tables).filter((t) => t.startsWith('c_') && !SKIP_LOOKUPS.has(t))) {
    const safe = tables[t].map((c) => c.split(':')[0]).filter((c) => SAFE_LOOKUP_COLS.test(c));
    if (!safe.length) continue;
    const n = (await q(`SELECT count(*)::int AS n FROM ${ident(DE)}.${ident(t)}`))[0].n;
    lookups[t] = { count: n, rows: n <= 400 ? await q(`SELECT ${safe.map(ident).join(', ')} FROM ${ident(DE)}.${ident(t)} ORDER BY 1`) : `(${n} տող, չի արտահանվել)` };
  }
  save('lookups.json', lookups);

  // 4. ագրեգատներ (միայն քանակներ)
  const has = (t, c) => tables[t]?.some((x) => x.startsWith(`${c}:`));
  const agg = {};
  const dist = async (key, t, col, current = true) => {
    if (!tables[t] || !has(t, col)) return;
    const pub = current && tables[`${t}publisheditem`] ? `JOIN ${ident(DE)}.${ident(`${t}publisheditem`)} p ON p.entityid = x.entityid` : '';
    agg[key] = await q(`SELECT x.${ident(col)} AS value, count(*)::int AS n FROM ${ident(DE)}.${ident(t)} x ${pub} GROUP BY 1 ORDER BY 2 DESC LIMIT 100`);
  };
  agg.row_counts = {};
  for (const t of Object.keys(tables).filter((t) => t.startsWith('de_'))) agg.row_counts[t] = (await q(`SELECT count(*)::int AS n FROM ${ident(DE)}.${ident(t)}`))[0].n;

  for (const [root, cols2] of Object.entries({
    de_declaration: ['wfstateid', 'declarationtype', 'declaranttype', 'year', 'declarationkind', 'positiontype'],
    de_report: ['wfstateid', 'reporttype', 'year'],
    de_gift: ['wfstateid', 'receiptyear', 'givertype', 'giftsubclassification', 'publishgift'],
    de_integrity: ['wfstateid', 'integritytype', 'year'],
    de_party: ['wfstateid', 'iscloned'],
    de_profile: ['iscloned'],
  })) for (const c of cols2) await dist(`${root}.${c}`, root, c);

  // detail աղյուսակների tabtype / status / datafillingoption / familymembertype
  for (const t of Object.keys(tables).filter((t) => t.startsWith('de_') && !t.endsWith('publisheditem')))
    for (const c of ['tabtype', 'status', 'datafillingoption', 'familymembertype'])
      if (has(t, c) && (t.includes('details') || t.startsWith('de_integrity') || t.startsWith('de_financialmeans') || t.startsWith('de_revenues'))) await dist(`${t}.${c}`, t, c, false);

  // լրացվածություն և ձևաչափի դասեր (առանց արժեքների)
  const fmtClass = async (key, t, col) => {
    if (!has(t, col)) return;
    agg[key] = await q(`SELECT CASE
        WHEN ${ident(col)} IS NULL OR btrim(${ident(col)}::text) = '' THEN 'empty'
        WHEN ${ident(col)}::text ~ '^[0-9]{10}$' THEN '10 digits (ՀԾՀ-ի ձևաչափ)'
        WHEN ${ident(col)}::text ~ '^[0-9]+$' THEN 'other digits'
        WHEN ${ident(col)}::text ~ '^[A-Za-z]{2}[0-9]{6,7}$' THEN '2 letters + digits (անձնագրի ձևաչափ)'
        ELSE 'other' END AS class, count(*)::int AS n
      FROM ${ident(DE)}.${ident(t)} GROUP BY 1 ORDER BY 2 DESC`);
  };
  for (const t of ['de_reportincomesmonetarydonationsofindividuals', 'de_reportincomesmembershipfees', 'de_reportincomesentryfees', 'de_reportincomesothernonmonetarydonations', 'de_reportincomesprohibitedmonetarydonations', 'de_reportincomesnoncompliantandnottransferredmonetarydonations'])
    await fmtClass(`${t}.identitydocumentnumber.format`, t, 'identitydocumentnumber');
  await fmtClass('de_profile.ssn.format', 'de_profile', 'ssn');

  const nullRate = async (key, t, col, where = '') => {
    if (!has(t, col)) return;
    agg[key] = (await q(`SELECT count(*)::int AS total, count(${ident(col)})::int AS filled FROM ${ident(DE)}.${ident(t)} ${where}`))[0];
  };
  await nullRate('de_profile.positiontype.fill(clones)', 'de_profile', 'positiontype', 'WHERE iscloned = 1');
  await nullRate('de_gift.amount_amd.fill', 'de_gift', 'amount_amd');
  save('aggregates.json', agg);

  await client.end();
  console.log(`Ավարտ. արդյունքը՝ ${OUT}`);
}

main().catch(async (e) => {
  console.error('Սխալ.', e.message);
  try { await client.end(); } catch { /* */ }
  process.exit(1);
});
