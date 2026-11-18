import { useState } from 'react';
import { Chip, Grid, Stack, Typography } from '@mui/material';
import { useStore } from '../engine/store.js';
import { current, isYes, amd } from '../data/epd/repository.js';
import { lk, INTEGRITY_STUDY_STATE } from '../data/epd/classifiers.js';
import { PageHeader, Section, RuleResults, RiskChip, SimpleTable, FilterBar, EMPTY_FILTERS, KV, fmtAmd, fmtDate, navigate, InfoNote } from '../components/common.jsx';
import { ConclusionBox, ManualFlagBox, UndefinedVarsBanner, conclusionLabel } from '../components/casework.jsx';
import { applyFilters, firedIds } from './filters.js';

export function IntegrityList() {
  const { results, state } = useStore();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const units = results.integrity;
  const rules = results.rules.filter((r) => r.direction === 'integrity');
  const skipped = current('de_integrity').filter((q) => q.wfstateid !== INTEGRITY_STUDY_STATE).length;
  const rows = applyFilters(units, filters, {
    text: (u) => `${u.profile.firstname} ${u.profile.lastname} ${u.profile.ssn} ${u.code}`,
    year: (u) => u.year,
    risky: (u) => u.risky,
    flagged: (u) => u.risky,
    hasRule: (u, id) => firedIds(u.results).includes(id),
  }).sort((a, b) => b.firedCount - a.firedCount);
  return (
    <>
      <PageHeader title="Բարեվարքության հարցաթերթիկներ" subtitle={`Միայն «${lk('c_wfstate', INTEGRITY_STUDY_STATE)}» (wfstateid ${INTEGRITY_STUDY_STATE}) կարգավիճակ ստացածները (INT-01). ${skipped} հարցաթերթիկ այլ կարգավիճակով ցանկում չի ներառվում։ Կանոնները քաշ չունեն (INT-03)`} />
      <InfoNote>«Ուսումնասիրության ենթակա» կարգավիճակը (Q-36) նախատիպում համարվում է EPD-ի c_wfstate 60՝ «Ուսումնասիրության փուլ» (Integrity պրոցես)։ Պահանջում է ԿԿՀ-ի հաստատում։</InfoNote>
      <UndefinedVarsBanner units={units} getResults={(u) => Object.values(u.results)} />
      <FilterBar filters={filters} setFilters={setFilters} years={[...new Set(units.map((u) => u.year))]} rules={rules} />
      <Section>
        <SimpleTable onRowClick={(u) => navigate(`/integrity/${u.id}`)} rows={rows} columns={[
          { key: 'n', label: 'Թեկնածու', render: (u) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{u.profile.firstname} {u.profile.lastname}</Typography><Typography variant="caption" color="text.secondary">ՀԾՀ {u.profile.ssn}</Typography></> },
          { key: 'p', label: 'Տարի', render: (u) => u.integrity.year },
          { key: 't', label: 'Տեսակ', render: (u) => lk('c_integritytype', u.integrity.integritytype) },
          { key: 'dc', label: 'Հայտարարատու', render: (u) => (u.declarations.length ? `Այո (${u.declarations.length})` : 'Ոչ') },
          { key: 'd', label: 'Ներկայացվել է', render: (u) => fmtDate(u.integrity.submissiondate) },
          { key: 'f', label: 'Աշխատած կանոններ', render: (u) => <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>{firedIds(u.results).map((id) => <Chip key={id} size="small" color="error" variant="outlined" label={id} />)}{u.manual.length > 0 && <Chip size="small" color="secondary" variant="outlined" label="ձեռքով" />}</Stack> },
          { key: 'r', label: 'Ռիսկ', render: (u) => <RiskChip risky={u.risky} /> },
          { key: 'c', label: 'Եզրակացություն', render: (u) => <Typography variant="caption">{conclusionLabel(state, 'integrity', u.id)}</Typography> },
        ]} />
      </Section>
    </>
  );
}

