import { useState } from 'react';
import { Chip, Grid, Stack, Typography, TextField, MenuItem } from '@mui/material';
import { useStore } from '../engine/store.js';
import { detailRows } from '../data/epd/repository.js';
import { lk } from '../data/epd/classifiers.js';
import { PageHeader, Section, RuleResults, RiskChip, SimpleTable, KV, fmtAmd, fmtDate, navigate, InfoNote, EMPTY_FILTERS, FilterBar } from '../components/common.jsx';
import { ConclusionBox, ManualFlagBox, conclusionLabel } from '../components/casework.jsx';
import { applyFilters, firedIds } from './filters.js';

const personPath = (p) => `/parties/person/${encodeURIComponent(p.id)}`;

export function PartiesList() {
  const { results, state } = useStore();
  const [year, setYear] = useState('');
  const [view, setView] = useState('parties');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { parties, persons } = results.parties;
  const years = [...new Set(parties.map((p) => p.year))].sort();
  const rules = results.rules.filter((r) => r.direction === 'parties');
  const list = parties.filter((p) => !year || String(p.year) === String(year));
  const personRows = applyFilters(persons, filters, {
    text: (p) => `${p.names.join(' ')} ${p.identifier || ''}`,
    year: (p) => p.year,
    risky: (p) => p.risky,
    flagged: (p) => p.risky,
    hasRule: (p, id) => firedIds(p.results).includes(id),
  }).sort((a, b) => b.firedCount - a.firedCount || b.total - a.total);
  return (
    <>
      <PageHeader title="Կուսակցությունների հաշվետվություններ" subtitle="Բաժին 5-ը նախնական է։ Վերլուծվում են ֆիզիկական անձինք (կանոններ 1, 6) և հաշվետվությունը. ռիսկային է կուսակցությունը, որի ցանկում կա ռիսկային ֆիզիկական անձ կամ որի հաշվետվության վրա աշխատել է կանոն (PAR-04)" />
      <InfoNote>Հաշվետվության մակարդակի SRS կանոնները (5, 7, 8) չեն իրականացված (Q-45, Q-46, Q-51)։ Հաշվետվության մակարդակի կանոն կարելի է ավելացնել կառուցիչով (COM-01)։ Կանոններ 2, 3, 4-ը նույնպես չեն իրականացված (տես «Կանոններ → Կուսակցություններ → Չիրականացված կանոններ»)։</InfoNote>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField size="small" select label="Տեսք" value={view} onChange={(e) => setView(e.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="parties">Կուսակցություններ</MenuItem>
          <MenuItem value="persons">Ֆիզիկական անձինք (PAR-02)</MenuItem>
        </TextField>
        {view === 'parties' && (
          <TextField size="small" select label="Տարի" value={year} onChange={(e) => setYear(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value="">Բոլորը</MenuItem>{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
        )}
      </Stack>
      {view === 'parties' ? (
        <Section>
          <SimpleTable onRowClick={(p) => navigate(`/parties/${p.id}`)} rows={list} columns={[
            { key: 'name', label: 'Կուսակցություն', render: (p) => <Typography sx={{ fontWeight: 600 }}>{p.name}</Typography> },
            { key: 'year', label: 'Տարի' },
            { key: 'rep', label: 'Հաշվետվություն', render: (p) => `${lk('c_reporttype', p.reportUnit.report.reporttype)}, ${lk('c_wfstate', p.reportUnit.report.wfstateid)}` },
            { key: 'pp', label: 'Ռիսկային ֆիզ. անձինք', align: 'center', render: (p) => `${p.riskyPersons.length} / ${p.persons.length}` },
            { key: 'rf', label: 'Հաշվետվության կանոններ', align: 'center', render: (p) => p.reportUnit.firedCount + p.reportUnit.manual.length || '—' },
            { key: 'risk', label: 'Ռիսկ', render: (p) => <RiskChip risky={p.risky} /> },
            { key: 'c', label: 'Եզրակացություն', render: (p) => <Typography variant="caption">{conclusionLabel(state, 'parties', p.id)}</Typography> },
          ]} />
        </Section>
      ) : (
        <>
          <FilterBar filters={filters} setFilters={setFilters} years={[...new Set(persons.map((p) => p.year))].sort()} rules={rules.filter((r) => (r.level || 'person') === 'person')} />
          <Section><PersonsTable rows={personRows} /></Section>
        </>
      )}
    </>
  );
}

function PersonsTable({ rows, party }) {
  return (
    <SimpleTable onRowClick={(p) => navigate(personPath(p))} rows={rows} columns={[
      { key: 'n', label: 'Անձ', render: (p) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.names.join(' / ')}</Typography><Typography variant="caption" color="text.secondary">{p.identifier ? `identitydocumentnumber՝ ${p.identifier}` : 'Նույնականացնող տվյալ չկա (միավորված է անունով)'}</Typography></> },
      { key: 'y', label: 'Տարի', render: (p) => p.year },
      ...(party ? [{ key: 'tp', label: 'Այս կուսակցությանը', align: 'right', render: (p) => fmtAmd(p.payments.filter((x) => x.reportId === party.id).reduce((s, x) => s + x.amount, 0)) }] : []),
      { key: 't', label: 'Ընդհանուր (բոլոր կուսակցություններ)', align: 'right', render: (p) => fmtAmd(p.total) },
      { key: 'f', label: 'Աշխատած կանոններ', render: (p) => <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>{firedIds(p.results).map((id) => <Chip key={id} size="small" color="error" variant="outlined" label={id} />)}{Object.values(p.results).filter((r) => r.status === 'not_evaluated').map((r) => <Chip key={r.ruleId} size="small" color="warning" variant="outlined" label={`${r.ruleId}?`} />)}{p.manual.length > 0 && <Chip size="small" color="secondary" variant="outlined" label="ձեռքով" />}</Stack> },
      { key: 'r', label: 'Ռիսկ', render: (p) => <RiskChip risky={p.risky} /> },
    ]} />
  );
}

export function PartyDetail({ id }) {
  const { results } = useStore();
  const p = results.parties.parties.find((x) => String(x.id) === String(id));
  if (!p) return <Typography>Կուսակցությունը չի գտնվել</Typography>;
  const ru = p.reportUnit;
  const rep = ru.report;
  const t = (name) => detailRows(rep, name);
  const cf = ru.cashflow;
  return (
    <>
      <PageHeader back={{ to: '/parties', label: 'Կուսակցություններ' }} title={`${p.name} — ${rep.year} տարեկան հաշվետվություն`} subtitle={`${rep.code} · ${lk('c_reportkind', rep.reportkind)} · ${lk('c_wfstate', rep.wfstateid)} · ներկայացվել է ${fmtDate(rep.submittedon?.slice(0, 10))}`} actions={<RiskChip risky={p.risky} />} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Section title={`Ռիսկային ֆիզիկական անձինք (${p.riskyPersons.length})`}>
            <PersonsTable rows={p.riskyPersons} party={ru} />
          </Section>
          <Section title="Հաշվետվության մակարդակի կանոններ">
            {Object.keys(ru.results).length ? <RuleResults results={ru.results} rules={results.rules} /> : <Typography color="text.secondary">Հաշվետվության մակարդակի իրականացված կանոններ չկան (SRS կանոններ 5, 7, 8՝ չիրականացված)։ Կարելի է ստեղծել կառուցիչով։</Typography>}
          </Section>
          <Section title={`Բոլոր վճարողները (${p.persons.length})`}><PersonsTable rows={p.persons} party={ru} /></Section>
          <Section title="Մուտքեր և ելքեր (de_reportcashflow). տեղեկատվական">
            <KV items={[
              ['Մնացորդ տարվա սկզբին', fmtAmd(cf?.amountatbeginningofyear)],
              ['Դրամական մուտքեր (ըստ տեսակի)', t('de_reportcashflowincomes').map((x) => `${lk('c_partyincomesgroup', x.type)}՝ ${fmtAmd(x.amount)}`).join('; ')],
              ['Դրամական ելքեր (monetaryexpenditurestotal)', fmtAmd(cf?.monetaryexpenditurestotal)],
              ['Ելքեր ըստ տեսակի', t('de_reportcashflowexpenditures').map((x) => `${lk('c_partyexpenditurestype', x.type)}՝ ${fmtAmd(x.amount)}${x.nonmonetaryamount ? ` (ոչ դրամ.՝ ${fmtAmd(x.nonmonetaryamount)})` : ''}`).join('; ')],
              ['amountcorrection', fmtAmd(cf?.amountcorrection)],
              ['Մնացորդ տարվա վերջին', 'EPD-ում առանձին դաշտ չկա (Q-46)'],
            ]} />
          </Section>
          <Section title="Չիրականացված կանոնների տվյալներ (տեղեկատվական)">
            <Typography variant="subtitle2">1.2 Չթույլատրված աղբյուրներից (կանոն 5, Q-45)</Typography>
            <SimpleTable dense rows={t('de_reportincomesprohibitedmonetarydonations')} columns={[{ key: 'fullname', label: 'Նվիրատու' }, { key: 'a', label: 'Գումար', render: (r) => fmtAmd(r.amount_amd) }, { key: 'd', label: 'Ամսաթիվ', render: (r) => fmtDate(r.date) }, { key: 'ra', label: 'returnamount_amd', render: (r) => fmtAmd(r.returnamount_amd) }, { key: 'rd', label: 'returndate', render: (r) => fmtDate(r.returndate) }]} />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>1.3 Չվերադարձված կամ պետական բյուջե չփոխանցված (կանոն 5). de_reportincomesnoncompliantandnottransferredmonetarydonations</Typography>
            <SimpleTable dense rows={t('de_reportincomesnoncompliantandnottransferredmonetarydonations')} columns={[{ key: 'fullname', label: 'Նվիրատու' }, { key: 'a', label: 'Գումար', render: (r) => fmtAmd(r.amount_amd) }, { key: 'd', label: 'Ամսաթիվ', render: (r) => fmtDate(r.date) }, { key: 'o', label: 'Այլ տվյալներ', render: (r) => r.otherdata }]} />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>2.4 Անշարժ գույքի օգտագործում (կանոն 7, Q-46, Q-51)</Typography>
            <SimpleTable dense rows={t('de_reportincomescheapordonatedrealestate')} columns={[{ key: 'cadastralnumber', label: 'Կադաստրային ծածկագիր' }, { key: 'fulllocation', label: 'Հասցե' }, { key: 'renterfullname', label: 'renterfullname' }, { key: 'cv', label: 'cadastralvalue', render: (r) => fmtAmd(r.cadastralvalue) }, { key: 'a', label: 'Վճարված', render: (r) => fmtAmd(r.amount) }, { key: 'n', label: 'nonmonetaryincome', render: (r) => fmtAmd(r.nonmonetaryincome) }, { key: 'days', label: 'Օրեր', render: (r) => r.rentorusagedurationindays }]} />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>2.3 Անհատույց աշխատանքներ (նույնականացնող տվյալ չկա)</Typography>
            <SimpleTable dense rows={t('de_reportincomesfreeofchargeworksservices')} columns={[{ key: 'fullname', label: 'Անձ' }, { key: 'natureofworkservice', label: 'Աշխատանք' }, { key: 'a', label: 'Գումար', render: (r) => fmtAmd(r.amount) }]} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ManualFlagBox direction="parties" unitId={ru.id} />
          <ConclusionBox direction="parties" unitId={p.id} />
        </Grid>
      </Grid>
    </>
  );
}

export function PartyPersonDetail({ id }) {
  const { results } = useStore();
  const p = results.parties.persons.find((x) => x.id === id);
  if (!p) return <Typography>Անձը չի գտնվել</Typography>;
  return (
    <>
      <PageHeader back={{ to: '/parties', label: 'Կուսակցություններ' }} title={p.names.join(' / ')} subtitle={`Ֆիզիկական անձ · ${p.year} · ${p.identifier ? `identitydocumentnumber՝ ${p.identifier}` : 'նույնականացնող տվյալ չկա'}`} actions={<RiskChip risky={p.risky} />} />
      {p.declarantProfile && <InfoNote>Անձը EPD-ում հայտարարատու է ({p.declarantProfile.firstname} {p.declarantProfile.lastname})։ Կանոն 2-ը (նվիրատվությունների համադրում հայտարարագրի հետ) չի իրականացված (Q-47)։</InfoNote>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Section title="Ռիսկային նշումներ (PAR-05)"><RuleResults results={p.results} rules={results.rules} /></Section>
          <Section title={`Վճարումներ (${p.payments.length}) — ${fmtAmd(p.total)}`}>
            <SimpleTable dense rows={p.payments.map((x, i) => ({ ...x, id: i }))} columns={[
              { key: 'partyName', label: 'Կուսակցություն' },
              { key: 'label', label: 'Տեսակ' },
              { key: 'a', label: 'Չափ', align: 'right', render: (x) => fmtAmd(x.amount) + (x.row.amount_currencyid && x.row.amount_currencyid !== 2 ? ` (${x.row.amount_amount} × ${x.row.amount_ratetodefault})` : '') },
              { key: 'd', label: 'Ամսաթիվ', render: (x) => fmtDate(x.date) },
              { key: 'n', label: 'Լրացված անուն', render: (x) => x.row.fullname },
              { key: 'o', label: 'Առարկա', render: (x) => x.row.donationobject || '—' },
            ]} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ManualFlagBox direction="parties" unitId={p.id} />
          <ConclusionBox direction="parties" unitId={p.id} />
        </Grid>
      </Grid>
    </>
  );
}
