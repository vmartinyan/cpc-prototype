import { createTheme } from '@mui/material/styles';
import { colors, typography, shape, spacingUnit, componentOverrides, statusColors } from './tokens.js';

const { monoFamily, ...muiTypography } = typography;

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    warning: colors.warning,
    success: colors.success,
    info: colors.info,
    background: colors.background,
    text: colors.text,
    divider: colors.divider,
    status: statusColors,
  },
  typography: muiTypography,
  shape,
  spacing: spacingUnit,
  components: componentOverrides,
  custom: { monoFamily },
});
