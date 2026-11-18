import { useState } from 'react';
import { Chip, Grid, Stack, Typography } from '@mui/material';
import { useStore } from '../engine/store.js';
import { lk } from '../data/epd/classifiers.js';
import { CURRENCY_CODE } from '../data/epd/exchangeRates.js';
import { PageHeader, Section, RuleResults, RiskChip, SimpleTable, FilterBar, EMPTY_FILTERS, KV, fmtAmd, fmtDate, navigate, InfoNote } from '../components/common.jsx';
import { ConclusionBox, ManualFlagBox, UndefinedVarsBanner, conclusionLabel } from '../components/casework.jsx';
import { applyFilters, firedIds } from './filters.js';

const giverOf = (g) => g.giverlegalentityname || g.givername;

export function GiftsList() {
  const { results, state } = useStore();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const units = results.gifts;
  const rules = results.rules.filter((r) => r.direction === 'gifts');
  const years = [...new Set(units.map((u) => u.year))].sort();
  const rows = applyFilters(units, filters, {
    text: (u) => `${u.recipient.firstname} ${u.recipient.lastname} ${u.recipient.ssn} ${giverOf(u.gift)} ${u.gift.description} ${u.code}`,
    year: (u) => u.year,
    risky: (u) => u.risky,
    flagged: (u) => u.risky,
    hasRule: (u, id) => firedIds(u.results).includes(id),
  }).sort((a, b) => b.firedCount - a.firedCount || b.gift.receiptdate.localeCompare(a.gift.receiptdate));
  return (
    <>
      <PageHeader title="Նվերների ձևաթղթեր" subtitle={`Յուրաքանչյուր նվեր՝ առանձին ձևաթուղթ. ստացողի նվերները միավորվում են (GIF-01)։ Ձևաթուղթը ռիսկային է, եթե աշխատել է առնվազն մեկ կանոն (GIF-03)։ Ռիսկային՝ ${units.filter((u) => u.risky).length} / ${units.length}`} />
      <UndefinedVarsBanner units={units} getResults={(u) => Object.values(u.results)} />
      <FilterBar filters={filters} setFilters={setFilters} years={years} rules={rules} />
      <Section>
        <SimpleTable onRowClick={(u) => navigate(`/gifts/${u.id}`)} rows={rows} columns={[
          { key: 'id', label: 'Ձևաթուղթ', render: (u) => <Typography variant="body2" color="text.secondary">{u.code}</Typography> },
          { key: 'r', label: 'Ստացող', render: (u) => <><Typography variant="body2" sx={{ fontWeight: 600 }}>{u.recipient.firstname} {u.recipient.lastname}</Typography><Typography variant="caption" color="text.secondary">{lk('c_positiontype', u.positiontype)}</Typography></> },
          { key: 'd', label: 'Նվեր', render: (u) => <><Typography variant="body2">{u.gift.description}</Typography><Typography variant="caption" color="text.secondary">{lk('c_giftsubclassification', u.gift.giftsubclassification) || lk('c_giftclassification', u.gift.classification)}</Typography></> },
          { key: 'g', label: 'Նվիրատու', render: (u) => giverOf(u.gift) },
          { key: 'a', label: 'Արժեք', align: 'right', render: (u) => fmtAmd(u.gift.amount_amd) },
          { key: 'dt', label: 'Ստացման օր', render: (u) => fmtDate(u.gift.receiptdate) },
          { key: 'f', label: 'Աշխատած կանոններ', render: (u) => <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>{firedIds(u.results).map((id) => <Chip key={id} size="small" color="error" variant="outlined" label={id} />)}{u.manual.length > 0 && <Chip size="small" color="secondary" variant="outlined" label="ձեռքով" />}</Stack> },
          { key: 'risk', label: 'Ռիսկ', render: (u) => <RiskChip risky={u.risky} /> },
          { key: 'c', label: 'Եզրակացություն', render: (u) => <Typography variant="caption">{conclusionLabel(state, 'gifts', u.id)}</Typography> },
        ]} />
      </Section>
    </>
  );
}

