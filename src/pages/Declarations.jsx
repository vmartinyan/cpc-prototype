import { useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Link, Stack, Tab, Tabs, TextField, Tooltip, Typography, Alert,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { useStore, can } from '../engine/store.js';
import { current, detailRows, sectionOf, profileChildren, profileName, byInstance, versionsOf, liveProfileOf } from '../data/epd/repository.js';
import { lk, WF, DECLARATION_TYPE } from '../data/epd/classifiers.js';
import { CURRENCY_CODE } from '../data/epd/exchangeRates.js';
import { declarationsOfPerson, familyComposition } from '../engine/evaluator.js';
import { computeExpense, EXPENSE_LABELS, effectiveFormulas, readableFormula, DEFAULT_FORMULAS } from '../engine/annualExpense.js';
import { PageHeader, Section, RuleResults, ScoreChip, RiskChip, SimpleTable, FilterBar, EMPTY_FILTERS, KV, fmtAmd, fmtDate, navigate, InfoNote, fmtNum } from '../components/common.jsx';
import { ConclusionBox, ManualFlagBox, UndefinedVarsBanner, conclusionLabel } from '../components/casework.jsx';
import { applyFilters, firedIds } from './filters.js';
import { buildXlsx, downloadXlsx } from '../data/xlsxWriter.js';
import { MANUAL_RULES } from '../rules/catalog.js';

const allScopeResults = (u) => (u.scopes || []).flatMap((s) => Object.values(s.results || {}));
const unitFired = (u) => [...new Set((u.scopes || []).flatMap((s) => firedIds(s.results)))];
/** Աշխատած կանոններ՝ ներառյալ DEC-R7 (մասնագետի ձեռքով ռիսկային նշում, COM-20) */
const unitRuleIds = (u) => [...unitFired(u), ...(u.manual?.length ? ['DEC-R7'] : [])];
/** Միավորի կարգավիճակ. EPD-ի c_wfstate կամ «Հայտարարագիր չկա» (տույժերի ֆայլ, DEC-R4) */
const unitStatus = (u) => (u.decl ? lk('c_wfstate', u.decl.wfstateid) : 'Հայտարարագիր չկա (տույժ)');
const unitPosition = (u) => (u.decl ? { title: u.decl.position, org: lk('c_institution', u.decl.institution) } : { title: u.penalties?.[0]?.position || '—', org: 'ըստ տույժերի ֆայլի' });
const unitType = (u) => lk('c_declarationtype', u.decl ? u.decl.declarationtype : u.declarationType);
/** Կապված հայտարարագրեր (DEC-05). ընտանիքի անդամների առանձին հրապարակված հայտարարագրերը (parentdeclaration) */
/** + պաշտոնատար անձ հանդիսացող ընտանիքի անդամների հայտարարագրերը (official). ընտանիքի կազմով հաշվարկում ներառվում են */
const linkedInfo = (u) => {
  if (!u.decl || !(u.linked?.length || u.officials?.length)) return [];
  const fam = profileChildren('de_profilefamilymembers', u.decl.declarant);
  const rel = (l) => lk('c_familymembertype', fam.find((f) => liveProfileOf(byInstance('de_profile', f.profile))?.instanceid === l.originaldeclarant)?.type) || 'ընտանիքի անդամ';
  return [
    ...u.linked.map((l) => ({ decl: l, code: l.code, name: profileName(l.originaldeclarant), relation: rel(l), publishedon: l.publishedon, official: false })),
    ...(u.officials || []).map((o) => ({ decl: o.decl, code: o.decl.code, name: profileName(o.decl.originaldeclarant), relation: lk('c_familymembertype', o.type) || 'ընտանիքի անդամ', publishedon: o.decl.publishedon, official: true })),
  ];
};
const linkedText = (u) => linkedInfo(u).map((x) => `${x.code} (${x.name}, ${x.relation}${x.official ? ', պաշտոնատար անձ' : ''})`).join('; ');

/** «Պաշտոնը ստանձնելու» և «Պաշտոնը դադարեցնելու» հայտարարագրեր. վերլուծության մոտեցումը քննարկվում է */
export function DeclarationTypePage({ type }) {
  const { state } = useStore();
  const title = type === DECLARATION_TYPE.assumption ? 'Պաշտոնը ստանձնելու հայտարարագրեր' : 'Պաշտոնը դադարեցնելու հայտարարագրեր';
  const decls = current('de_declaration').filter((d) => d.declarationtype === type);
  const byState = Object.entries(decls.reduce((m, d) => ({ ...m, [d.wfstateid]: (m[d.wfstateid] || 0) + 1 }), {}));
  const penalties = (state.penalties?.records || []).filter((r) => r.declarationType === type);
  return (
    <>
      <PageHeader title={title} subtitle="Վերլուծության մոտեցումը քննարկվում է" />
      <InfoNote severity="info">
        Ներկայումս մոդուլը վերլուծում է միայն տարեկան հայտարարագրերը։ Սահմանված կանոնները (DEC-R1–DEC-R4) նախատեսված են տարեկան հայտարարագրի համար, ուստի այս տեսակի հայտարարագրերի վրա չեն կիրառվում։ Այս բաժնի կանոնները և գնահատման կարգը կսահմանվեն քննարկումից հետո։
      </InfoNote>
      <Section title="Տվյալներ EPD-ում">
        <KV items={[
          ['Հայտարարագրեր (ընթացիկ տարբերակ)', decls.length ? `${decls.length}` : 'Mock տվյալներում այս տեսակի հայտարարագրեր չկան'],
          byState.length > 0 && ['Ըստ կարգավիճակի', byState.map(([w, n]) => `${lk('c_wfstate', Number(w))}՝ ${n}`).join(', ')],
          ['Տույժերի գրառումներ այս տեսակի համար («Արտաքին ֆայլեր → Տույժեր»)', state.penalties ? `${penalties.length}` : 'Տույժերի տվյալները մուտքագրված չեն'],
        ]} />
      </Section>
      {penalties.length > 0 && (
        <Section title="Տույժերի ֆայլի գրառումներ">
          <SimpleTable dense rows={penalties.map((r) => ({ ...r, id: r.row }))} columns={[
            { key: 'row', label: 'Տող' },
            { key: 'viv', label: 'ՎԻՎ Ա', render: (r) => `${r.vivNumber || '—'} · ${fmtDate(r.vivDate)}` },
            { key: 'p', label: 'Անձ', render: (r) => `${[r.firstName, r.lastName].filter(Boolean).join(' ')}${r.ssn ? ` · ՀԾՀ ${r.ssn}` : ''}` },
            { key: 'y', label: 'Տարի', render: (r) => r.year ?? '—' },
            { key: 'b', label: 'ՎԻՎ հիմք', render: (r) => r.basis || '—' },
          ]} />
        </Section>
      )}
    </>
  );
}

export function DeclarationsList() {
  const { results, state, reevaluate } = useStore();
  const [confirmReeval, setConfirmReeval] = useState(false);
  const [notice, setNotice] = useState(null);
  const canReevaluate = can(state.role, 'correct') || can(state.role, 'edit_rules');
  // Տարին պարտադիր է. լռելյայն՝ ամենամեծ տարին, որի համար EPD-ում հայտարարագրեր կան
  const latestYear = () => Math.max(...results.declarations.filter((u) => u.decl).map((u) => u.year));
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, year: String(latestYear()) }));
  const units = results.declarations;
  const rules = results.rules.filter((r) => r.direction === 'declarations');
  const years = [...new Set(units.map((u) => u.year))].sort((a, b) => b - a);
  const rows = applyFilters(units, filters, {
    text: (u) => `${u.profile.firstname} ${u.profile.lastname} ${u.profile.ssn} ${u.code} ${linkedText(u)}`,
    year: (u) => u.year,
    risky: (u) => u.risky,
    flagged: (u) => unitFired(u).length > 0 || u.manual.length > 0,
    hasRule: (u, id) => unitRuleIds(u).includes(id),
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const threshold = units.find((u) => u.threshold != null)?.threshold;
  const maxPossible = rules.filter((r) => r.enabled).reduce((s, r) => s + (Number(r.weight) || 0), 0) + 25;

  return (
    <>
      <PageHeader
        title="Տարեկան հայտարարագրեր"
        subtitle={`Տարեկան հայտարարագրեր EPD-ից՝ բոլոր կարգավիճակներով (ընթացիկ տարբերակ, DEC-06). բովանդակային կանոններով գնահատվում են հրապարակված տարեկան հայտարարագրերը, մնացածը՝ միայն տույժերի կանոններով (DEC-R3, DEC-R4). համախառն միավորի շեմ՝ ${threshold ?? '—'} (DEC-04)`}
      />
      <UndefinedVarsBanner units={units} getResults={allScopeResults} />
      {threshold != null && maxPossible < threshold && (
        <InfoNote severity="info">
          Ներկա պահին իրականացված և միացված կանոնների քաշերի գումարը ձեռքով նշման հետ միասին {maxPossible} է, որը փոքր է {threshold} շեմից. ոչ մի հայտարարագիր չի կարող դառնալ «ռիսկային»։ Ստուգեք կանոնների քաշերը և միացված լինելը («Կանոններ» էջ)։
        </InfoNote>
      )}
      {!state.penalties && (
        <InfoNote severity="info">
          Տույժերի տվյալները մուտքագրված չեն, ուստի DEC-R3 և DEC-R4 կանոնները «չի գնահատվել» կարգավիճակում են։ Դրանք մուտքագրվում կամ ներմուծվում են <Link component="button" onClick={() => navigate('/files/penalties')} sx={{ verticalAlign: 'baseline' }}>«Արտաքին ֆայլեր → Տույժեր»</Link> էջում (COM-11)։
        </InfoNote>
      )}
      <FilterBar filters={filters} setFilters={setFilters} years={years} rules={[...rules, ...MANUAL_RULES]} requireYear extra={(
        <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto !important' }, flexShrink: 0 }}>
          {canReevaluate && <Button startIcon={<RefreshIcon />} variant="outlined" disabled={!rows.length} onClick={() => setConfirmReeval(true)}>Վերագնահատում</Button>}
          {can(state.role, 'export') && <Button startIcon={<FileDownloadOutlinedIcon />} variant="outlined" disabled={!rows.length} onClick={() => exportList(rows, state, filters)}>Արտահանել ցանկը</Button>}
        </Stack>
      )} />
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
      {rows.some((u) => u.stale) && (
        <InfoNote severity="warning">
          {rows.filter((u) => u.stale).length} հայտարարագրի պահված արդյունքը տարբերվում է ընթացիկ գնահատումից (կանոնները, փոփոխականները կամ արտաքին տվյալները փոխվել են գնահատումից հետո)։ Արդյունքը թարմացնելու համար սեղմեք «Վերագնահատում»։
        </InfoNote>
      )}
      <Section>
        <SimpleTable
          onRowClick={(u) => navigate(`/declarations/${u.id}`)}
          rows={rows}
          columns={[
            { key: 'p', label: 'Հայտարարատու', render: (u) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{u.profile.firstname} {u.profile.lastname}</Typography><Typography variant="caption" color="text.secondary">ՀԾՀ {u.profile.ssn}</Typography>{linkedInfo(u).map((x) => <Tooltip key={x.code} title={x.official ? `${x.name} (${x.relation}). պաշտոնատար անձ է, նրա հայտարարագիրը գնահատվում է առանձին և ներառվում է ընտանիքի կազմով հաշվարկում` : `Կապված հայտարարագիր՝ ${x.name} (${x.relation})`}><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>+ {x.code} · {x.relation}{x.official ? ' · պաշտոնատար անձ' : ''}</Typography></Tooltip>)}</> },
            { key: 'pos', label: 'Պաշտոն', render: (u) => { const pos = unitPosition(u); return <><Typography variant="body2">{pos.title}</Typography><Typography variant="caption" color="text.secondary">{pos.org}</Typography></>; } },
            { key: 'year', label: 'Տարի', render: (u) => <><Typography variant="body2">{u.year}</Typography>{unitType(u) !== 'Տարեկան' && <Typography variant="caption" color="text.secondary">{unitType(u)}</Typography>}</> },
            { key: 'st', label: 'Կարգավիճակ', render: (u) => (
              <>
                <Chip size="small" variant="outlined" color={u.statusOnly ? 'warning' : 'default'} label={unitStatus(u)} />
                {u.decl?.publishedon && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{fmtDate(u.decl.publishedon.slice(0, 10))}</Typography>}
              </>
            ) },
            { key: 'ind', label: 'Առանձին', align: 'center', render: (u) => <ScoreChip score={u.scopes[0].score} threshold={u.threshold} /> },
            { key: 'fam', label: 'Ընտանիքի կազմով', align: 'center', render: (u) => { const f = u.scopes?.find((s) => s.kind === 'family'); return f ? <ScoreChip score={f.score} threshold={u.threshold} /> : '—'; } },
            { key: 'rules', label: 'Աշխատած կանոններ', render: (u) => (<Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>{unitRuleIds(u).map((id) => <Chip key={id} size="small" color="error" variant="outlined" label={id} />)}{Object.keys(u.corrections || {}).length > 0 && <Chip size="small" color="info" variant="outlined" label="ճշգրտված" />}</Stack>) },
            { key: 'risk', label: 'Ռիսկային', render: (u) => (
              <>
                <RiskChip risky={u.risky} label={u.risky ? 'Այո' : 'Ոչ'} />
                {u.evaluation && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>գնահատվել է {new Date(u.evaluation.at).toLocaleDateString('hy-AM')}</Typography>}
                {u.stale && <Chip size="small" color="warning" variant="outlined" label="պահանջվում է վերագնահատում" sx={{ mt: 0.5 }} />}
              </>
            ) },
            { key: 'c', label: 'Եզրակացություն', render: (u) => <Typography variant="caption">{conclusionLabel(state, 'declarations', u.id)}</Typography> },
          ]}
        />
      </Section>
      <Dialog open={confirmReeval} onClose={() => setConfirmReeval(false)}>
        <DialogTitle>Վերագնահատում</DialogTitle>
        <DialogContent>
          <Typography>Համոզվա՞ծ եք, որ ցանկանում եք վերագնահատել աղյուսակում եղած հայտարարագրերը։</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Աղյուսակում՝ {rows.length} հայտարարագիր{rows.some((u) => u.stale) ? `, որից ${rows.filter((u) => u.stale).length}-ի արդյունքը կփոխվի` : ''}։ Կկիրառվեն ընթացիկ կանոնները, փոփոխականները և արտաքին տվյալները։
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReeval(false)}>Ոչ</Button>
          <Button variant="contained" onClick={() => {
            const changed = rows.filter((u) => u.stale).length;
            reevaluate(rows.map((u) => u.id));
            setConfirmReeval(false);
            setNotice(`Վերագնահատվել է ${rows.length} հայտարարագիր${changed ? `. արդյունքը փոխվել է ${changed}-ի համար` : '. արդյունքները չեն փոխվել'}։`);
          }}>Այո</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** Ցանկի արտահանում (.xlsx). արտահանվում են աղյուսակում ցուցադրվող տողերը՝ ըստ ֆիլտրերի և դասավորության */
function exportList(rows, state, filters) {
  const famScore = (u) => u.scopes?.find((s) => s.kind === 'family')?.score;
  const columns = [
    { header: 'Հայտարարագիր', width: 16 }, { header: 'Կապված հայտարարագրեր', width: 30, style: 'wrap' }, { header: 'Հայտարարատու', width: 24 }, { header: 'ՀԾՀ', width: 13, style: 'text' },
    { header: 'Պաշտոն', width: 30, style: 'wrap' }, { header: 'Հաստատություն', width: 30, style: 'wrap' }, { header: 'Տարի', width: 7 },
    { header: 'Կարգավիճակ', width: 22 }, { header: 'Ներկայացվել (հրապարակվել) է', width: 14 },
    { header: 'Միավոր՝ առանձին', width: 10 }, { header: 'Միավոր՝ ընտանիքի կազմով', width: 12 }, { header: 'Շեմ', width: 7 },
    { header: 'Աշխատած կանոններ', width: 24 }, { header: 'Ռիսկային', width: 12 }, { header: 'Եզրակացություն', width: 22 },
  ];
  const data = rows.map((u) => {
    const pos = unitPosition(u);
    return [
      u.code, linkedText(u), `${u.profile.firstname} ${u.profile.lastname}`, u.profile.ssn || '', pos.title, pos.org, u.year,
      unitStatus(u), u.decl?.publishedon ? fmtDate(u.decl.publishedon.slice(0, 10)) : '',
      u.scopes[0]?.score ?? '', famScore(u) ?? '', u.threshold ?? '',
      unitRuleIds(u).join(', '), u.risky ? 'Այո' : 'Ոչ', conclusionLabel(state, 'declarations', u.id),
    ];
  });
  const filterText = [`տարի ${filters.year}`, filters.q && `որոնում «${filters.q}»`, filters.risk && { risky: 'ռիսկային', flagged: 'առնվազն մեկ նշում', clean: 'առանց նշման' }[filters.risk], filters.rule && `կանոն ${filters.rule}`].filter(Boolean).join(', ');
  downloadXlsx(`tarekan-haytararagrer-${filters.year}-${new Date().toISOString().slice(0, 10)}.xlsx`, buildXlsx([
    { name: 'Հայտարարագրեր', freezeHeader: true, columns, rows: data },
    { name: 'Ֆիլտրեր', columns: [{ header: 'Պարամետր', width: 22 }, { header: 'Արժեք', width: 60, style: 'wrap' }], rows: [['Ֆիլտրեր', filterText], ['Տողեր', rows.length], ['Արտահանվել է', new Date().toLocaleString('hy-AM')]] },
  ]));
}

const DETAIL_TABS = ['risk', 'expense', 'multiyear', 'data'];
export function DeclarationDetail({ id, tab: tabName }) {
  const { results } = useStore();
  const [tab, setTab] = useState(Math.max(0, DETAIL_TABS.indexOf(tabName)));
  const u = results.declarations.find((x) => String(x.id) === String(id));
  if (!u) return <Typography>Հայտարարագիրը չի գտնվել</Typography>;
  const rules = [...results.rules, ...MANUAL_RULES];
  const d = u.decl;
  if (u.statusOnly) return <StatusUnitDetail u={u} rules={rules} />;
  return (
    <>
      <PageHeader
        back={{ to: '/declarations', label: 'Տարեկան հայտարարագրեր' }}
        title={`${u.profile.firstname} ${u.profile.lastname} — ${lk('c_declarationtype', d.declarationtype)} հայտարարագիր ${d.year}`}
        subtitle={`${d.position}, ${lk('c_institution', d.institution)} · ${d.code} (instanceid ${d.instanceid}) · ${lk('c_wfstate', d.wfstateid)}${d.publishedon ? ` · ներկայացվել (հրապարակվել) է ${fmtDate(d.publishedon.slice(0, 10))}` : ''}`}
        actions={<RiskChip risky={u.risky} label={u.risky ? 'Ռիսկային' : 'Ռիսկային չէ'} />}
      />
      {linkedInfo(u).length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: -1.5, mb: 2, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Կապված հայտարարագրեր՝</Typography>
          {linkedInfo(u).map((x) => {
            const label = `${x.code} · ${x.name} (${x.relation}${x.official ? ', պաշտոնատար անձ' : ''})${x.publishedon ? ` · հրապարակվել է ${fmtDate(x.publishedon.slice(0, 10))}` : ''}`;
            return x.official
              ? <Tooltip key={x.code} title="Պաշտոնատար անձ է. նրա հայտարարագիրը գնահատվում է առանձին (բացել), իսկ նրա տվյալները ներառվում են ընտանիքի կազմով հաշվարկում"><Chip size="small" variant="outlined" color="primary" clickable onClick={() => navigate(`/declarations/${x.decl.instanceid}`)} label={label} /></Tooltip>
              : <Chip key={x.code} size="small" variant="outlined" label={label} />;
          })}
        </Stack>
      )}
      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Ռիսկային նշումներ" />
            <Tab label="Ընթացիկ ծախսի հաշվարկ" />
            <Tab label="Ամփոփում՝ ըստ տարիների" />
            <Tab label={`Հայտարարագրի ճշգրտումներ${Object.keys(u.corrections).length ? ` (${Object.keys(u.corrections).length})` : ''}`} />
          </Tabs>
          {tab === 0 && <RiskTab u={u} rules={rules} />}
          {tab === 1 && <ExpenseTab u={u} />}
          {tab === 2 && <MultiYearTab u={u} />}
          {tab === 3 && <DataTab u={u} />}
    </>
  );
}

/** Չհրապարակված կամ EPD-ում բացակայող հայտարարագիր. գնահատվում է միայն տույժերի կանոններով (DEC-R3, DEC-R4) */
function StatusUnitDetail({ u, rules }) {
  const d = u.decl;
  const name = `${u.profile.firstname} ${u.profile.lastname}`;
  return (
    <>
      <PageHeader
        back={{ to: '/declarations', label: 'Տարեկան հայտարարագրեր' }}
        title={`${name} — ${unitType(u)} հայտարարագիր ${u.year}`}
        subtitle={d
          ? `${d.position || ''}${d.institution ? `, ${lk('c_institution', d.institution)}` : ''} · ${d.code} (instanceid ${d.instanceid}) · ${unitStatus(u)}`
          : `ՀԾՀ ${u.profile.ssn} · ${unitStatus(u)}`}
        actions={<RiskChip risky={u.risky} label={u.risky ? 'Ռիսկային' : 'Ռիսկային չէ'} />}
      />
      <InfoNote severity="warning">
        {d
          ? `Հայտարարագիրը ներկայացված (հրապարակված) չէ. կարգավիճակ՝ «${unitStatus(u)}»։ Բովանդակային կանոններով այն չի գնահատվում, գնահատվում է միայն տույժերի կանոններով (DEC-R4)։`
          : 'EPD-ում այս անձի այս տարվա և տեսակի հայտարարագիր չկա ոչ մի կարգավիճակով. տողը ստեղծվել է տույժերի ֆայլի հիման վրա (DEC-R4)։'}
      </InfoNote>
      <RiskTab u={u} rules={rules} />
    </>
  );
}

function EvaluationNote({ u }) {
  const { state, reevaluate } = useStore();
  const allowed = can(state.role, 'correct') || can(state.role, 'edit_rules');
  if (!u.evaluation) return null;
  const when = `Գնահատվել է ${new Date(u.evaluation.at).toLocaleString('hy-AM')}${u.evaluation.by ? ` · ${u.evaluation.by}` : ''}`;
  return u.stale
    ? <Alert severity="warning" sx={{ mb: 2 }} action={allowed && <Button color="inherit" size="small" onClick={() => reevaluate([u.id])}>Վերագնահատել</Button>}>{when}։ Պահված արդյունքը տարբերվում է ընթացիկ գնահատումից (կանոնները, փոփոխականները կամ արտաքին տվյալները փոխվել են)։</Alert>
    : <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{when}</Typography>;
}

/** Ձեռքով նշման (DEC-R7) տարբերակներ. հայտարարատուի առանձին հաշվարկ և (եթե կա) ընտանիքի ընդհանուր կազմ */
const manualScopeOptions = (u) => [
  { value: 'individual', label: u.scopes[0].label },
  ...(u.scopes.some((s) => s.kind === 'family') ? [{ value: 'family', label: u.scopes.find((s) => s.kind === 'family').label }] : []),
];
/** Հաշվարկի արդյունքներ + DEC-R7 (եթե այդ հաշվարկին ձեռքով նշման քաշ է գումարվել) */
const withManual = (s, u) => {
  if (!s.manualWeight) return s.results;
  const fam = u.scopes.some((x) => x.kind === 'family');
  const mine = (u.manual || []).filter((m) => (s.kind === 'family' ? m.scope === 'family' : m.scope !== 'family' || !fam));
  return { ...s.results, 'DEC-R7': { ruleId: 'DEC-R7', status: 'fired', weight: s.manualWeight, explanation: `Մասնագետի հիմնավորում՝ ${mine.map((m) => m.note).join('; ')}` } };
};

function RiskTab({ u, rules }) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <EvaluationNote u={u} />
        {!u.statusOnly && <InfoNote>
          DEC-04. հաշվարկը կատարվում է երկու եղանակով՝ յուրաքանչյուր առանձին հայտարարագրողի համար և ընտանիքի ընդհանուր կազմով։ Հայտարարագիրը ռիսկային է, եթե որևէ հաշվարկում համախառն միավորը ≥ {u.threshold}։
          {' '}Ձեռքով ռիսկային նշման (DEC-R7) քաշը գումարվում է միայն ընտրված հաշվարկին՝ հայտարարատուի առանձին կամ ընտանիքի ընդհանուր կազմով։
        </InfoNote>}
        {u.scopes.map((s) => (
          <Section key={s.key} title={s.label} actions={<ScoreChip score={s.score} threshold={u.threshold} />}>
            <RuleResults results={withManual(s, u)} rules={rules} showWeight />
          </Section>
        ))}
        {u.original && <BeforeAfter u={u} />}
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <ManualFlagBox direction="declarations" unitId={u.id} refDate={`${u.year}-12-31`} scopes={manualScopeOptions(u)} />
        <ConclusionBox direction="declarations" unitId={u.id} />
      </Grid>
    </Grid>
  );
}

