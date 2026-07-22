import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

interface NodeData {
  label: string;
  roleId?: string;
  description?: string;
  roleName?: string;
  decisionMode?: 'manual' | 'conditional';
  [key: string]: unknown;
}

const base = {
  px: 1.5,
  py: 1,
  minWidth: 140,
  textAlign: 'center' as const,
  border: '2px solid',
  boxShadow: '0 2px 8px rgba(43,43,43,0.12)',
};

export function StartNode({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <Box
      sx={{
        ...base,
        borderRadius: '24px',
        bgcolor: '#E25200',
        borderColor: '#B34200',
        color: 'white',
      }}
    >
      <PlayArrowIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
      <Typography variant="body2" fontWeight={700} component="span">
        {d.label}
      </Typography>
      <Handle type="source" position={Position.Bottom} style={{ background: '#B34200' }} />
    </Box>
  );
}

export function EndNode({ data }: NodeProps) {
  const d = data as NodeData;
  const rejected = d.label.toLowerCase().includes('reject');
  return (
    <Box
      sx={{
        ...base,
        borderRadius: '24px',
        bgcolor: rejected ? '#c62828' : '#2e7d4f',
        borderColor: rejected ? '#8e1b1b' : '#1b5e35',
        color: 'white',
      }}
    >
      <StopIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
      <Typography variant="body2" fontWeight={700} component="span">
        {d.label}
      </Typography>
      <Handle type="target" position={Position.Top} style={{ background: '#333' }} />
    </Box>
  );
}

export function StepNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <Box
      sx={{
        ...base,
        borderRadius: 2,
        bgcolor: 'white',
        borderColor: selected ? 'secondary.main' : 'primary.main',
        borderWidth: selected ? 3 : 2,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#E25200' }} />
      <AssignmentIcon sx={{ fontSize: 18, color: 'primary.main', mb: 0.25 }} />
      <Typography variant="body2" fontWeight={700} display="block">
        {d.label}
      </Typography>
      {d.roleName && (
        <Typography variant="caption" color="text.secondary" display="block">
          {d.roleName}
        </Typography>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#E25200' }} />
    </Box>
  );
}

export function DecisionNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <Box
      sx={{
        width: 160,
        height: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'rotate(45deg)',
        bgcolor: '#FFF4EC',
        border: '2px solid',
        borderColor: selected ? '#B34200' : '#E25200',
        borderWidth: selected ? 3 : 2,
        boxShadow: '0 2px 8px rgba(226,82,0,0.18)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        style={{
          background: '#E25200',
          left: '50%',
          top: 0,
          transform: 'translate(-50%, -50%) rotate(-45deg)',
        }}
      />
      <Box sx={{ transform: 'rotate(-45deg)', textAlign: 'center', px: 1 }}>
        <HelpOutlineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
          {d.label}
        </Typography>
        {d.roleName && (
          <Typography variant="caption" color="text.secondary" display="block">
            {d.roleName}
          </Typography>
        )}
        {d.decisionMode === 'conditional' && (
          <Typography
            variant="caption"
            color="primary.main"
            display="block"
            fontWeight={700}
          >
            Field rules
          </Typography>
        )}
      </Box>
      <Handle
        type="source"
        position={Position.Left}
        id="approve"
        style={{
          background: '#2e7d4f',
          left: 0,
          top: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="reject"
        style={{
          background: '#c62828',
          right: 0,
          left: 'auto',
          top: '50%',
          transform: 'translate(50%, -50%) rotate(-45deg)',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="other"
        style={{
          background: '#B34200',
          left: '50%',
          bottom: 0,
          top: 'auto',
          transform: 'translate(-50%, 50%) rotate(-45deg)',
        }}
      />
    </Box>
  );
}

export function NotificationNode({ data, selected }: NodeProps) {
  const d = data as NodeData & {
    notificationTemplateName?: string;
    notifyRoleIds?: string[];
    notifySubmitter?: boolean;
  };
  const roleCount = Array.isArray(d.notifyRoleIds) ? d.notifyRoleIds.length : 0;
  const parts: string[] = [];
  if (roleCount > 0) {
    parts.push(`${roleCount} role${roleCount === 1 ? '' : 's'}`);
  }
  if (d.notifySubmitter) parts.push('submitter');
  const recipients =
    parts.length > 0 ? parts.join(' + ') : 'No recipients';
  const subtitle = d.notificationTemplateName
    ? `${d.notificationTemplateName} · ${recipients}`
    : recipients;
  return (
    <Box
      sx={{
        ...base,
        borderRadius: 2,
        bgcolor: '#F2F2F2',
        borderColor: selected ? '#141414' : '#2B2B2B',
        borderWidth: selected ? 3 : 2,
        minWidth: 150,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#2B2B2B' }} />
      <NotificationsNoneIcon sx={{ fontSize: 18, color: '#2B2B2B', mb: 0.25 }} />
      <Typography variant="body2" fontWeight={700} display="block">
        {d.label}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {subtitle}
      </Typography>
      <Handle type="source" position={Position.Bottom} style={{ background: '#2B2B2B' }} />
    </Box>
  );
}
