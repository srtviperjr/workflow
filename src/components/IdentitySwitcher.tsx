import {
  Avatar,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useApp } from '../context/AppContext';

export function IdentitySwitcher() {
  const { data, currentUser, setCurrentUserId, getRoleById } = useApp();

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <SwapHorizIcon sx={{ opacity: 0.85, display: { xs: 'none', sm: 'block' } }} />
      <FormControl
        size="small"
        sx={{
          minWidth: { xs: 160, sm: 240 },
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(255,255,255,0.15)',
            color: 'white',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.55)' },
            '&.Mui-focused fieldset': { borderColor: 'white' },
          },
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.85)' },
          '& .MuiSvgIcon-root': { color: 'white' },
        }}
      >
        <InputLabel id="identity-switcher-label">Acting as</InputLabel>
        <Select
          labelId="identity-switcher-label"
          label="Acting as"
          value={currentUser?.id ?? ''}
          onChange={(e) => setCurrentUserId(e.target.value)}
          renderValue={(value) => {
            const u = data.users.find((x) => x.id === value);
            if (!u) return 'Select user';
            return (
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    fontSize: 12,
                    bgcolor: 'secondary.main',
                  }}
                >
                  {u.firstName[0]}
                  {u.lastName[0]}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {u.firstName} {u.lastName}
                  </Typography>
                </Box>
              </Stack>
            );
          }}
        >
          {data.users.map((u) => {
            const roles = u.roleIds
              .map((id) => getRoleById(id)?.name)
              .filter(Boolean)
              .join(', ');
            return (
              <MenuItem key={u.id} value={u.id}>
                <Stack>
                  <Typography variant="body2" fontWeight={600}>
                    {u.firstName} {u.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {u.company} · {roles || 'No roles'}
                  </Typography>
                </Stack>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Stack>
  );
}