export function IntegrityDetail({ id }) {
  const { results } = useStore();
  const u = results.integrity.find((x) => String(x.id) === String(id));
  if (!u) return <Typography>Հարցաթերթիկը չի գտնվել</Typography>;
  const L = u.liability || {};
  const yn = (b) => (isYes(b) ? 'Այո' : 'Ոչ');
  return (
    <>
      <PageHeader back={{ to: '/integrity', label: 'Բարեվարքություն' }} title={`${u.profile.firstname} ${u.profile.lastname}`} subtitle={`${u.code} · ${lk('c_integritytype', u.integrity.integritytype)} · ${lk('c_wfstate', u.integrity.wfstateid)} · ${fmtDate(u.integrity.submissiondate)}`} actions={<RiskChip risky={u.risky} />} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Section title="Ռիսկային նշումներ (INT-04)"><RuleResults results={u.results} rules={results.rules} /></Section>
          <Section title="Անձ և կապ հայտարարագրերի հետ (INT-05)">
            <KV items={[
              ['ՀԾՀ', `${u.profile.ssn} (կենդանի պրոֆիլ՝ originalprofile. profile-ը կլոնն է, Guide 4.2)`],
              ['Հայտարարագրեր', u.declarations.length ? u.declarations.map((d) => `${d.year} (${d.code})`).join(', ') : 'Թեկնածուն հայտարարատու չէ'],
            ]} />
          </Section>
          <Section title="Աշխատանքային փորձ">
            <SimpleTable dense rows={u.rows('de_integrityworkpositions')} columns={[
              { key: 'institutionname', label: 'Հաստատություն (institutionname)' }, { key: 'position', label: 'Պաշտոն' },
              { key: 's', label: 'Սկիզբ', render: (r) => `${String(r.startmonth).padStart(2, '0')}.${r.startyear}` },
              { key: 'e', label: 'Ավարտ', render: (r) => (r.endyear ? `${String(r.endmonth).padStart(2, '0')}.${r.endyear}` : 'առ այսօր') },
            ]} />
          </Section>
          <Section title="Շահեր">
            <KV items={[['Կապ պաշտոնատար անձանց հետ (haverelationshipwithpositionholders)', yn(u.interests?.haverelationshipwithpositionholders)], ['Կուսակցական անդամակցություն', yn(u.interests?.havepartymembership)]]} />
            <SimpleTable dense rows={u.rows('de_integrityinterestspublicofficerelatives')} columns={[{ key: 'r', label: 'Կապ', render: (r) => lk('c_relationwithnominee', r.relationwithnominee) }, { key: 'relativefullname', label: 'Անուն' }, { key: 'employername', label: 'Գործատու' }, { key: 'position', label: 'Պաշտոն' }, { key: 's', label: 'Սկիզբ', render: (r) => fmtDate(r.startdate) }]} empty="Ազգականներ նշված չեն" />
          </Section>
          <Section title="Պատասխանատվություն">
            <KV items={[
              ['Կարգապահական', yn(L.havedisciplinaryliabilities)], ['Քրեական', yn(L.havecriminalliabilities)], ['Դատվածություն', yn(L.haveconviction)], ['Հանված դատվածություն', yn(L.isconvictionrevoked)],
              ['Քրեական հետապնդման դադարեցում', yn(L.haveunfulfilledterminatedprosecutions)], ['Վարչական', `${yn(L.haveadministrativeliabilities)} (${u.rows('de_integrityliabilityadministrative').length} տող)`], ['Քաղաքացիական գործեր', `${yn(L.havecivilcaseparticipation)} (${u.rows('de_integrityliabilitycivilcaseparticipation').length} տող)`],
            ]} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Կցված ֆայլերը (օր.՝ prosecutiondecisiondocument) տեքստային որոնման չեն ենթարկվում (INT-06)։</Typography>
          </Section>
          <Section title="Կանխիկ դրամական միջոցներ">
            <SimpleTable dense rows={u.rows('de_integrityfinancialmeanscash')} columns={[
              { key: 'p', label: 'Անձ', render: (r) => `${u.profileName(r.profile)}${r.familymembertype ? ` (${lk('c_familymembertype', r.familymembertype)})` : ''}` },
              { key: 'a', label: 'Գումար', align: 'right', render: (r) => (r.amount_currencyid === 2 ? fmtAmd(r.amount_amount) : `${r.amount_amount} × ${r.amount_ratetodefault} = ${fmtAmd(amd(r, 'amount'))}`) },
              { key: 'status', label: 'status (Q-40)', render: (r) => lk('c_integrationstatus', r.status) || '—' },
            ]} />
          </Section>
          <InfoNote>Չափորոշիչ 12 (արտաքին տեղեկատվական աղբյուրների AI որոնում, INT-07) ռիսկի կանոն չէ և նախատիպում չի իրականացված (Q-35)։</InfoNote>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ManualFlagBox direction="integrity" unitId={u.id} refDate={u.integrity.submittedon} />
          <ConclusionBox direction="integrity" unitId={u.id} />
        </Grid>
      </Grid>
    </>
  );
}