function BeforeAfter({ u }) {
  return (
    <Section title="Ճշգրտումից առաջ և հետո (DEC-10)">
      <SimpleTable dense rows={u.scopes.map((s, i) => ({ id: s.key, s, o: u.original.scopes[i] }))} columns={[
        { key: 'l', label: 'Հաշվարկ', render: (r) => r.s.label },
        { key: 'm0', label: 'ՄԱԾ առաջ', align: 'right', render: (r) => fmtAmd(r.o.exp.monthly) },
        { key: 'm1', label: 'ՄԱԾ հետո', align: 'right', render: (r) => fmtAmd(r.s.exp.monthly) },
        { key: 'f0', label: 'Կանոններ առաջ', render: (r) => firedIds(r.o.results).join(', ') || '—' },
        { key: 'f1', label: 'Կանոններ հետո', render: (r) => firedIds(r.s.results).join(', ') || '—' },
        { key: 's', label: 'Միավոր առաջ → հետո', align: 'center', render: (r) => `${r.o.score} → ${r.s.score}` },
      ]} />
    </Section>
  );
}

function ExpenseTab({ u }) {
  const { state } = useStore();
  const f = effectiveFormulas(state);
  const changed = Object.keys(DEFAULT_FORMULAS).filter((k) => f[k] !== DEFAULT_FORMULAS[k]);
  const keys = ['Ds', 'E', 'G', 'Dv', 'Ps', 'Pv', ...(changed.length ? [] : ['C']), 'annual', 'monthly'];
  return (
    <>
      <InfoNote severity={changed.length ? 'warning' : 'info'}>
        {changed.length
          ? <>Բանաձևը փոխված է մասնագետի կողմից («Փոփոխականներ → Բարդ փոփոխականներ»)՝ ԸՏԾ = {readableFormula(f.expense_annual)}; ՄԱԾ = {readableFormula(f.expense_monthly)}։ </>
          : 'Բանաձևը (SRS 4.1). Ծ = Դս + Ե − Գ − Դվ;  ԸՏԾ = Ծ + (Փվ − Փս);  ՄԱԾ = ԸՏԾ / 12։ '}
        Ներառվում են միայն հաստատված տողերը (DEC-06), արտարժույթը փոխարկվում է տողի հետ պահված փոխարժեքով (DEC-11)։
        Փ-ի նշանի և «Ե»-ի կազմի վերաբերյալ տես հարցերի ցանկը (docs/QUESTIONS.md)։
      </InfoNote>
      <Section>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Բաղադրիչ</TableCell>{u.scopes.map((s) => <TableCell key={s.key} align="right">{s.label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k} sx={['C', 'annual', 'monthly'].includes(k) ? { '& td': { fontWeight: 600 } } : undefined}>
                  <TableCell>{EXPENSE_LABELS[k]}</TableCell>
                  {u.scopes.map((s) => <TableCell key={s.key} align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: s.exp[k] < 0 ? 'error.main' : undefined }}>{fmtAmd(s.exp[k])}</TableCell>)}
                </TableRow>
              ))}
              <TableRow><TableCell>Անձանց թիվ</TableCell>{u.scopes.map((s) => <TableCell key={s.key} align="right">{s.persons}</TableCell>)}</TableRow>
              <TableRow><TableCell sx={{ color: 'text.secondary' }}>Տեղեկատվական. հայտարարագրված ծախսեր (բանաձևում չեն մասնակցում)</TableCell>{u.scopes.map((s) => <TableCell key={s.key} align="right" sx={{ color: 'text.secondary' }}>{fmtAmd(s.exp.declaredExpenses)}</TableCell>)}</TableRow>
              <TableRow><TableCell sx={{ color: 'text.secondary' }}>Տեղեկատվական. օտարված գույքի գումար (եկամուտների մեջ պետք է լինի հայտարարագրված)</TableCell>{u.scopes.map((s) => <TableCell key={s.key} align="right" sx={{ color: 'text.secondary' }}>{fmtAmd(s.exp.alienations)}</TableCell>)}</TableRow>
            </TableBody>
          </Table>
        </Box>
      </Section>
    </>
  );
}

