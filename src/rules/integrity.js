/**
 * Բարեվարքության հարցաթերթիկների կանոններ — SRS բաժին 7։ Կանոնները քաշ չունեն (INT-03)։
 * Բանալի բառի գտնվելը առանձին ռիսկային նշում է (INT-06), ուստի (ա)/(բ)/(գ) ենթակետերը առանձին կանոններ են։
 * Բանալի բառերը որոնվում են միայն ձեռքով լրացվող տեքստային դաշտերում և միայն «Այո» պատասխանի դեպքում (INT-06)։
 */
import { v, fired, notFired, notApplicable, findKeywords, normName, samePersonName } from './common.js';
import { lk } from '../data/epd/classifiers.js';
import { isYes, amd } from '../data/epd/repository.js';

const kwRule = ({ id, title, criterion, srsRef, flag, flagLabel, tables, varKey }) => ({
  id,
  direction: 'integrity',
  title,
  criterion,
  srsRef,
  requirements: ['INT-03', 'INT-04', 'INT-06'],
  params: [{ key: 'keywords', label: 'Բանալի բառերի ցանկ', kind: 'list', default: { var: varKey } }],
  caveats: ['Որոնումը ենթատողային է՝ առանց բառաձևերի (օր.՝ «ձգձգել» բառը չի գտնի «ձգձգվել»)'],
  evaluate(q, api) {
    const keywords = api.param('keywords');
    const answer = isYes(q.liability?.[flag]);
    if (!answer) return notFired([v.bool(flagLabel, false)], 'Պատասխանը «Ոչ» է. բանալի բառերը չեն որոնվում (INT-06)');
    const hits = tables.flatMap(([table, fields]) => findKeywords(q.rows(table), fields, keywords, table));
    const values = [v.bool(flagLabel, true), v.text('Բանալի բառեր', keywords.join(', ')), ...hits.map((h) => v.text(`Գտնվել է «${h.keyword}»՝ ${h.field}`, h.text))];
    return hits.length ? fired(values, `Գտնվել է բանալի բառ՝ ${[...new Set(hits.map((h) => `«${h.keyword}»`))].join(', ')}`) : notFired(values, 'Բանալի բառեր չեն գտնվել');
  },
});

const flagRule = ({ id, title, criterion, srsRef, flags }) => ({
  id,
  direction: 'integrity',
  title,
  criterion,
  srsRef,
  requirements: ['INT-03', 'INT-04'],
  params: [],
  evaluate(q) {
    const values = flags.map(([f, label]) => v.bool(label, isYes(q.liability?.[f])));
    const yes = flags.filter(([f]) => isYes(q.liability?.[f])).map(([, l]) => l);
    return yes.length ? fired(values, `«Այո» պատասխան՝ ${yes.join(', ')}`) : notFired(values, 'Բոլոր պատասխանները «Ոչ» են');
  },
});

const ym = (m, y) => (y ? `${String(m || 1).padStart(2, '0')}.${y}` : 'առ այսօր');
const ymFromDate = (d) => (d ? `${d.slice(5, 7)}.${d.slice(0, 4)}` : 'առ այսօր');

/** Հայտարարագրերի պահանջվող պատուհան. նախորդ N տարի՝ հարցաթերթիկի ներկայացման տարվանից առաջ (INT-05) */
function declWindow(q, years) {
  const y = q.integrity.year;
  return q.declarations.filter((d) => d.year >= y - years && d.year <= y - 1);
}

