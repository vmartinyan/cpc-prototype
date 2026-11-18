import { useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Stack, Tab, Tabs, TextField, Tooltip, Typography, Alert,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { useStore, can } from '../engine/store.js';
import { current, detailRows, sectionOf, profileChildren, profileName, byInstance, versionsOf, liveProfileOf } from '../data/epd/repository.js';
import { lk, WF } from '../data/epd/classifiers.js';
import { CURRENCY_CODE } from '../data/epd/exchangeRates.js';
import { declarationsOfPerson } from '../engine/evaluator.js';
import { computeExpense, EXPENSE_LABELS } from '../engine/annualExpense.js';
import { PageHeader, Section, RuleResults, ScoreChip, RiskChip, SimpleTable, FilterBar, EMPTY_FILTERS, KV, fmtAmd, fmtDate, navigate, InfoNote, fmtNum } from '../components/common.jsx';
import { ConclusionBox, ManualFlagBox, UndefinedVarsBanner, conclusionLabel } from '../components/casework.jsx';
import { applyFilters, firedIds, downloadCsv } from './filters.js';
import { MANUAL_RULES } from '../rules/catalog.js';

const allScopeResults = (u) => (u.scopes || []).flatMap((s) => Object.values(s.results || {}));
const unitFired = (u) => [...new Set((u.scopes || []).flatMap((s) => firedIds(s.results)))];

export function DeclarationsList() {
  const { results, state } = useStore();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [exportOpen, setExportOpen] = useState(false);
  const units = results.declarations;
  const rules = results.rules.filter((r) => r.direction === 'declarations');
  const years = [...new Set(units.map((u) => u.year))].sort();
  const rows = applyFilters(units, filters, {
    text: (u) => `${u.profile.firstname} ${u.profile.lastname} ${u.profile.ssn} ${u.code}`,
    year: (u) => u.year,
    risky: (u) => u.risky,
    flagged: (u) => unitFired(u).length > 0 || u.manual.length > 0,
    hasRule: (u, id) => unitFired(u).includes(id),
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const threshold = units.find((u) => u.threshold != null)?.threshold;
  const maxPossible = rules.filter((r) => r.enabled).reduce((s, r) => s + (Number(r.weight) || 0), 0) + 25;

  return (
    <>
      <PageHeader
        title="Հայտարարագրեր"
        subtitle={`Տարեկան հայտարարագրեր (ընթացիկ տարբերակ, DEC-06). համախառն միավորի շեմ՝ ${threshold ?? '—'} (DEC-04). հաշվարկը՝ առանձին և ընտանիքի կազմով`}
        actions={can(state.role, 'export') && <Button startIcon={<FileDownloadOutlinedIcon />} variant="outlined" onClick={() => setExportOpen(true)}>Արտահանել վերլուծության ցանկը (DEC-03)</Button>}
      />
      <UndefinedVarsBanner units={units} getResults={allScopeResults} />
      {threshold != null && maxPossible < threshold && (
        <InfoNote severity="info">
          Ներկա պահին իրականացված և միացված կանոնների քաշերի գումարը ձեռքով նշման հետ միասին {maxPossible} է, որը փոքր է {threshold} շեմից. ոչ մի հայտարարագիր չի կարող դառնալ «վերլուծության ենթակա»։ Պատճառը՝ 7 չափորոշիչներից 5-ը չեն իրականացված (տես «Կանոնների ամփոփում»)։
        </InfoNote>
      )}
      <FilterBar filters={filters} setFilters={setFilters} years={years} rules={[...rules, ...MANUAL_RULES]} />
      <Section>
        <SimpleTable
          onRowClick={(u) => navigate(`/declarations/${u.id}`)}
          rows={rows}
          columns={[
            { key: 'p', label: 'Հայտարարատու', render: (u) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{u.profile.firstname} {u.profile.lastname}</Typography><Typography variant="caption" color="text.secondary">ՀԾՀ {u.profile.ssn}</Typography></> },
            { key: 'pos', label: 'Պաշտոն', render: (u) => <><Typography variant="body2">{u.decl.position}</Typography><Typography variant="caption" color="text.secondary">{lk('c_institution', u.decl.institution)}</Typography></> },
            { key: 'year', label: 'Տարի' },
            { key: 'st', label: 'Կարգավիճակ', render: (u) => <Chip size="small" variant="outlined" label={lk('c_wfstate', u.decl.wfstateid)} color={u.draft ? 'warning' : 'default'} /> },
            { key: 'ind', label: 'Առանձին', align: 'center', render: (u) => (u.draft ? '—' : <ScoreChip score={u.scopes[0].score} threshold={u.threshold} />) },
            { key: 'fam', label: 'Ընտանիքի կազմով', align: 'center', render: (u) => { const f = u.scopes?.find((s) => s.kind === 'family'); return f ? <ScoreChip score={f.score} threshold={u.threshold} /> : '—'; } },
            { key: 'rules', label: 'Աշխատած կանոններ', render: (u) => (u.draft ? <Typography variant="caption" color="text.secondary">Սևագիր — չի գնահատվում</Typography> : <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>{unitFired(u).map((id) => <Chip key={id} size="small" color="error" variant="outlined" label={id} />)}{u.manual.length > 0 && <Chip size="small" color="secondary" variant="outlined" label="ձեռքով" />}{Object.keys(u.corrections || {}).length > 0 && <Chip size="small" color="info" variant="outlined" label="ճշգրտված" />}</Stack>) },
            { key: 'risk', label: 'Վերլուծության ենթակա', render: (u) => (u.draft ? '—' : <RiskChip risky={u.risky} label={u.risky ? 'Այո' : 'Ոչ'} />) },
            { key: 'c', label: 'Եզրակացություն', render: (u) => <Typography variant="caption">{conclusionLabel(state, 'declarations', u.id)}</Typography> },
          ]}
        />
      </Section>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} units={units.filter((u) => u.risky)} />
    </>
  );
}

/** DEC-03. օգտատերը նշում է տողերի քանակը, ընտրվում է այդքան պատահական տող */
function ExportDialog({ open, onClose, units }) {
  const [n, setN] = useState(10);
  const doExport = () => {
    const pool = [...units];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const pick = pool.slice(0, n);
    downloadCsv(`hayt-verlucutyan-cank-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Հայտարարագիր', 'Հայտարարատու', 'ՀԾՀ', 'Պաշտոն', 'Տարի', 'Համախառն միավոր (առավելագույն)', 'Աշխատած կանոններ'],
      pick.map((u) => [u.code, `${u.profile.firstname} ${u.profile.lastname}`, u.profile.ssn, u.decl.position, u.year, u.score, unitFired(u).join(' ')]));
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Վերլուծության ենթակա հայտարարագրերի ցանկի արտահանում</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>Ցանկում՝ {units.length} հայտարարագիր (համախառն միավորը ≥ շեմ)։ Նշեք տողերի քանակը. կընտրվեն պատահական տողեր և կարտահանվեն CSV ֆայլով՝ ԿԿՀ-ի հաստատման համար։</Typography>
        {units.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>Վերլուծության ենթակա հայտարարագրեր չկան։</Alert>}
        <TextField type="number" label="Տողերի քանակ" value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value)))} size="small" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Չեղարկել</Button>
        <Button variant="contained" disabled={!units.length} onClick={doExport}>Արտահանել</Button>
      </DialogActions>
    </Dialog>
  );
}

const DETAIL_TABS = ['risk', 'expense', 'multiyear', 'data'];
export function DeclarationDetail({ id, tab: tabName }) {
  const { results } = useStore();
  const [tab, setTab] = useState(Math.max(0, DETAIL_TABS.indexOf(tabName)));
  const u = results.declarations.find((x) => String(x.id) === String(id));
  if (!u) return <Typography>Հայտարարագիրը չի գտնվել</Typography>;
  const rules = [...results.rules, ...MANUAL_RULES];
  const d = u.decl;
  return (
    <>
      <PageHeader
        back={{ to: '/declarations', label: 'Հայտարարագրեր' }}
        title={`${u.profile.firstname} ${u.profile.lastname} — ${lk('c_declarationtype', d.declarationtype)} հայտարարագիր ${d.year}`}
        subtitle={`${d.position}, ${lk('c_institution', d.institution)} · ${d.code} (instanceid ${d.instanceid}) · ${lk('c_wfstate', d.wfstateid)}${d.submittedon ? ` · ներկայացվել է ${fmtDate(d.submittedon.slice(0, 10))}` : ''}`}
        actions={!u.draft && <RiskChip risky={u.risky} label={u.risky ? 'Վերլուծության ենթակա' : 'Վերլուծության ենթակա չէ'} />}
      />
      {u.draft ? (
        <>
          <InfoNote severity="warning">
            Հայտարարագիրը չի ներկայացվել (կարգավիճակ՝ {lk('c_wfstate', u.decl.wfstateid)}){u.overdue.length ? `. առկա է de_declarationoverdueact գրառում (declarationnumber = ${u.overdue[0].declarationnumber}, ${fmtDate(u.overdue[0].datecreated.slice(0, 10))})` : ''}։ Ուշացման և չներկայացման չափորոշիչները (3, 4) չեն իրականացված, քանի որ տույժերի ֆայլի տվյալները ճշտված չեն (Q-17)։
          </InfoNote>
          <ConclusionBox direction="declarations" unitId={u.id} />
        </>
      ) : (
        <>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Ռիսկային նշումներ" />
            <Tab label="Ընթացիկ ծախսի հաշվարկ (4.1)" />
            <Tab label="Բազմամյա ամփոփում (DEC-09)" />
            <Tab label={`Հայտարարագրի տվյալներ և ճշգրտումներ${Object.keys(u.corrections).length ? ` (${Object.keys(u.corrections).length})` : ''}`} />
          </Tabs>
          {tab === 0 && <RiskTab u={u} rules={rules} />}
          {tab === 1 && <ExpenseTab u={u} />}
          {tab === 2 && <MultiYearTab u={u} />}
          {tab === 3 && <DataTab u={u} />}
        </>
      )}
    </>
  );
}

function RiskTab({ u, rules }) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <InfoNote>
          DEC-04. հաշվարկը կատարվում է երկու եղանակով՝ յուրաքանչյուր առանձին հայտարարագրողի համար և ընտանիքի ընդհանուր կազմով։ Հայտարարագիրը վերլուծության ենթակա է, եթե որևէ հաշվարկում համախառն միավորը ≥ {u.threshold}։
          {u.manualWeight > 0 && ` Ձեռքով նշման քաշը (${u.manualWeight}) գումարվում է բոլոր հաշվարկներին։`}
        </InfoNote>
        {u.scopes.map((s) => (
          <Section key={s.key} title={s.label} actions={<ScoreChip score={s.score} threshold={u.threshold} />}>
            <RuleResults results={s.results} rules={rules} showWeight />
          </Section>
        ))}
        {u.original && <BeforeAfter u={u} />}
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <ManualFlagBox direction="declarations" unitId={u.id} refDate={`${u.year}-12-31`} />
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
  const keys = ['Ds', 'E', 'G', 'Dv', 'Ps', 'Pv', 'C', 'annual', 'monthly'];
  return (
    <>
      <InfoNote>
        Բանաձևը (SRS 4.1). Ծ = Դս + Ե − Գ − Դվ;  ԸՏԾ = Ծ + (Փվ − Փս);  ՄԱԾ = ԸՏԾ / 12։ Ներառվում են միայն հաստատված տողերը (DEC-06), արտարժույթը փոխարկվում է տողի հետ պահված փոխարժեքով (DEC-11)։
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
  const roots = declarationsOfPerson(pid).filter((d) => d.declaranttype !== 2).sort((a, b) => a.year - b.year);
  const calc = (family) => roots.map((d) => {
    const linked = family ? current('de_declaration').filter((x) => x.parentdeclaration === d.instanceid) : [];
    const e = computeExpense([d, ...linked], family ? () => true : (r) => r.familymembertype === null, state.corrections);
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
  const { state, update } = useStore();
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
        DEC-10. տեխնիկական վրիպման դեպքում մասնագետը կարող է ճշգրտել գումարը. ճշգրտված արժեքը պահվում է մոդուլում, EPD-ի սկզբնական արժեքը պահպանվում է։ Մերժված տողերը (status = 2) վերլուծության մեջ չեն ներառվում (DEC-06)։
      </InfoNote>
      <Section title="Ընդհանուր տվյալներ">
        <KV items={[
          ['Հայտարարատու', `${u.profile.fullname} (ՀԾՀ ${u.profile.ssn})`],
          ['Պաշտոն', `${u.decl.position}, ${lk('c_institution', u.decl.institution)} (պաշտոնի տեսակ՝ ${lk('c_positiontype', u.decl.positiontype) || '—'})`],
          ['Պաշտոնը ստանձնել է', fmtDate(u.decl.positionassumptiondate)],
          ['Ընտանիքի անդամներ (de_profilefamilymembers)', fam.map((f) => {
            const live = liveProfileOf(byInstance('de_profile', f.profile));
            const own = u.linked.find((l) => l.originaldeclarant === live?.instanceid);
            return `${profileName(f.profile)} (${lk('c_familymembertype', f.type)}${own ? `, առանձին հայտարարագիր ${own.code}` : ', տողերը պաշտոնյայի հայտարարագրում'})`;
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
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Ճշգրտում (DEC-10)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>{edit.r._decl?.code} · {edit.key} · entityid {edit.r.entityid}<br />EPD-ի սկզբնական արժեք՝ <b>{fmtNum(edit.r[edit.key])} {cur}</b></Typography>
        <TextField autoFocus type="number" label={`Ճշգրտված արժեք (${cur})`} value={val} onChange={(e) => setVal(e.target.value)} fullWidth />
      </DialogContent>
      <DialogActions>
        <Button startIcon={<UndoIcon />} onClick={onRevert}>Վերադարձնել սկզբնականը</Button>
        <Button onClick={onClose}>Չեղարկել</Button>
        <Button variant="contained" onClick={() => onSave(val)} disabled={val === '' || Number.isNaN(Number(val))}>Պահպանել և վերագործարկել</Button>
      </DialogActions>
    </Dialog>
  );
}