function MultiYearTab({ u }) {
  const { state } = useStore();
  const pid = u.decl.originaldeclarant;
  const roots = declarationsOfPerson(pid, { publishedOnly: true }).filter((d) => d.declaranttype !== 2).sort((a, b) => a.year - b.year);
  const calc = (family) => roots.map((d) => {
    const fc = family ? familyComposition(d) : null;
    const e = computeExpense(fc ? fc.decls : [d], fc ? fc.filter : (r) => r.familymembertype === null, state.corrections, effectiveFormulas(state));
    return { id: d.instanceid, year: d.year, e };
  });
  const hasFamily = profileChildren('de_profilefamilymembers', u.decl.declarant).length > 0;
  const Tbl = ({ rows }) => (
    <SimpleTable dense rows={rows} columns={[
      { key: 'year', label: 'Տարի' },
      { key: 'ds', label: 'Դս (տարեսկիզբ)', align: 'right', render: (r) => fmtAmd(r.e.Ds) },
      { key: 'dv', label: 'Դվ (տարեվերջ)', align: 'right', render: (r) => fmtAmd(r.e.Dv) },
      { key: 'ps', label: 'Փս', align: 'right', render: (r) => fmtAmd(r.e.Ps) },
      { key: 'pv', label: 'Փվ', align: 'right', render: (r) => fmtAmd(r.e.Pv) },
      { key: 'e', label: 'Եկամուտ', align: 'right', render: (r) => fmtAmd(r.e.E) },
      { key: 'a', label: 'ԸՏԾ (ծախս)', align: 'right', render: (r) => <Box component="span" sx={{ color: r.e.annual < 0 ? 'error.main' : undefined }}>{fmtAmd(r.e.annual)}</Box> },
      { key: 'm', label: 'ՄԱԾ', align: 'right', render: (r) => fmtAmd(r.e.monthly) },
      { key: 's', label: <Tooltip title="«Խնայողության» բանաձևը SRS-ում սահմանված չէ"><span>Խնայողություն*</span></Tooltip>, align: 'right', render: () => '—' },
    ]} />
  );
  const ind = calc(false);
  const fam = hasFamily ? calc(true) : null;
  const avg = (rows) => fmtAmd(rows.reduce((s, r) => s + r.e.annual, 0) / (rows.length || 1));
  return (
    <>
      <Section title={`${profileName(pid)} — առանձին`} actions={<Chip size="small" label={`Միջին տարեկան ծախս՝ ${avg(ind)}`} />}><Tbl rows={ind} /></Section>
      {fam && <Section title="Ընտանիքի ընդհանուր կազմ" actions={<Chip size="small" label={`Միջին տարեկան ծախս՝ ${avg(fam)}`} />}><Tbl rows={fam} /></Section>}
      <Typography variant="caption" color="text.secondary">* DEC-09-ը պահանջում է ցույց տալ «խնայողությունը», սակայն դրա բանաձևը SRS-ում տրված չէ. սյունը թողնված է դատարկ (տես հարցերի ցանկը)։</Typography>
    </>
  );
}

