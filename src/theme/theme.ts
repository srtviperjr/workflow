import { createTheme } from '@mui/material/styles';

/** BHP-inspired orange primary (#E25200) with charcoal secondary. */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#E25200',
      light: '#F06A1A',
      dark: '#B34200',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2B2B2B',
      light: '#4A4A4A',
      dark: '#141414',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F4F2F0',
      paper: '#ffffff',
    },
    success: { main: '#2e7d4f' },
    warning: { main: '#c77d1a' },
    error: { main: '#c62828' },
    info: { main: '#1565a0' },
    divider: 'rgba(226, 82, 0, 0.14)',
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Outfit", "DM Sans", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Outfit", "DM Sans", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Outfit", "DM Sans", sans-serif', fontWeight: 650 },
    h4: { fontFamily: '"Outfit", "DM Sans", sans-serif', fontWeight: 650 },
    h5: { fontFamily: '"Outfit", "DM Sans", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Outfit", "DM Sans", sans-serif', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: 'none' },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 2px 8px rgba(226,82,0,0.28)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: {
          boxShadow:
            '0 1px 3px rgba(43,43,43,0.08), 0 1px 2px rgba(43,43,43,0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage:
            'linear-gradient(135deg, #B34200 0%, #E25200 55%, #F06A1A 100%)',
          boxShadow: '0 2px 12px rgba(179,66,0,0.28)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(226,82,0,0.12)',
          background: 'linear-gradient(180deg, #FFFAF7 0%, #F4F2F0 100%)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});
