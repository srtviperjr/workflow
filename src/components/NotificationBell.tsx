import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useApp } from '../context/AppContext';

/** App bar shortcut to Notifications, placed left of the identity picker. */
export function NotificationBell() {
  const { data, currentUser, isAdmin } = useApp();
  const navigate = useNavigate();

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    const mine = (data.notifications ?? []).filter((n) =>
      isAdmin ? true : n.toUserIds.includes(currentUser.id),
    );
    return mine.filter(
      (n) =>
        n.toUserIds.includes(currentUser.id) &&
        !(n.readByUserIds ?? []).includes(currentUser.id),
    ).length;
  }, [data.notifications, currentUser, isAdmin]);

  return (
    <Tooltip title="Notifications">
      <IconButton
        color="inherit"
        aria-label="Notifications"
        onClick={() => navigate('/notifications')}
        sx={{
          bgcolor: 'rgba(255,255,255,0.12)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="secondary"
          max={99}
          overlap="circular"
        >
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
