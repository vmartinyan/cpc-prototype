import { useEffect, useState } from 'react';
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, TextField, MenuItem,
  Divider, ListSubheader, useMediaQuery, Chip, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Collapse,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { layout } from './theme/tokens.js';
import { useStore, ROLES, can } from './engine/store.js';
import Dashboard from './pages/Dashboard.jsx';
import { DeclarationsList, DeclarationDetail, DeclarationTypePage } from './pages/Declarations.jsx';
import { DECLARATION_TYPE } from './data/epd/classifiers.js';
import { PartiesList, PartyDetail, PartyPersonDetail } from './pages/Parties.jsx';
import { GiftsList, GiftDetail } from './pages/Gifts.jsx';
import { IntegrityList, IntegrityDetail } from './pages/Integrity.jsx';
import RulesPage from './pages/Rules.jsx';
import VariablesPage from './pages/Variables.jsx';
import ExternalPage from './pages/External.jsx';
import ExternalFilesPage from './pages/ExternalFiles.jsx';
import UsersPage from './pages/Users.jsx';
import { OpenQuestionsButton } from './components/OpenQuestions.jsx';

const NAV = [
  { group: 'Վերլուծություն' },
  { path: '/', label: 'Վահանակ', icon: DashboardOutlinedIcon, perm: 'dashboard' },
  {
    path: '/declarations', label: 'Հայտարարագրեր', icon: DescriptionOutlinedIcon, perm: 'view_docs',
    children: [
      { path: '/declarations', label: 'Տարեկան' },
      { path: '/declarations/assumption', label: 'Պաշտոնը ստանձնելու' },
      { path: '/declarations/termination', label: 'Պաշտոնը դադարեցնելու' },
    ],
  },
  { path: '/parties', label: 'Կուսակցություններ', icon: GroupsOutlinedIcon, perm: 'view_docs' },
  { path: '/gifts', label: 'Նվերների ձևաթղթեր', icon: CardGiftcardOutlinedIcon, perm: 'view_docs' },
  { path: '/integrity', label: 'Բարեվարքություն', icon: FactCheckOutlinedIcon, perm: 'view_docs' },
  { group: 'Կարգավորումներ' },
  { path: '/rules', label: 'Կանոններ', icon: RuleOutlinedIcon, perm: 'view_rules' },
  { path: '/variables', label: 'Փոփոխականներ', icon: TuneOutlinedIcon, perm: 'view_rules' },
  { path: '/external', label: 'Արտաքին համակարգեր', icon: HubOutlinedIcon, perm: 'view_rules' },
  { path: '/files', label: 'Արտաքին ֆայլեր', icon: FolderOpenOutlinedIcon, perm: 'view_docs', children: [{ path: '/files/penalties', label: 'Տույժեր' }] },
  { path: '/users', label: 'Օգտատերեր', icon: ManageAccountsOutlinedIcon, perm: 'users' },
];

/** Մայր կետի ենթակետերից որևէ մեկի էջն է բաց */
const navChildActive = (parent, path) => parent.children.some((c) => path === c.path || path.startsWith(`${c.path}/`)) || path === parent.path || path.startsWith(`${parent.path}/`);

/** Ենթակետի ընտրվածություն. ամենաերկար համընկնող հասցեն (օր.՝ /declarations/123 → «Տարեկան») */
function navChildSelected(parent, child, path) {
  const matches = parent.children.filter((c) => path === c.path || path.startsWith(`${c.path}/`));
  if (!matches.length && path === parent.path) return child === parent.children[0];
  const best = matches.sort((a, b) => b.path.length - a.path.length)[0];
  return best?.path === child.path;
}