// ───────── տվյալներ և ճշգրտումներ (DEC-07, DEC-10). սյուները՝ EPD-ի իրական անուններով
const money = (f, label, editable = true) => ({ f, label, money: true, editable });
const L = (f, label, table) => ({ f, label, lookup: table });
const SECTIONS = [
  { table: 'de_financialmeanscash', title: 'Կանխիկ դրամ', cols: [L('tabtype', 'Ցանկ', 'c_cashdetailstype'), money('amountatbeginningofyear', 'Տարեսկզբին'), money('amountatendofyear', 'Տարեվերջին'), L('sourceoforiginatendofyear', 'Ծագման աղբյուր', 'c_sourceoforigin')] },
  { table: 'de_financialmeansbankaccountbalances', title: 'Բանկային հաշիվների մնացորդներ', cols: [{ f: 'bankname', label: 'Բանկ' }, money('amountatbeginningofyear', 'Տարեսկզբին'), money('amountatendofyear', 'Տարեվերջին')] },
  { table: 'de_financialmeanselectronicaccountsandcryptocurrencies', title: 'Էլեկտրոնային հաշիվներ և կրիպտոարժույթ', cols: [money('amountatbeginningofyear', 'Տարեսկզբին'), money('amountatendofyear', 'Տարեվերջին')] },
  { table: 'de_loansanddepositsloandetails', title: 'Փոխառություններ (հանձնված և վերադարձված)', cols: [{ f: 'debtorname', label: 'Պարտապան' }, money('amountatbeginningofyear', 'Տարեսկզբին'), money('amountatendofyear', 'Տարեվերջին')] },
  { table: 'de_loansanddepositsdepositdetails', title: 'Բանկային ավանդներ', cols: [{ f: 'bankname', label: 'Բանկ' }, money('amountatbeginningofyear', 'Տարեսկզբին'), money('amountatendofyear', 'Տարեվերջին')] },
  { table: 'de_revenuesincomes', title: 'Եկամուտներ', cols: [L('incometype', 'Եկամտի տեսակ', 'c_incometype'), { f: 'incomepayerfullname', label: 'Վճարող' }, money('amount', 'Գումար')] },
  { table: 'de_revenuesremainingprincipals', title: 'Ստացված վարկերի և փոխառությունների մայր գումարի մնացորդ (բանաձևում չի մասնակցում)', cols: [L('type', 'Տեսակ', 'c_revenuesremainingprincipalstype'), { f: 'lenderfullname', label: 'Վարկատու' }, money('creditprincipalbalance', 'Վարկի մնացորդ', false), money('loanbalance', 'Փոխառության մնացորդ', false), L('hasmortgage', 'Հիփոթեք', 'c_yesno'), { f: 'mortgageaddress', label: 'Հիփոթեքի առարկա' }] },
  { table: 'de_realestatedetails', title: 'Անշարժ գույք', cols: [L('tabtype', 'Ցանկ', 'c_realestatedetailstype'), L('realestatetype', 'Տեսակ', 'c_realestatetype'), { f: 'area', label: 'Մակերես' }, { f: 'code', label: 'Ծածկագիր' }, { f: 'dealdate', label: 'Գործարքի օր', date: true }, money('dealamount', 'Գործարքի գումար')] },
  { table: 'de_vehicledetails', title: 'Տրանսպորտային միջոցներ', cols: [L('tabtype', 'Ցանկ', 'c_vehicledetailstype'), { f: 'vehiclemakestring', label: 'Մակնիշ' }, { f: 'vehiclemodelstring', label: 'Մոդել' }, { f: 'releaseyear', label: 'Թող. տարի' }, { f: 'dealdate', label: 'Գործարքի օր', date: true }, money('dealamount', 'Գործարքի գումար')] },
  { table: 'de_expensesdetails', title: 'Ծախսեր (բանաձևում չեն մասնակցում)', cols: [L('expensetype', 'Տեսակ', 'c_expensetype'), { f: 'expensesummary', label: 'Նկարագրություն' }, money('amount', 'Գումար', false)] },
  { table: 'de_contractsupon5mlndetails', title: 'Հինգ միլիոն դրամը գերազանցող պայմանագրեր', cols: [{ f: 'counterpartname', label: 'Պայմանագրի կողմ' }, { f: 'contractsubject', label: 'Առարկա' }, { f: 'contracttype', label: 'Տեսակ' }, { f: 'cost', label: 'Արժեք (cost)', num: true }, { f: 'contractsigndate', label: 'Կնքման օր', date: true }] },
];

