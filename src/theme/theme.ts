import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0d7377',
      light: '#14919b',
      dark: '#095456',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c45c26',
      light: '#e07a45',
      dark: '#9a4518',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f0f4f5',
      paper: '#ffffff',
    },
    success: { main: '#2e7d4f' },
    warning: { main: '#c77d1a' },
    error: { main: '#c62828' },
    info: { main: '#1565a0' },
    divider: 'rgba(13, 115, 119, 0.12)',
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
          '&:hover': { boxShadow: '0 2px 8px rgba(13,115,119,0.25)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: {
          boxShadow: '0 1px 3px rgba(9,84,86,0.08), 0 1px 2px rgba(9,84,86,0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, #095456 0%, #0d7377 55%, #14919b 100%)',
          boxShadow: '0 2px 12px rgba(9,84,86,0.2)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(13,115,119,0.12)',
          background:
            'linear-gradient(180deg, #f7fbfb 0%, #eef5f5 100%)',
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
