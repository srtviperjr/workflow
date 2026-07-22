import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid2 as Grid,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GridOnIcon from '@mui/icons-material/GridOn';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PeopleIcon from '@mui/icons-material/People';
import { useApp } from '../context/AppContext';
import {
  filterActionableSubmissions,
  filterVisibleSubmissions,
} from '../utils/submissionVisibility';

export function DashboardPage() {
  const { data, currentUser, isAdmin } = useApp();

  const accessOpts = {
    roles: data.roles,
    workflows: data.workflows,
    users: data.users,
    delegations: data.delegations ?? [],
    notifications: data.notifications ?? [],
  };

  const myPending = filterActionableSubmissions(
    currentUser,
    data.submissions,
    data.forms,
    accessOpts,
  );

  const visibleCount = filterVisibleSubmissions(
    currentUser,
    data.submissions,
    data.forms,
    data.users,
    {
      roles: data.roles,
      workflows: data.workflows,
      includeActionable: true,
      delegations: data.delegations ?? [],
      notifications: data.notifications ?? [],
    },
  ).length;

  const stats = [
    {
      label: 'Users',
      value: data.users.length,
      icon: <PeopleIcon />,
      color: '#E25200',
    },
    {
      label: 'Workflows',
      value: data.workflows.length,
      icon: <AccountTreeIcon />,
      color: '#2B2B2B',
    },
    {
      label: 'Forms',
      value: data.forms.length,
      icon: <DescriptionIcon />,
      color: '#1565a0',
    },
    {
      label: 'Visible requests',
      value: visibleCount,
      icon: <GridOnIcon />,
      color: '#2e7d4f',
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 4,
          p: { xs: 2.5, md: 4 },
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(179,66,0,0.94) 0%, rgba(226,82,0,0.90) 50%, rgba(240,106,26,0.88) 100%), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            mb: 1,
          }}
        >
          Jansen Workflows
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.92, maxWidth: 560 }}>
          Project workflow management system.
        </Typography>
        {currentUser && (
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.85 }}>
            Signed in as {currentUser.firstName} {currentUser.lastName} ·{' '}
            {currentUser.company} · {currentUser.project}
            {isAdmin ? ' · Admin' : ''}
          </Typography>
        )}
        <Stack direction="row" spacing={1.5} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
          <Button
            component={RouterLink}
            to="/requests"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
          >
            New Request
          </Button>
          <Button
            component={RouterLink}
            to="/register"
            variant="outlined"
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            View Register
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <Card elevation={1}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {s.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: s.color, opacity: 0.7 }}>{s.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" gutterBottom fontWeight={700}>
        Awaiting your action
      </Typography>
      {myPending.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No items currently require your attention.
        </Typography>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {myPending.map((s) => (
            <Grid key={s.id} size={{ xs: 12, md: 6 }}>
              <Card elevation={1}>
                <CardActionArea component={RouterLink} to={`/register/${s.id}`}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography fontWeight={700}>{s.formName}</Typography>
                      <Chip size="small" label="In progress" color="warning" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {Object.values(s.data)[0]?.toString() ?? '—'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" fontWeight={700}>
          Available forms
        </Typography>
        <Button component={RouterLink} to="/requests" size="small">
          View all requests
        </Button>
      </Stack>
      <Grid container spacing={2}>
        {data.forms.map((f) => (
          <Grid key={f.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={1}>
              <CardActionArea component={RouterLink} to={`/forms/${f.id}/submit`}>
                <CardContent>
                  <Typography fontWeight={700}>{f.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.description || 'No description'}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