function useHashPath() {
  const get = () => (window.location.hash.replace(/^#/, '') || '/');
  const [path, setPath] = useState(get);
  useEffect(() => {
    const on = () => { setPath(get()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

function route(path) {
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  switch (seg[0]) {
    case undefined: return { el: <Dashboard />, perm: 'dashboard' };
    case 'declarations':
      if (seg[1] === 'assumption') return { el: <DeclarationTypePage key="a" type={DECLARATION_TYPE.assumption} />, perm: 'view_docs' };
      if (seg[1] === 'termination') return { el: <DeclarationTypePage key="t" type={DECLARATION_TYPE.termination} />, perm: 'view_docs' };
      return { el: seg[1] ? <DeclarationDetail key={seg[1]} id={seg[1]} tab={seg[2]} /> : <DeclarationsList />, perm: 'view_docs' };
    case 'parties':
      if (seg[1] === 'person') return { el: <PartyPersonDetail id={seg.slice(2).join('/')} />, perm: 'view_docs' };
      return { el: seg[1] ? <PartyDetail id={seg[1]} /> : <PartiesList />, perm: 'view_docs' };
    case 'gifts': return { el: seg[1] ? <GiftDetail id={seg[1]} /> : <GiftsList />, perm: 'view_docs' };
    case 'integrity': return { el: seg[1] ? <IntegrityDetail id={seg[1]} /> : <IntegrityList />, perm: 'view_docs' };
    case 'rules': return { el: <RulesPage tab={seg[1]} editId={seg[2]} />, perm: 'view_rules' };
    case 'variables': return { el: <VariablesPage tab={seg[1]} />, perm: 'view_rules' };
    case 'external': return { el: <ExternalPage />, perm: 'view_rules' };
    case 'files':
      if (!seg[1] || seg[1] === 'penalties') return { el: <ExternalFilesPage />, perm: 'view_docs' };
      return { el: <Typography>Էջը չի գտնվել</Typography>, perm: null };
    case 'users': return { el: <UsersPage />, perm: 'users' };
    default: return { el: <Typography>Էջը չի գտնվել</Typography>, perm: null };
  }
}

export default function App() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { state, update, reset } = useStore();
  const path = useHashPath();
  const { el, perm } = route(path);
  const allowed = !perm || can(state.role, perm);
  const outages = Object.entries(state.outages).filter(([, v]) => v).length;
  // ենթամենյուներ. բացվում են մայր կետը սեղմելիս, իսկ ենթակետի էջը բաց լինելու դեպքում մնում են բաց
  const [openNav, setOpenNav] = useState({});
  useEffect(() => { setOpenNav({}); }, [path]);

  const drawer = (
    <Box>
      <Toolbar />
      <List dense>
        {NAV.map((n, i) => n.group ? (
          <ListSubheader key={i} sx={{ bgcolor: 'transparent', lineHeight: '36px', mt: i ? 1 : 0 }}>{n.group}</ListSubheader>
        ) : can(state.role, n.perm) && (
          <Box key={n.path}>
            {(() => {
              const active = n.children && navChildActive(n, path);
              const open = !!n.children && (active || !!openNav[n.path]);
              return (
                <>
                  <ListItemButton
                    selected={!n.children && (n.path === '/' ? path === '/' : path.startsWith(n.path))}
                    onClick={() => {
                      if (n.children) { if (!active) setOpenNav((o) => ({ ...o, [n.path]: !o[n.path] })); return; }
                      window.location.hash = n.path; setMobileOpen(false);
                    }}
                    sx={{ mx: 1, borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}><n.icon fontSize="small" color={active ? 'primary' : undefined} /></ListItemIcon>
                    <ListItemText primary={n.label} slotProps={{ primary: { sx: active ? { fontWeight: 600, color: 'primary.main' } : undefined } }} />
                    {n.children && (open ? <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />)}
                  </ListItemButton>
                  {n.children && (
                    <Collapse in={open} timeout="auto" unmountOnExit>
                      {n.children.map((c) => (
                        <ListItemButton key={c.path} selected={navChildSelected(n, c, path)} onClick={() => { window.location.hash = c.path; setMobileOpen(false); }} sx={{ mx: 1, pl: 6.5, py: 0.25, borderRadius: 1 }}>
                          <ListItemText primary={c.label} slotProps={{ primary: { variant: 'body2' } }} />
                        </ListItemButton>
                      ))}
                    </Collapse>
                  )}
                </>
              );
            })()}
          </Box>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: 'block' }}>
        Ցուցադրական նախատիպ. տվյալները mock են (EPD և պետական շտեմարաններ), իրական ինտեգրում չկա։
      </Typography>
      <Box sx={{ mt: 1.5 }}><OpenQuestionsButton /></Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1.5 }}>
          {!desktop && <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} aria-label="Մենյու"><MenuIcon /></IconButton>}
          <Typography variant="h6" noWrap sx={{ flex: 1, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
            ԿԿՀ · Ռիսկերի վերլուծության մոդուլ <Box component="span" sx={{ opacity: 0.7, fontWeight: 400, display: { xs: 'none', md: 'inline' } }}>— նախատիպ</Box>
          </Typography>
          {outages > 0 && <Chip size="small" color="warning" label={`${outages} աղբյուր անհասանելի`} onClick={() => (window.location.hash = '/external')} />}
          <TextField
            select size="small" value={state.role} onChange={(e) => update({ role: e.target.value })} label="Դեր"
            sx={{ minWidth: { xs: 140, sm: 230 }, '& .MuiInputBase-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' }, '& .MuiSvgIcon-root': { color: '#fff' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } }}
          >
            {Object.entries(ROLES).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
          </TextField>
          <Tooltip title="Վերականգնել նախնական վիճակը"><IconButton color="inherit" onClick={() => setConfirmReset(true)}><RestartAltIcon /></IconButton></Tooltip>
        </Toolbar>
      </AppBar>
      <Drawer variant={desktop ? 'permanent' : 'temporary'} open={desktop || mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ width: layout.drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: layout.drawerWidth, boxSizing: 'border-box' } }}>
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: layout.pagePadding } }}>
        <Toolbar />
        <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto' }}>
          {allowed ? el : <Typography color="text.secondary">Ընտրված դերը («{ROLES[state.role]}») այս էջի հասանելիություն չունի (NFR-02)։</Typography>}
        </Box>
      </Box>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Վերականգնել նախնական վիճակը</DialogTitle>
        <DialogContent>
          <DialogContentText>Կջնջվեն մոդուլում պահված բոլոր փոփոխությունները՝ փոփոխականների արժեքները, կանոնների կարգավորումները և կառուցիչի կանոնները, ճշգրտումները, ձեռքով նշումները և եզրակացությունները։ EPD-ի mock տվյալները չեն փոխվում։</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Չեղարկել</Button>
          <Button color="error" onClick={() => { reset(); setConfirmReset(false); }}>Վերականգնել</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