function DataTab({ u }) {
  const { state, update, reevaluate } = useStore();
  const canReevaluate = can(state.role, 'correct') || can(state.role, 'edit_rules');
  const [edit, setEdit] = useState(null);
  const decls = [u.decl, ...u.linked];
  const allowed = can(state.role, 'correct');
  const fam = profileChildren('de_profilefamilymembers', u.decl.declarant);
  const owner = (r) => `${profileName(r.profile)}${r.familymembertype ? ` (${lk('c_familymembertype', r.familymembertype)})` : ''}`;
  const versions = versionsOf('de_declaration', u.decl.instanceid);

  const cell = (r, c) => {
    const corr = state.corrections[r.entityid];
    if (c.money) {
      const key = `${c.f}_amount`;
      const orig = r[key];
      if (orig === null || orig === undefined) return '—';
      const isCorr = corr && key in corr;
      const val = isCorr ? corr[key] : orig;
      const rate = r[`${c.f}_ratetodefault`];
      const cur = CURRENCY_CODE[r[`${c.f}_currencyid`]] || '';
      return (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          <Box sx={{ textAlign: 'right' }}>
            {isCorr && <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', display: 'block' }}>{fmtNum(orig)} {cur}</Typography>}
            <Typography variant="body2" sx={{ color: isCorr ? 'info.main' : undefined, fontWeight: isCorr ? 600 : undefined }}>{fmtNum(val)} {cur}</Typography>
            {cur !== 'AMD' && <Typography variant="caption" color="text.secondary">× {rate} ({fmtDate(r[`${c.f}_timestamp`]?.slice(0, 10))}) = {fmtAmd(val * rate)}</Typography>}
          </Box>
          {allowed && c.editable && r.status !== 2 && <Tooltip title="Ճշգրտել (DEC-10)"><IconButton size="small" onClick={() => setEdit({ r, c, key, value: val, table: r._table, declInstance: r._decl.instanceid })}><EditOutlinedIcon fontSize="inherit" /></IconButton></Tooltip>}
        </Stack>
      );
    }
    const raw = r[c.f];
    if (c.date) return fmtDate(raw);
    if (c.num) return fmtNum(raw);
    if (c.lookup) {
      const label = lk(c.lookup, raw);
      if (!label) return '—';
      return label.length > 40 ? <Tooltip title={label}><span>{label.slice(0, 38)}…</span></Tooltip> : label;
    }
    return raw ?? '—';
  };

  const save = (value) => {
    const { r, key } = edit;
    update((s) => {
      const cur = { ...(s.corrections[r.entityid] || { _declaration: edit.declInstance, _table: edit.table }) };
      if (Number(value) === Number(r[key])) delete cur[key]; else cur[key] = Number(value);
      const has = Object.keys(cur).some((k) => !k.startsWith('_'));
      const next = { ...s.corrections };
      if (has) next[r.entityid] = { ...cur, _by: s.role, _at: new Date().toISOString() }; else delete next[r.entityid];
      return { corrections: next };
    });
    setEdit(null);
  };

  return (
    <>
      <InfoNote>
        DEC-07. տվյալները կարդացվում են EPD-ից (միայն կարդալու, NFR-04)՝ ընթացիկ տարբերակով (de_declarationpublisheditem), բաժիններով և մանրամասն տողերով։ Սյուների անունները՝ ինչպես EPD-ում։
        DEC-10. տեխնիկական վրիպման դեպքում մասնագետը կարող է ճշգրտել գումարը. ճշգրտված արժեքը պահվում է մոդուլում, EPD-ի սկզբնական արժեքը պահպանվում է։ Ճշգրտումներից հետո սեղմեք «Վերագնահատել»՝ հայտարարագրի արդյունքը թարմացնելու համար։ Մերժված տողերը (status = 2) վերլուծության մեջ չեն ներառվում (DEC-06)։
      </InfoNote>
      {canReevaluate && (
        <Alert
          severity={u.stale ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" startIcon={<RefreshIcon />} disabled={!u.stale} onClick={() => reevaluate([u.id])}>Վերագնահատել</Button>}
        >
          {u.stale
            ? 'Տվյալները (ճշգրտումները) կամ կանոնները փոխվել են վերջին գնահատումից հետո։ Սեղմեք «Վերագնահատել»՝ այս հայտարարագիրը փոփոխություններով վերագնահատելու համար։'
            : `Հայտարարագրի արդյունքը թարմ է${u.evaluation ? ` (գնահատվել է ${new Date(u.evaluation.at).toLocaleString('hy-AM')})` : ''}։`}
        </Alert>
      )}
      <Section title="Ընդհանուր տվյալներ">
        <KV items={[
          ['Հայտարարատու', `${u.profile.fullname} (ՀԾՀ ${u.profile.ssn})`],
          ['Պաշտոն', `${u.decl.position}, ${lk('c_institution', u.decl.institution)} (պաշտոնի տեսակ՝ ${lk('c_positiontype', u.decl.positiontype) || '—'})`],
          ['Պաշտոնը ստանձնել է', fmtDate(u.decl.positionassumptiondate)],
          ['Ընտանիքի անդամներ (de_profilefamilymembers)', fam.map((f) => {
            const live = liveProfileOf(byInstance('de_profile', f.profile));
            const own = u.linked.find((l) => l.originaldeclarant === live?.instanceid);
            const off = (u.officials || []).find((o) => o.memberProfile === f.profile);
            return `${profileName(f.profile)} (${lk('c_familymembertype', f.type)}${own ? `, առանձին հայտարարագիր ${own.code}` : off ? `, պաշտոնատար անձ, իր հայտարարագիրը՝ ${off.decl.code}` : ', տողերը պաշտոնյայի հայտարարագրում'})`;
          }).join('; ') || '—'],
          ['Մերձավոր ազգականներ (de_profilerelatives)', profileChildren('de_profilerelatives', u.decl.declarant).map((r) => `${r.firstname} ${r.lastname} (${lk('c_relativetype', r.relativetype)})`).join('; ') || '—'],
          ['Կուսակցական անդամակցություն', detailRows(u.decl, 'de_membershipinpartiesdetails').map((r) => `${r.partyname} (${r.statusinparty})`).join('; ') || (sectionOf('de_membershipinparties', u.decl) ? 'Չկա' : '—')],
          ['Տարբերակներ', versions.map((v) => `entityid ${v.entityid}${v === u.decl ? ' (ընթացիկ)' : ' — ոչ ընթացիկ, չի վերլուծվում'}`).join('; ')],
        ]} />
      </Section>
      {SECTIONS.map((sec) => {
        const rows = decls.flatMap((d) => detailRows(d, sec.table, { includeRejected: true }).map((r) => ({ ...r, _decl: d, _table: sec.table })));
        if (!rows.length) return null;
        return (
          <Section key={sec.table} title={sec.title} actions={<Typography variant="caption" color="text.secondary">{sec.table}</Typography>}>
            <SimpleTable dense rows={rows.map((r) => ({ ...r, id: r.entityid }))} columns={[
              ...(u.linked.length ? [{ key: 'decl', label: 'Հայտարարագիր', render: (r) => <Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontWeight: r._decl === u.decl ? undefined : 600 }}>{r._decl.code}</Typography> }] : []),
              { key: 'owner', label: 'Անձ (profile)', render: owner },
              ...sec.cols.map((c) => ({ key: c.f, label: c.label, align: c.money || c.num ? 'right' : undefined, render: (r) => cell(r, c) })),
              { key: 'df', label: 'Լրացում', render: (r) => <Typography variant="caption">{lk('c_datafillingoption', r.datafillingoption) || '—'}</Typography> },
              { key: 'st', label: 'Կարգավիճակ', render: (r) => (r.status ? <Chip size="small" variant="outlined" color={r.status === 2 ? 'error' : 'default'} label={lk('c_integrationstatus', r.status)} /> : '—') },
            ]} />
          </Section>
        );
      })}
      <CorrectionDialog edit={edit} onClose={() => setEdit(null)} onSave={save} onRevert={() => save(edit.r[edit.key])} />
    </>
  );
}