export function GiftDetail({ id }) {
  const { results } = useStore();
  const u = results.gifts.find((x) => String(x.id) === String(id));
  if (!u) return <Typography>Ձևաթուղթը չի գտնվել</Typography>;
  const g = u.gift;
  const ev = u.evaluation;
  const sources = u.evaluationSources;
  const sameRecipient = results.gifts.filter((x) => x.gift.originalprofile === g.originalprofile).sort((a, b) => a.gift.receiptdate.localeCompare(b.gift.receiptdate));
  return (
    <>
      <PageHeader back={{ to: '/gifts', label: 'Նվերների ձևաթղթեր' }} title={`${g.description}`} subtitle={`${u.code} · ${u.recipient.firstname} ${u.recipient.lastname} · ${fmtDate(g.receiptdate)}`} actions={<RiskChip risky={u.risky} />} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Section title="Ռիսկային նշումներ (GIF-02)"><RuleResults results={u.results} rules={results.rules} /></Section>
          <Section title="Ձևաթղթի տվյալներ">
            <KV items={[
              ['Ստացող (originalprofile)', `${u.recipient.firstname} ${u.recipient.lastname} (ՀԾՀ ${u.recipient.ssn}), ${g.positionatwork}, ${lk('c_institution', g.institution)}`],
              ['Պաշտոնի տեսակ (profile.positiontype)', lk('c_positiontype', u.positiontype)],
              ['Նվիրատու', `${giverOf(g)} (${lk('c_persontype', g.givertype)})${g.giverposition ? `, ${g.giverposition}` : ''}${g.giverworkplace ? `, ${g.giverworkplace}` : ''}`],
              ['Գործունեության ոլորտ', g.giverlegalentityactivityfield || '—'],
              ['Դասակարգում', lk('c_giftclassification', g.classification)],
              ['Ենթադասակարգում / տեսակ', `${lk('c_giftsubclassification', g.giftsubclassification) || '—'} / ${lk('c_gifttype', g.type)}`],
              ['Արժեք', g.amount_currencyid === 2 ? fmtAmd(g.amount_amd) : `${g.amount_amount.toLocaleString('hy-AM')} ${CURRENCY_CODE[g.amount_currencyid]} × ${g.amount_ratetodefault} = ${fmtAmd(g.amount_amd)}`],
              ['Ստացման հանգամանք', g.receiptcircumstance],
              ['Կարգավիճակ', `${lk('c_wfstate', g.wfstateid)}${g.publishgift === 1 ? ' (հրապարակվում է)' : ''}`],
            ]} />
          </Section>
          <Section title="EPD-ում AI-ով գնահատված արժեք (տեղեկատվական, GIF-04)">
            <InfoNote>«Արտաքին արժեքի համեմատում» կանոնը չի իրականացված (Q-21. բազմապատկիչները և համեմատվող արժեքը սահմանված չեն)։ Գնահատականը ցուցադրվում է միայն որպես տեղեկատվություն։</InfoNote>
            {ev ? (ev.unabletodeterminevalue ? <Typography>AI գործիքը չի կարողացել որոշել արժեքը (unabletodeterminevalue)։</Typography> : (
              <KV items={[
                ['Ճանաչված առարկա', ev.identifieditem], ['Գնահատված արժեք (estimatedvalue_amd)', fmtAmd(ev.estimatedvalue_amd)], ['Նվազագույն / առավելագույն', `${fmtAmd(ev.estimatedvaluemin_amd)} / ${fmtAmd(ev.estimatedvaluemax_amd)}`],
                ['Վստահության մակարդակ', lk('c_aiconfidencelevel', ev.estimationconfidence)],
                ['Աղբյուրներ', sources.map((x) => `${x.sourcetype}${x.isofficial ? ' (պաշտոնական)' : ''}՝ ${fmtAmd(x.priceinamd)}`).join('; ') || '—'],
              ]} />
            )) : <Typography color="text.secondary">EPD-ում այս նվերի AI գնահատական չկա։ Մոդուլի սեփական AI գնահատումը նախատիպում չկա։</Typography>}
          </Section>
          <Section title={`Ստացողի բոլոր նվերները (${sameRecipient.length})`}>
            <SimpleTable dense onRowClick={(x) => navigate(`/gifts/${x.id}`)} rows={sameRecipient} columns={[
              { key: 'dt', label: 'Ամսաթիվ', render: (x) => fmtDate(x.gift.receiptdate) },
              { key: 'd', label: 'Նվեր', render: (x) => x.gift.description },
              { key: 'a', label: 'Արժեք', align: 'right', render: (x) => fmtAmd(x.gift.amount_amd) },
              { key: 'f', label: 'Կանոններ', render: (x) => firedIds(x.results).join(', ') || '—' },
            ]} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ManualFlagBox direction="gifts" unitId={u.id} refDate={g.receiptdate} />
          <ConclusionBox direction="gifts" unitId={u.id} />
        </Grid>
      </Grid>
    </>
  );
}
