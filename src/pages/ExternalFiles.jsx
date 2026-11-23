/**
 * Արտաքին ֆայլեր → Տույժեր (COM-11). վարչական տույժեր (DEC-R3, DEC-R4; Q-17)։
 * Տվյալները մշակվում են մոդուլում՝ ավելացնել, խմբագրել, հեռացնել։ Ֆայլով (.xlsx) ներմուծումը օժանդակ հնարավորություն է։
 * Երեք ներդիր՝ ըստ հայտարարագրի տեսակի։ Տարեթվի ֆիլտրը՝ ըստ հայտարարագրի տարվա, լռելյայն՝ ընթացիկ տարի, իսկ դրա
 * համար գրառում չլինելու դեպքում՝ ամենավերջին առկա տարին (տարի չունեցող գրառումները երևում են «Բոլորը» ընտրելիս)։
 */
import { useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { buildXlsx, downloadXlsx } from '../data/xlsxWriter.js';
import { useStore, can, ROLES } from '../engine/store.js';
import { readXlsx } from '../data/xlsx.js';
import { parsePenaltyRows, demoPenalties, finalizeRecord, isLinkable, penaltyKey, duplicateKey, KIND_LABEL, penaltyTemplateSheets } from '../data/penalties.js';
import { DECLARATION_TYPE, lk } from '../data/epd/classifiers.js';
import { PageHeader, Section, SimpleTable, InfoNote, fmtDate, navigate } from '../components/common.jsx';

const TABS = [
  { type: DECLARATION_TYPE.yearly, label: 'Տարեկան' },
  { type: DECLARATION_TYPE.assumption, label: 'Պաշտոնը ստանձնելու' },
  { type: DECLARATION_TYPE.termination, label: 'Պաշտոնը դադարեցնելու' },
];
const DECLARANT_TYPES = ['Պ/Ա', 'Ը/Ա', 'Կ Պ/Ա'];
const CURRENT_YEAR = new Date().getFullYear();

export default function ExternalFilesPage() {
  const { state, update, results } = useStore();
  const [tab, setTab] = useState(0);
  const [edit, setEdit] = useState(null); // { record } կամ { record: null, type } նորի համար
  const [del, setDel] = useState(null);
  const [importing, setImporting] = useState(null);
  const [clearAll, setClearAll] = useState(false);
  const [showUntyped, setShowUntyped] = useState(false);
  const [error, setError] = useState(null);
  const input = useRef(null);
  const editable = can(state.role, 'correct') || can(state.role, 'external');
  const records = state.penalties?.records || [];
  const who = ROLES[state.role];

  const setRecords = (fn, importInfo) => update((s) => {
    const prev = s.penalties || { records: [], imports: [] };
    return { penalties: { ...prev, records: fn(prev.records), imports: importInfo ? [...(prev.imports || []), importInfo] : prev.imports || [] } };
  });

  // Գրառում → տարեկան հայտարարագրերի ցանկի միավոր (ՀԾՀ + տարի + տեսակ)
  const unitByKey = useMemo(() => {
    const m = new Map();
    for (const u of results.declarations) {
      const keys = u.decl ? [penaltyKey(u.decl.ssn, u.decl.year, u.decl.declarationtype)] : [penaltyKey(u.profile.ssn, u.year, u.declarationType)];
      for (const l of u.linked || []) keys.push(penaltyKey(l.ssn, l.year, l.declarationtype));
      for (const k of keys) if (!m.has(k)) m.set(k, u);
    }
    return m;
  }, [results.declarations]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const { records: parsed, missingColumns } = parsePenaltyRows(await readXlsx(await file.arrayBuffer()));
      if (!parsed.length) throw new Error('Ֆայլում գրառումներ չկան');
      const existing = new Set(records.map(duplicateKey));
      const fresh = parsed.filter((r) => !existing.has(duplicateKey(r)));
      setImporting({ fileName: file.name, parsed, fresh, missingColumns });
    } catch (err) {
      setError(`Ֆայլը հնարավոր չէ կարդալ. ${err.message}`);
    }
  };
  const doImport = (mode) => {
    const { fileName, parsed, fresh } = importing;
    const stamp = (r) => ({ ...r, source: `Ֆայլ՝ ${fileName}`, createdAt: new Date().toISOString(), createdBy: who });
    const added = mode === 'replace' ? parsed : fresh;
    setRecords((prev) => (mode === 'replace' ? added.map(stamp) : [...prev, ...added.map(stamp)]), { fileName, at: new Date().toISOString(), by: who, added: added.length, replaced: mode === 'replace' });
    setImporting(null);
  };
  const saveRecord = (rec) => {
    const now = new Date().toISOString();
    if (rec.id && records.some((r) => r.id === rec.id)) setRecords((prev) => prev.map((r) => (r.id === rec.id ? finalizeRecord({ ...rec, updatedAt: now, updatedBy: who }) : r)));
    else setRecords((prev) => [...prev, finalizeRecord({ ...rec, id: undefined, source: 'Ձեռքով մուտքագրում', createdAt: now, createdBy: who })]);
    setEdit(null);
  };

  const untyped = records.filter((r) => !r.declarationType);
  const lastImport = state.penalties?.imports?.at(-1);

  return (
    <>
      <PageHeader
        title="Տույժեր"
        subtitle="Արտաքին ֆայլեր (COM-11). վարչական տույժեր, որոնք օգտագործվում են DEC-R3 և DEC-R4 կանոններում (Q-17)"
      />
      <InfoNote>
        Վարչական տույժերը (ԿԿՀ-ի կիրառած վարչական իրավախախտման վարույթներ) մուտքագրվում են այստեղ կամ ներմուծվում են Excel ֆայլից։ Ճիշտ ձևաչափը ստանալու համար ներբեռնեք նմուշը. սյունակները ճանաչվում են ըստ վերնագրի։
        Տույժը հայտարարագրի հետ կապվում է ՀԾՀ-ով, հայտարարագրի տարով և տեսակով, տույժի ամսաթիվը՝ «ՎԻՎ Ա ամսաթիվ»։ Ներկայումս կանոններում օգտագործվում են միայն «Տարեկան» ներդիրի տվյալները։
        Տվյալները պահվում են միայն մոդուլում (EPD-ում չեն գրվում)։
      </InfoNote>
      {!editable && <Alert severity="info" sx={{ mb: 2 }}>Տվյալները մշակում է մասնագետը կամ կանոնների պատասխանատուն։</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {!state.penalties && <Alert severity="warning" sx={{ mb: 2 }}>Տույժերի տվյալներ չկան. DEC-R3 և DEC-R4 կանոնները «չի գնահատվել» կարգավիճակում են։ Ավելացրեք գրառում կամ ներմուծեք ֆայլ։</Alert>}
      {state.penalties && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <Chip size="small" variant="outlined" label={`Ընդամենը՝ ${records.length} գրառում`} />
          <Chip size="small" variant="outlined" color="success" label={`Կապակցվող՝ ${records.filter(isLinkable).length}`} />
          {lastImport && <Chip size="small" variant="outlined" label={`Վերջին ներմուծում՝ ${lastImport.fileName}${lastImport.at ? `, ${new Date(lastImport.at).toLocaleString('hy-AM')}` : ''}${lastImport.by ? ` · ${lastImport.by}` : ''}`} />}
        </Stack>
      )}
      {untyped.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => setShowUntyped((v) => !v)}>{showUntyped ? 'Թաքցնել' : 'Ցույց տալ'}</Button>}>
          {untyped.length} գրառում հայտարարագրի տեսակ չունի (դատարկ կամ «Վերաբերելի չէ») և ներդիրներում չի ցուցադրվում։ Խմբագրելով կարելի է նշել տեսակը։
        </Alert>
      )}
      {showUntyped && untyped.length > 0 && (
        <Section title="Առանց հայտարարագրի տեսակի">
          <PenaltyTable rows={untyped} editable={editable} unitByKey={unitByKey} onEdit={(r) => setEdit({ record: r })} onDelete={setDel} />
        </Section>
      )}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', mb: 1 }}>
        <Tooltip title="Excel նմուշ՝ ճիշտ սյունակներով և հրահանգներով, լրացնելու և ներմուծելու համար">
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={() => downloadXlsx('tuyjer-nmush.xlsx', buildXlsx(penaltyTemplateSheets()))}>Ներբեռնել նմուշ (.xlsx)</Button>
        </Tooltip>
        {editable && (
          <>
            <input ref={input} type="file" accept=".xlsx" hidden onChange={onFile} />
            <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => input.current?.click()}>Ներմուծել ֆայլից (.xlsx)</Button>
            <Button variant="outlined" color="warning" onClick={() => setRecords(() => demoPenalties(), { fileName: 'Ցուցադրական տվյալներ', at: new Date().toISOString(), by: who, added: demoPenalties().length, replaced: true })}>Բեռնել ցուցադրական տվյալներ</Button>
            {state.penalties && <Button color="error" onClick={() => setClearAll(true)}>Ջնջել բոլորը</Button>}
          </>
        )}
      </Stack>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t) => <Tab key={t.type} label={`${t.label} (${records.filter((r) => r.declarationType === t.type).length})`} />)}
      </Tabs>
      <PenaltyTab key={TABS[tab].type} type={TABS[tab].type} records={records.filter((r) => r.declarationType === TABS[tab].type)} editable={editable} unitByKey={unitByKey}
        onAdd={() => setEdit({ record: null, type: TABS[tab].type })} onEdit={(r) => setEdit({ record: r })} onDelete={setDel} />

      {edit && <RecordDialog edit={edit} onClose={() => setEdit(null)} onSave={saveRecord} />}
      <Dialog open={!!del} onClose={() => setDel(null)}>
        <DialogTitle>Հեռացնել գրառումը</DialogTitle>
        <DialogContent><Typography>ՎԻՎ Ա {del?.vivNumber || '—'} ({fmtDate(del?.vivDate)}), {[del?.firstName, del?.lastName].filter(Boolean).join(' ')}։ Գրառումը կհեռացվի, և կանոնները կվերագնահատվեն։</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDel(null)}>Չեղարկել</Button><Button color="error" variant="contained" onClick={() => { setRecords((prev) => prev.filter((r) => r.id !== del.id)); setDel(null); }}>Հեռացնել</Button></DialogActions>
      </Dialog>
      <Dialog open={clearAll} onClose={() => setClearAll(false)}>
        <DialogTitle>Ջնջել բոլոր տույժերը</DialogTitle>
        <DialogContent><Typography>Կհեռացվեն բոլոր {records.length} գրառումները, և DEC-R3, DEC-R4 կանոնները կանցնեն «չի գնահատվել» կարգավիճակի։</Typography></DialogContent>
        <DialogActions><Button onClick={() => setClearAll(false)}>Չեղարկել</Button><Button color="error" variant="contained" onClick={() => { update(() => ({ penalties: null })); setClearAll(false); }}>Ջնջել</Button></DialogActions>
      </Dialog>
      <Dialog open={!!importing} onClose={() => setImporting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Ներմուծում ֆայլից</DialogTitle>
        {importing && (
          <DialogContent>
            <Typography sx={{ mb: 1 }}>«{importing.fileName}»՝ {importing.parsed.length} գրառում։</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Ըստ տեսակի. {TABS.map((t) => `${t.label}՝ ${importing.parsed.filter((r) => r.declarationType === t.type).length}`).join(', ')}, առանց տեսակի՝ {importing.parsed.filter((r) => !r.declarationType).length}։
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>Կապակցվող (ՀԾՀ, տարի, տեսակ, ամսաթիվ)՝ {importing.parsed.filter(isLinkable).length}։</Typography>
            {records.length > 0 && <Typography variant="body2" sx={{ mb: 1 }}>Արդեն առկա (նույն ՎԻՎ Ա, ամսաթիվ, ՀԾՀ)՝ {importing.parsed.length - importing.fresh.length}. «Ավելացնել» ռեժիմում դրանք կանտեսվեն։</Typography>}
            {importing.missingColumns.length > 0 && <Alert severity="warning">Ֆայլում չեն գտնվել սյունակներ՝ {importing.missingColumns.join(', ')}։</Alert>}
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setImporting(null)}>Չեղարկել</Button>
          {records.length > 0 && <Button color="warning" onClick={() => doImport('replace')}>Փոխարինել բոլորը</Button>}
          <Button variant="contained" disabled={importing && !importing.fresh.length} onClick={() => doImport('append')}>Ավելացնել{importing && records.length > 0 ? ` (${importing.fresh.length})` : ''}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** Մեկ ներդիր. տարեթվի ֆիլտր (հայտարարագրի տարի), աղյուսակ, ավելացում */
function PenaltyTab({ type, records, editable, unitByKey, onAdd, onEdit, onDelete }) {
  // լռելյայն՝ ընթացիկ տարի, իսկ եթե դրա համար գրառում չկա՝ տվյալներում առկա ամենավերջին տարին
  const [year, setYear] = useState(() => {
    const ys = records.map((r) => r.year).filter((y) => y && y <= CURRENT_YEAR);
    return ys.includes(CURRENT_YEAR) || !ys.length ? CURRENT_YEAR : Math.max(...ys);
  });
  const years = [...new Set([CURRENT_YEAR, ...records.map((r) => r.year).filter(Boolean)])].sort((a, b) => b - a);
  const noYear = records.filter((r) => !r.year).length;
  const rows = records.filter((r) => year === 'all' || r.year === year).sort((a, b) => (b.vivDate || '').localeCompare(a.vivDate || ''));
  return (
    <Section>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <TextField size="small" select label="Հայտարարագրի տարի" value={year} onChange={(e) => setYear(e.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="all">Բոլորը</MenuItem>
          {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        {editable && <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>Ավելացնել գրառում</Button>}
      </Stack>
      {noYear > 0 && year !== 'all' && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{noYear} գրառում հայտարարագրի տարի չունի և երևում է միայն «Բոլորը» ընտրելիս։</Typography>}
      {type !== DECLARATION_TYPE.yearly && <Alert severity="info" sx={{ mb: 1.5 }}>Այս տեսակի հայտարարագրերի վերլուծության մոտեցումը քննարկվում է. տվյալները պահվում են, բայց կանոններում դեռ չեն օգտագործվում։</Alert>}
      <PenaltyTable rows={rows} editable={editable} unitByKey={unitByKey} onEdit={onEdit} onDelete={onDelete} empty={`${year === 'all' ? 'Գ' : `${year} թվականի հայտարարագրերի համար գ`}րառումներ չկան`} />
    </Section>
  );
}

function PenaltyTable({ rows, editable, unitByKey, onEdit, onDelete, empty }) {
  const linkOf = (r) => (isLinkable(r) && r.declarationType === DECLARATION_TYPE.yearly ? unitByKey.get(penaltyKey(r.ssn, r.year, r.declarationType)) : null);
  return (
    <SimpleTable dense empty={empty} rows={rows} columns={[
      { key: 'viv', label: 'ՎԻՎ Ա', render: (r) => <><Typography variant="body2">{r.vivNumber || '—'}</Typography><Typography variant="caption" color="text.secondary">{fmtDate(r.vivDate)}</Typography></> },
      { key: 'p', label: 'Անձ', render: (r) => <><Typography variant="body2">{[r.firstName, r.lastName, r.patronymic].filter(Boolean).join(' ') || '—'}</Typography><Typography variant="caption" color="text.secondary">{r.ssn ? `ՀԾՀ ${r.ssn}` : 'ՀԾՀ չկա'}{r.declarantType ? ` · ${r.declarantType}` : ''}</Typography></> },
      { key: 'pos', label: 'Պաշտոն', render: (r) => <Typography variant="body2" sx={{ maxWidth: 260 }}>{r.position || '—'}</Typography> },
      { key: 'y', label: 'Հայտ. տարի', render: (r) => r.year ?? '—' },
      { key: 'b', label: 'ՎԻՎ հիմք', render: (r) => r.basis || '—' },
      { key: 'a', label: 'Վարչական ակտ', render: (r) => <><Typography variant="body2">{r.act || '—'}</Typography>{r.decisionDate && <Typography variant="caption" color="text.secondary">որոշում {fmtDate(r.decisionDate)}</Typography>}</> },
      { key: 'l', label: 'Կապակցում', render: (r) => {
        if (r.issues.length) return <Chip size="small" color="warning" variant="outlined" label={`Չի կապակցվում՝ ${r.issues.join(', ')}`} />;
        if (r.declarationType !== DECLARATION_TYPE.yearly) return <Typography variant="caption" color="text.secondary">Վերլուծությունը քննարկվում է</Typography>;
        const u = linkOf(r);
        if (!u) return <Typography variant="caption" color="text.secondary">Հայտարարագիրը ցանկում չէ</Typography>;
        return <Chip size="small" variant="outlined" clickable color={u.missing ? 'error' : 'default'} onClick={() => navigate(`/declarations/${u.id}`)} label={u.missing ? 'Հայտարարագիր չկա' : `${u.code} · ${lk('c_wfstate', u.decl.wfstateid)}`} />;
      } },
      { key: 'src', label: 'Աղբյուր', render: (r) => <Tooltip title={[r.createdAt && `Ավելացվել է ${new Date(r.createdAt).toLocaleString('hy-AM')}${r.createdBy ? ` · ${r.createdBy}` : ''}`, r.updatedAt && `Խմբագրվել է ${new Date(r.updatedAt).toLocaleString('hy-AM')}${r.updatedBy ? ` · ${r.updatedBy}` : ''}`].filter(Boolean).join('\n') || ''}><Typography variant="caption" color="text.secondary">{r.source || '—'}{r.updatedAt ? ' · խմբագրված' : ''}</Typography></Tooltip> },
      ...(editable ? [{ key: 'act', label: '', render: (r) => (
        <Stack direction="row">
          <Tooltip title="Խմբագրել"><IconButton size="small" onClick={() => onEdit(r)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Հեռացնել"><IconButton size="small" onClick={() => onDelete(r)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      ) }] : []),
    ]} />
  );
}

/** Գրառման ավելացում/խմբագրում */
function RecordDialog({ edit, onClose, onSave }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState(() => edit.record
    ? { ...edit.record, year: edit.record.year ?? '', declarationType: edit.record.declarationType ?? '' }
    : { vivNumber: '', vivDate: today, firstName: '', lastName: '', patronymic: '', ssn: '', declarantType: 'Պ/Ա', position: '', year: CURRENT_YEAR - 1, declarationType: edit.type, basis: '', specialist: '', act: '', decisionUrl: '', decisionDate: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ssnBad = f.ssn && !/^\d{10}$/.test(f.ssn);
  const yearBad = f.year !== '' && !/^\d{4}$/.test(String(f.year));
  const valid = f.vivDate && !ssnBad && !yearBad;
  const save = () => onSave({
    ...f,
    ssn: f.ssn.trim(),
    year: f.year === '' ? null : Number(f.year),
    declarationType: f.declarationType === '' ? null : Number(f.declarationType),
    declarationKind: f.declarationType === '' ? (edit.record?.declarationKind || '') : KIND_LABEL[f.declarationType],
    decisionDate: f.decisionDate || null,
  });
  const T = (props) => <TextField size="small" fullWidth {...props} />;
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{edit.record ? 'Խմբագրել տույժի գրառումը' : 'Նոր տույժի գրառում'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'ՎԻՎ Ա N', value: f.vivNumber, onChange: set('vivNumber') })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'ՎԻՎ Ա ամսաթիվ', type: 'date', required: true, value: f.vivDate || '', onChange: set('vivDate'), slotProps: { inputLabel: { shrink: true } }, error: !f.vivDate })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'ՎԻՎ հիմք', value: f.basis, onChange: set('basis'), placeholder: 'օր.՝ 169.28/5' })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Անուն', value: f.firstName, onChange: set('firstName') })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Ազգանուն', value: f.lastName, onChange: set('lastName') })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Հայրանուն', value: f.patronymic, onChange: set('patronymic') })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'ՀԾՀ', value: f.ssn, onChange: set('ssn'), error: ssnBad, helperText: ssnBad ? '10 նիշ' : 'Առանց ՀԾՀ-ի գրառումը չի կապակցվի' })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {T({ select: true, label: 'Հայտարարատուի տեսակ', value: DECLARANT_TYPES.includes(f.declarantType) ? f.declarantType : (f.declarantType || ''), onChange: set('declarantType'), children: [...new Set([...DECLARANT_TYPES, f.declarantType].filter(Boolean))].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>) })}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Պաշտոն', value: f.position, onChange: set('position') })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Հայտարարագրի տարի', value: f.year, onChange: set('year'), error: yearBad, helperText: yearBad ? '4 նիշ' : '' })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            {T({ select: true, label: 'Հայտարարագրի տեսակ', value: f.declarationType, onChange: set('declarationType'), children: [<MenuItem key="" value="">— (չի կապակցվի)</MenuItem>, ...TABS.map((t) => <MenuItem key={t.type} value={t.type}>{t.label}</MenuItem>)] })}
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Մասնագետ', value: f.specialist, onChange: set('specialist') })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Վարչական ակտ', value: f.act, onChange: set('act'), placeholder: 'օր.՝ 200․000' })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Որոշման ամսաթիվ', type: 'date', value: f.decisionDate || '', onChange: set('decisionDate'), slotProps: { inputLabel: { shrink: true } } })}</Grid>
          <Grid size={{ xs: 12, sm: 4 }}>{T({ label: 'Որոշման հղում', value: f.decisionUrl, onChange: set('decisionUrl') })}</Grid>
        </Grid>
        <Box sx={{ mt: 1 }}><Typography variant="caption" color="text.secondary">Կանոններում տույժը հայտարարագրին կապվում է ՀԾՀ-ով, հայտարարագրի տարով և տեսակով, ամսաթիվը՝ «ՎԻՎ Ա ամսաթիվ»։</Typography></Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Չեղարկել</Button><Button variant="contained" disabled={!valid} onClick={save}>Պահպանել</Button></DialogActions>
    </Dialog>
  );
}
