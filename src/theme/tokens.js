/**
 * ԴԻԶԱՅՆԻ ՏՈԿԵՆՆԵՐ — միակ տեղը, որտեղ սահմանվում են գույները, տառատեսակները,
 * հեռավորությունները, կլորացումները և բաղադրիչների ոճերը։
 *
 * ԿԿՀ-ի Figma դիզայնը ստանալուց հետո բավական է փոխել այս ֆայլի արժեքները.
 * բաղադրիչներում գույներ/չափեր ուղղակիորեն գրված չեն, նրանք օգտագործում են
 * MUI թեման (theme.js), որը կառուցվում է այս տոկեններից։
 */

export const colors = {
  primary: { main: '#1F4E8C', light: '#4F7BBF', dark: '#14345E', contrastText: '#FFFFFF' },
  secondary: { main: '#6B5B95', light: '#9A8BC4', dark: '#463A66', contrastText: '#FFFFFF' },
  error: { main: '#C62828', light: '#EF5350', dark: '#8E0000' },
  warning: { main: '#B26A00', light: '#FFB74D', dark: '#7A4700' },
  success: { main: '#2E7D32', light: '#66BB6A', dark: '#1B5E20' },
  info: { main: '#0277BD', light: '#4FC3F7', dark: '#01579B' },
  background: { default: '#F4F6F9', paper: '#FFFFFF' },
  text: { primary: '#1B2430', secondary: '#5A6473', disabled: '#9AA3AF' },
  divider: '#E0E4EA',
  appBar: '#14345E',
  sidebar: '#FFFFFF',
};

/** Ռիսկային կարգավիճակների գույները (կանոնի արդյունք, փաստաթղթի կարգավիճակ) */
export const statusColors = {
  fired: colors.error.main, // կանոնը աշխատել է
  notFired: colors.success.main, // կանոնը չի աշխատել
  notEvaluated: colors.warning.main, // չի գնահատվել (COM-17)
  notImplemented: '#7B8794', // չիրականացված կանոն
  manual: colors.secondary.main, // ձեռքով ռիսկային նշում (COM-20)
};

/** Գծապատկերների գույներ (վահանակ) */
export const chartColors = {
  series: ['#1F4E8C', '#6B5B95', '#0277BD', '#2E7D32'],
  risky: colors.error.main,
  notRisky: '#B8C2CF',
};

export const typography = {
  // Noto Sans Armenian-ը ներառված է նախատիպի մեջ (աշխատում է առանց ինտերնետի)
  fontFamily: '"Noto Sans Armenian", "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 14,
  h4: { fontSize: '1.75rem', fontWeight: 600 },
  h5: { fontSize: '1.375rem', fontWeight: 600 },
  h6: { fontSize: '1.125rem', fontWeight: 600 },
  subtitle1: { fontWeight: 600 },
  subtitle2: { fontWeight: 600 },
  button: { textTransform: 'none', fontWeight: 600 },
  monoFamily: '"Cascadia Mono", Consolas, "Courier New", monospace',
};

export const spacingUnit = 8; // MUI spacing(1) = 8px

export const shape = { borderRadius: 8 };

export const layout = {
  drawerWidth: 264,
  appBarHeight: 64,
  contentMaxWidth: 1440,
  pagePadding: 3, // spacing միավորներով
};

/** Բաղադրիչների ոճերի ճշգրտումներ (MUI components overrides) */
export const componentOverrides = {
  MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: `1px solid ${colors.divider}` } } },
  MuiAppBar: { styleOverrides: { root: { backgroundColor: colors.appBar, border: 'none' } } },
  MuiDrawer: { styleOverrides: { paper: { backgroundColor: colors.sidebar } } },
  MuiButton: { defaultProps: { disableElevation: true } },
  MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
  MuiTableCell: {
    styleOverrides: {
      head: { fontWeight: 600, backgroundColor: '#F8FAFC', color: colors.text.secondary },
      root: { borderColor: colors.divider },
    },
  },
  MuiTooltip: { styleOverrides: { tooltip: { fontSize: '0.8rem' } } },
};