export const integrityRules = [
  {
    id: 'INT-R2',
    direction: 'integrity',
    title: 'Պաշտոնների անհամապատասխանություն հայտարարագրերին',
    criterion: 'Եթե թեկնածուն հայտարարատու է, հարցաթերթիկի ներկա և նախորդ պաշտոնները պետք է նույնական լինեն նախորդ մի քանի տարվա հայտարարագրերի պաշտոններին. բացակայող կամ տարբեր պաշտոնը, հաստատությունը կամ ժամանակահատվածը ռիսկային է',
    srsRef: 'Բաժին 7, կանոն 2',
    requirements: ['INT-03', 'INT-04', 'INT-05'],
    params: [{ key: 'years', label: 'Համեմատվող տարիների քանակ', unit: 'տարի', default: null }],
    caveats: ['Տարիների քանակը SRS-ում սահմանված չէ (Q-32). մինչև մուտքագրումը կանոնը «չի գնահատվել»', 'Համեմատումը անվանումով է (հաստատությունը հայտարարագրում դասակարգիչ է, հարցաթերթիկում՝ տեքստ, Q-32). ժամանակահատվածը՝ ամիս և տարի'],
    evaluate(q, api) {
      if (!q.declarations.length) return notApplicable('Թեկնածուն հայտարարատու չէ (ՀԾՀ-ով հայտարարագիր չկա)');
      const years = api.param('years');
      const decls = declWindow(q, years);
      if (!decls.length) return notApplicable(`Նախորդ ${years} տարվա հայտարարագրեր չկան`);
      const winStart = Math.min(...decls.map((d) => d.year));
      const winEnd = Math.max(...decls.map((d) => d.year));
      const declPositions = [];
      const seen = new Set();
      for (const d of decls)
        for (const p of [...q.declProfileRows('de_profilepositionslist', d), ...q.declProfileRows('de_profileotherpositionslist', d)].map((x) => ({ ...x, institution: x.institutionname || lk('c_institution', x.institution) || '—', startdate: x.assumptiondate, enddate: x.terminationdate }))) {
          const key = `${normName(p.institution)}|${normName(p.position)}|${ymFromDate(p.startdate)}|${ymFromDate(p.enddate)}`;
          if (!seen.has(key)) { seen.add(key); declPositions.push({ ...p, key }); }
        }
      const qPositions = q.rows('de_integrityworkpositions').map((p) => ({ ...p, institution: p.institutionname, key: `${normName(p.institutionname)}|${normName(p.position)}|${ym(p.startmonth, p.startyear)}|${ym(p.endmonth, p.endyear)}` }));
      const overlaps = (p) => p.startyear <= winEnd && (!p.endyear || p.endyear >= winStart);
      const missingInQ = declPositions.filter((d) => !qPositions.some((p) => p.key === d.key));
      const missingInDecl = qPositions.filter(overlaps).filter((p) => !declPositions.some((d) => d.key === p.key));
      const fmtD = (p) => `${p.institution} — ${p.position} (${ymFromDate(p.startdate)}–${ymFromDate(p.enddate)})`;
      const fmtQ = (p) => `${p.institution} — ${p.position} (${ym(p.startmonth, p.startyear)}–${ym(p.endmonth, p.endyear)})`;
      const values = [
        v.text('Համեմատված հայտարարագրեր', decls.map((d) => d.year).sort().join(', ')),
        v.text('Հայտարարագրերի պաշտոններ', declPositions.map(fmtD).join('; ')),
        v.text('Հարցաթերթիկի պաշտոններ', qPositions.map(fmtQ).join('; ')),
      ];
      if (missingInQ.length) values.push(v.text('Հարցաթերթիկում բացակայում է / տարբեր է', missingInQ.map(fmtD).join('; ')));
      if (missingInDecl.length) values.push(v.text('Հայտարարագրերում բացակայում է / տարբեր է', missingInDecl.map(fmtQ).join('; ')));
      return missingInQ.length || missingInDecl.length ? fired(values, 'Պաշտոնների տվյալները չեն համընկնում') : notFired(values, 'Պաշտոնները համընկնում են');
    },
  },
  {
    id: 'INT-R3',
    direction: 'integrity',
    title: 'Հանրային պաշտոն զբաղեցնող ազգականների անհամապատասխանություն',
    criterion: 'Հարցաթերթիկում լրացված ազգականները պետք է լինեն նույն անձինք, ինչ նախորդ մի քանի տարվա հայտարարագրերում լրացվածները',
    srsRef: 'Բաժին 7, կանոն 3',
    requirements: ['INT-03', 'INT-04', 'INT-05'],
    params: [{ key: 'years', label: 'Համեմատվող տարիների քանակ', unit: 'տարի', default: null }],
    partial: true,
    caveats: [
      'Մասնակի. ստուգվում է միայն մեկ ուղղությունը՝ հարցաթերթիկի ազգականը պետք է լինի հայտարարագրերի ազգականների ցանկում։ Հակառակ ուղղությունը չի ստուգվում, քանի որ հայտարարագրում նշվում են բոլոր մերձավոր ազգականները, իսկ հարցաթերթիկում՝ միայն հանրային պաշտոն զբաղեցնողները',
      'Համադրումը անուն-ազգանվամբ է (ազգականների ՀԾՀ չկա, Q-32). տարիների քանակը՝ Q-32',
    ],
    evaluate(q, api) {
      if (!q.declarations.length) return notApplicable('Թեկնածուն հայտարարատու չէ');
      const years = api.param('years');
      const decls = declWindow(q, years);
      if (!decls.length) return notApplicable(`Նախորդ ${years} տարվա հայտարարագրեր չկան`);
      const declRel = [];
      for (const d of decls) for (const r of q.declProfileRows('de_profilerelatives', d)) if (!declRel.some((x) => samePersonName(`${x.firstname} ${x.lastname}`, `${r.firstname} ${r.lastname}`))) declRel.push(r);
      const qRel = q.rows('de_integrityinterestspublicofficerelatives');
      const missing = qRel.filter((r) => !declRel.some((d) => samePersonName(`${d.firstname} ${d.lastname}`, r.relativefullname)));
      const values = [
        v.text('Համեմատված հայտարարագրեր', decls.map((d) => d.year).sort().join(', ')),
        v.text('Հայտարարագրերի ազգականներ', declRel.map((r) => `${r.firstname} ${r.lastname}`).join('; ') || '—'),
        v.text('Հարցաթերթիկի ազգականներ (հանրային պաշտոն)', qRel.map((r) => `${r.relativefullname} (${lk('c_relationwithnominee', r.relationwithnominee)}, ${r.employername})`).join('; ') || '—'),
      ];
      if (missing.length) values.push(v.text('Հայտարարագրերում բացակայում են', missing.map((r) => r.relativefullname).join('; ')));
      return missing.length ? fired(values, 'Հարցաթերթիկի ազգականը բացակայում է հայտարարագրերի ազգականների ցանկում') : notFired(values, 'Անհամապատասխանություն չի հայտնաբերվել');
    },
  },
  {
    id: 'INT-R4',
    direction: 'integrity',
    title: 'Կուսակցական անդամակցության անհամապատասխանություն',
    criterion: 'Հարցաթերթիկի կուսակցական անդամակցության տվյալները պետք է նույնական լինեն հայտարարագրերի տվյալներին. բացակայությունը կամ տարբերությունը ռիսկային է',
    srsRef: 'Բաժին 7, կանոն 4',
    requirements: ['INT-03', 'INT-04', 'INT-05'],
    params: [{ key: 'years', label: 'Համեմատվող տարիների քանակ', unit: 'տարի', default: null }],
    caveats: ['Համեմատվում են միայն անդամակցության փաստը և կուսակցության անվանումը (Q-32)', 'Տարիների քանակը՝ Q-32'],
    evaluate(q, api) {
      if (!q.declarations.length) return notApplicable('Թեկնածուն հայտարարատու չէ');
      const years = api.param('years');
      const decls = declWindow(q, years);
      if (!decls.length) return notApplicable(`Նախորդ ${years} տարվա հայտարարագրեր չկան`);
      const declNames = new Set();
      let declFact = false;
      for (const d of decls) {
        const det = q.declRows('de_membershipinpartiesdetails', d);
        det.forEach((r) => declNames.add(normName(r.partyname)));
        if (isYes(q.declSection('de_membershipinparties', d)?.hasmembership) || det.length) declFact = true;
      }
      const qRows = q.rows('de_integrityinterestspartymembership');
      const qFact = isYes(q.interests?.havepartymembership) || qRows.length > 0;
      const qNames = new Set(qRows.map((r) => normName(r.partyname)));
      const diff = [...declNames].filter((n) => !qNames.has(n)).concat([...qNames].filter((n) => !declNames.has(n)));
      const values = [
        v.text('Համեմատված հայտարարագրեր', decls.map((d) => d.year).sort().join(', ')),
        v.bool('Հայտարարագրերում՝ անդամակցություն', declFact),
        v.text('Հայտարարագրերում՝ կուսակցություն', [...declNames].join('; ') || '—'),
        v.bool('Հարցաթերթիկում՝ անդամակցություն', qFact),
        v.text('Հարցաթերթիկում՝ կուսակցություն', [...qNames].join('; ') || '—'),
      ];
      if (declFact !== qFact) return fired(values, 'Անդամակցության փաստը չի համընկնում');
      if (diff.length) return fired(values, `Կուսակցության անվանումը չի համընկնում (${diff.join(', ')})`);
      return notFired(values, 'Տվյալները համընկնում են');
    },
  },
  flagRule({ id: 'INT-R5a', title: 'Կարգապահական պատասխանատվություն («Այո» պատասխան)', criterion: '«Այո» պատասխանը կարգապահական պատասխանատվության ենթարկված լինելու հարցին', srsRef: 'Բաժին 7, կանոն 5 (ա)', flags: [['havedisciplinaryliabilities', 'Կարգապահական պատասխանատվություն']] }),
  kwRule({ id: 'INT-R5b', title: 'Կարգապահական պատասխանատվություն (բանալի բառեր)', criterion: 'Լրացված տեքստում «ՀՀ սահմանը», «ապացույց կորցնել», «ձգձգել» բառերի առկայություն', srsRef: 'Բաժին 7, կանոն 5 (բ)', flag: 'havedisciplinaryliabilities', flagLabel: 'Կարգապահական պատասխանատվություն', varKey: 'kw_disciplinary',
    tables: [['de_integrityliabilitydisciplinary', ['liabilitytype', 'basis']], ['de_integrityliabilitydisciplinaryadditionalinformation', ['circumstancesdescription', 'appealinformationandgrounds', 'appellationfinalresult']]] }),
  flagRule({ id: 'INT-R6', title: 'Քրեական պատասխանատվություն և դատվածություն', criterion: '«Այո» պատասխան քրեական պատասխանատվության, դատվածության կամ հանված (մարված) դատվածության հարցերից որևէ մեկին', srsRef: 'Բաժին 7, կանոն 6',
    flags: [['havecriminalliabilities', 'Քրեական պատասխանատվություն'], ['haveconviction', 'Դատվածություն'], ['isconvictionrevoked', 'Հանված (մարված) դատվածություն']] }),
  flagRule({ id: 'INT-R7a', title: 'Քրեական հետապնդում չիրականացնելու/դադարեցնելու որոշում («Այո» պատասխան)', criterion: '«Այո» պատասխանը որոշման առկայության հարցին', srsRef: 'Բաժին 7, կանոն 7 (ա)', flags: [['haveunfulfilledterminatedprosecutions', 'Քրեական հետապնդում չիրականացնելու/դադարեցնելու որոշում']] }),
  kwRule({ id: 'INT-R7b', title: 'Քրեական հետապնդման դադարեցում (բանալի բառեր)', criterion: 'Լրացված տեքստում «ոչ արդարացնող», «ոչ արդարացման», «ոչ ռեաբիլիտացնող», «բողոքի բացակայություն» բառերի առկայություն', srsRef: 'Բաժին 7, կանոն 7 (բ)', flag: 'haveunfulfilledterminatedprosecutions', flagLabel: 'Քրեական հետապնդում չիրականացնելու/դադարեցնելու որոշում', varKey: 'kw_prosecution',
    tables: [['de_integrityliabilityunfulfilledterminatedprosecutions', ['prosecutiondecision']]] }),
  flagRule({ id: 'INT-R8a', title: 'Վարչական պատասխանատվություն («Այո» պատասխան)', criterion: '«Այո» պատասխանը վարչական պատասխանատվության ենթարկված լինելու հարցին', srsRef: 'Բաժին 7, կանոն 8 (ա)', flags: [['haveadministrativeliabilities', 'Վարչական պատասխանատվություն']] }),
  {
    id: 'INT-R8b',
    direction: 'integrity',
    title: 'Վարչական պատասխանատվությունների քանակ',
    criterion: 'Վարչական պատասխանատվությունների քանակը համեմատվում է քանակի շեմի հետ',
    srsRef: 'Բաժին 7, կանոն 8 (բ)',
    requirements: ['INT-03', 'INT-04', 'COM-04'],
    params: [{ key: 'threshold', label: 'Քանակի շեմ', unit: 'հատ', default: { var: 'int_admin_count' } }],
    caveats: ['Համեմատման օպերատորը SRS-ում նշված չէ. նախատիպում՝ «քանակը ≥ շեմ»'],
    evaluate(q, api) {
      const t = api.param('threshold');
      const n = q.rows('de_integrityliabilityadministrative').length;
      const values = [v.num('Վարչական պատասխանատվությունների քանակ', n), v.num('Շեմ', t)];
      return n >= t ? fired(values, `Քանակը (${n}) հասնում է շեմին`) : notFired(values, 'Քանակը շեմից ցածր է');
    },
  },
  kwRule({ id: 'INT-R8c', title: 'Վարչական պատասխանատվություն (բանալի բառեր)', criterion: 'Լրացված տեքստում «ոչ սթափ» բառի առկայություն', srsRef: 'Բաժին 7, կանոն 8 (գ)', flag: 'haveadministrativeliabilities', flagLabel: 'Վարչական պատասխանատվություն', varKey: 'kw_administrative',
    tables: [['de_integrityliabilityadministrative', ['liabilitytype', 'basis']], ['de_integrityliabilityadministrativeadditionalinformation', ['circumstancesdescription', 'appealinformationandgrounds', 'appellationfinalresult']]] }),
  flagRule({ id: 'INT-R9a', title: 'Քաղաքացիական գործերին մասնակցություն («Այո» պատասխան)', criterion: '«Այո» պատասխանը քաղաքացիական գործերին մասնակցության հարցին', srsRef: 'Բաժին 7, կանոն 9 (ա)', flags: [['havecivilcaseparticipation', 'Քաղաքացիական գործերին մասնակցություն']] }),
  {
    id: 'INT-R9b',
    direction: 'integrity',
    title: 'Քաղաքացիական գործերի քանակ',
    criterion: 'Քաղաքացիական գործերի քանակը համեմատվում է քանակի շեմի հետ',
    srsRef: 'Բաժին 7, կանոն 9 (բ)',
    requirements: ['INT-03', 'INT-04', 'COM-04'],
    params: [{ key: 'threshold', label: 'Քանակի շեմ', unit: 'հատ', default: { var: 'int_civil_count' } }],
    caveats: ['Համեմատման օպերատորը SRS-ում նշված չէ. նախատիպում՝ «քանակը ≥ շեմ»'],
    evaluate(q, api) {
      const t = api.param('threshold');
      const n = q.rows('de_integrityliabilitycivilcaseparticipation').length;
      const values = [v.num('Քաղաքացիական գործերի քանակ', n), v.num('Շեմ', t)];
      return n >= t ? fired(values, `Քանակը (${n}) հասնում է շեմին`) : notFired(values, 'Քանակը շեմից ցածր է');
    },
  },
  kwRule({ id: 'INT-R9c', title: 'Քաղաքացիական գործեր (բանալի բառեր)', criterion: 'Լրացված տեքստում «սնանկություն», «ալիմենտ» բառերի առկայություն', srsRef: 'Բաժին 7, կանոն 9 (գ)', flag: 'havecivilcaseparticipation', flagLabel: 'Քաղաքացիական գործերին մասնակցություն', varKey: 'kw_civil',
    tables: [['de_integrityliabilitycivilcaseparticipation', ['requirement', 'additionalinformation']]] }),
  {
    id: 'INT-R10',
    direction: 'integrity',
    title: 'Քրեական ենթամշակույթին հարելու հնարավորություն',
    criterion: '«Այո» պատասխանը քրեական ենթամշակույթի հետ կապի հարցերից որևէ մեկին',
    srsRef: 'Բաժին 7, կանոն 10',
    requirements: ['INT-03', 'INT-04'],
    params: [],
    evaluate(q) {
      const rows = q.rows('de_integrityrelationtocriminalsubculturenomineeinfo');
      const yes = rows.filter((r) => isYes(r.haverelation));
      const act = (r) => lk('c_criminalsubcultureactivities', r.activity);
      const values = rows.map((r) => v.bool(act(r), isYes(r.haverelation)));
      yes.forEach((r) => r.description && values.push(v.text(`Նկարագրություն՝ ${act(r)}`, r.description)));
      return yes.length ? fired(values, `«Այո» պատասխան՝ ${yes.map(act).join(', ')}`) : notFired(values, 'Բոլոր պատասխանները «Ոչ» են');
    },
  },
  {
    id: 'INT-R11',
    direction: 'integrity',
    title: 'Գույքային դրություն. կանխիկ դրամական միջոցներ',
    criterion: 'Թեկնածուի և ընտանիքի անդամների կանխիկ դրամական միջոցների ընդհանուր գումարը գերազանցում է 5 մլն դրամը',
    srsRef: 'Բաժին 7, կանոն 11 (միակ սահմանված օրինակը)',
    requirements: ['INT-03', 'INT-04', 'COM-04'],
    params: [{ key: 'threshold', label: 'Կանխիկի շեմ', unit: 'AMD', default: { var: 'cash_threshold' } }],
    caveats: ['Տողերի կարգավիճակով (status) զտում չի կատարվում. որ կարգավիճակի տողերն են վերլուծվում՝ Q-40'],
    evaluate(q, api) {
      const t = api.param('threshold');
      const rows = q.rows('de_integrityfinancialmeanscash');
      const total = rows.reduce((s, r) => s + (amd(r, 'amount') || 0), 0);
      const values = [...rows.map((r) => v.amd(`Կանխիկ՝ ${q.profileName(r.profile)}${r.familymembertype ? ` (${lk('c_familymembertype', r.familymembertype)})` : ''}${r.amount_currencyid !== 2 ? ` [${r.amount_amount} × ${r.amount_ratetodefault}]` : ''}`, amd(r, 'amount'))), v.amd('Ընդհանուր', total), v.amd('Շեմ', t)];
      return total > t ? fired(values, 'Կանխիկի ընդհանուր գումարը գերազանցում է շեմը') : notFired(values, 'Կանխիկի ընդհանուր գումարը չի գերազանցում շեմը');
    },
  },
];