function CorrectionDialog({ edit, onClose, onSave, onRevert }) {
  const [val, setVal] = useState('');
  const key = edit ? `${edit.r.entityid}|${edit.key}` : '';
  const [lastKey, setLastKey] = useState('');
  if (edit && key !== lastKey) { setLastKey(key); setVal(String(edit.value)); }
  if (!edit) return null;
  const cur = CURRENCY_CODE[edit.r[`${edit.c.f}_currencyid`]] || '';
  const isCorrected = Number(edit.value) !== Number(edit.r[edit.key]);
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Ճշգրտում (DEC-10)
        <IconButton aria-label="Փակել" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>{edit.r._decl?.code} · {edit.key} · entityid {edit.r.entityid}<br />EPD-ի սկզբնական արժեք՝ <b>{fmtNum(edit.r[edit.key])} {cur}</b></Typography>
        <TextField autoFocus type="number" label={`Ճշգրտված արժեք (${cur})`} value={val} onChange={(e) => setVal(e.target.value)} fullWidth />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Պահպանելուց հետո հայտարարագիրը վերագնահատեք «Վերագնահատել» կոճակով։</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Button variant="outlined" startIcon={<UndoIcon />} onClick={onRevert} disabled={!isCorrected} sx={{ flex: 1, whiteSpace: 'nowrap' }}>Վերադարձնել սկզբնականը</Button>
        <Button variant="outlined" startIcon={<SaveOutlinedIcon />} onClick={() => onSave(val)} disabled={val === '' || Number.isNaN(Number(val))} sx={{ flex: 1, whiteSpace: 'nowrap' }}>Պահպանել</Button>
      </DialogActions>
    </Dialog>
  );
}
