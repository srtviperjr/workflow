import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BadgeIcon from '@mui/icons-material/Badge';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import GridOnIcon from '@mui/icons-material/GridOn';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { IdentitySwitcher } from './IdentitySwitcher';
import { NotificationBell } from './NotificationBell';
import { useApp } from '../context/AppContext';

const DRAWER_WIDTH = 260;

/** App display version — shown in the AppBar and sidebar. */
export const APP_VERSION = '0.5';

const primaryNav = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/requests', label: 'Requests', icon: <PostAddIcon /> },
  { to: '/register', label: 'Request Register', icon: <GridOnIcon /> },
  { to: '/delegations', label: 'Delegations', icon: <SwapHorizIcon /> },
];

const adminNav = [
  { to: '/forms', label: 'Forms', icon: <DescriptionIcon /> },
  { to: '/workflows', label: 'Workflows', icon: <AccountTreeIcon /> },
  { to: '/users', label: 'Users', icon: <PeopleIcon /> },
  { to: '/roles', label: 'Roles', icon: <BadgeIcon /> },
  { to: '/data-tools', label: 'Data Tools', icon: <AdminPanelSettingsIcon /> },
];

export function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useApp();

  const adminSectionActive = adminNav.some((item) =>
    location.pathname.startsWith(item.to),
  );
  const [adminOpen, setAdminOpen] = useState(adminSectionActive);

  const isSelected = (to: string) =>
    to === '/'
      ? location.pathname === '/'
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const navButtonSx = {
    borderRadius: 2,
    mb: 0.5,
    '&.Mui-selected': {
      bgcolor: 'rgba(13,115,119,0.12)',
      color: 'primary.dark',
      '& .MuiListItemIcon-root': { color: 'primary.main' },
    },
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 700,
              color: 'primary.dark',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Jansen
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.04em' }}
          >
            WORKFLOWS
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
          >
            v{APP_VERSION}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {primaryNav.map((item) => {
          const selected = isSelected(item.to);
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={selected}
              onClick={() => isMobile && setOpen(false)}
              sx={navButtonSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }}
              />
            </ListItemButton>
          );
        })}

        {isAdmin && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <ListItemButton
              onClick={() => setAdminOpen((v) => !v)}
              selected={adminSectionActive}
              sx={navButtonSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AdminPanelSettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Administration"
                primaryTypographyProps={{
                  fontWeight: adminSectionActive ? 700 : 600,
                }}
              />
              {adminOpen || adminSectionActive ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={adminOpen || adminSectionActive} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {adminNav.map((item) => {
                  const selected = isSelected(item.to);
                  return (
                    <ListItemButton
                      key={item.to}
                      component={RouterLink}
                      to={item.to}
                      selected={selected}
                      onClick={() => isMobile && setOpen(false)}
                      sx={{ ...navButtonSx, pl: 4 }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: selected ? 700 : 500,
                          fontSize: '0.9rem',
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at top left, rgba(20,145,155,0.12), transparent 50%), radial-gradient(ellipse at bottom right, rgba(196,92,38,0.08), transparent 45%), #f0f4f5',
      }}
    >
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton color="inherit" edge="start" onClick={() => setOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant="h6"
              noWrap
              sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}
            >
              Jansen Workflows
            </Typography>
            <Typography
              component="span"
              variant="caption"
              sx={{
                ml: 1,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.18)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                display: { xs: 'none', sm: 'inline-block' },
              }}
            >
              v{APP_VERSION}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NotificationBell />
            <IdentitySwitcher />
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={open}
            onClose={() => setOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
