import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import type { FormStatusKind } from '../../types';

interface NodeData {
  label: string;
  roleId?: string;
  description?: string;
  roleName?: string;
  decisionMode?: 'manual' | 'conditional';
  decisionActions?: string[];
  /** Enriched labels/kinds for decision action handles */
  decisionActionMeta?: Array<{ id: string; label: string; kind: FormStatusKind }>;
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

function handleColor(kind: FormStatusKind): string {
  if (kind === 'positive') return '#2e7d4f';
  if (kind === 'negative') return '#c62828';
  return '#B34200';
}

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
        borderColor: rejected ? '#8e0000' : '#1b5e20',
        color: 'white',
      }}
    >
      <StopIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
      <Typography variant="body2" fontWeight={700} component="span">
        {d.label}
      </Typography>
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
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
        bgcolor: selected ? '#FFF3E0' : 'white',
        borderColor: '#E25200',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#E25200' }} />
      <AssignmentIcon sx={{ fontSize: 18, color: '#E25200', mb: 0.25 }} />
      <Typography variant="body2" fontWeight={700}>
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
  const actions =
    d.decisionActionMeta && d.decisionActionMeta.length > 0
      ? d.decisionActionMeta
      : (d.decisionActions ?? []).map((id) => ({
          id,
          label: id,
          kind: 'neutral' as FormStatusKind,
        }));

  // Distribute source handles: first left, second right, rest along bottom
  const handleStyle = (
    index: number,
    total: number,
    kind: FormStatusKind,
  ): CSSProperties => {
    const color = handleColor(kind);
    if (index === 0 && total >= 1) {
      return {
        background: color,
        left: 0,
        top: '50%',
        transform: 'translate(-50%, -50%) rotate(-45deg)',
      };
    }
    if (index === 1 && total >= 2) {
      return {
        background: color,
        right: 0,
        left: 'auto',
        top: '50%',
        transform: 'translate(50%, -50%) rotate(-45deg)',
      };
    }
    const bottomIndex = index - 2;
    const bottomCount = Math.max(total - 2, 1);
    const pct = ((bottomIndex + 1) / (bottomCount + 1)) * 100;
    return {
      background: color,
      left: `${pct}%`,
      bottom: 0,
      top: 'auto',
      transform: 'translate(-50%, 50%) rotate(-45deg)',
    };
  };

  return (
    <Box
      sx={{
        ...base,
        minWidth: 160,
        borderRadius: 1,
        bgcolor: selected ? '#FFF8E1' : 'white',
        borderColor: '#F9A825',
        transform: 'rotate(0deg)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#F9A825' }} />
      <HelpOutlineIcon sx={{ fontSize: 18, color: '#F9A825', mb: 0.25 }} />
      <Typography variant="body2" fontWeight={700}>
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
      {d.decisionMode !== 'conditional' && actions.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block">
          {actions.map((a) => a.label).join(' · ')}
        </Typography>
      )}
      {d.decisionMode === 'conditional' ? (
        <Handle
          type="source"
          position={Position.Bottom}
          id="other"
          style={{ background: '#B34200' }}
        />
      ) : actions.length === 0 ? (
        <Handle
          type="source"
          position={Position.Bottom}
          id="other"
          style={{ background: '#B34200' }}
        />
      ) : (
        actions.map((a, i) => (
          <Handle
            key={a.id}
            type="source"
            position={
              i === 0 ? Position.Left : i === 1 ? Position.Right : Position.Bottom
            }
            id={a.id}
            style={handleStyle(i, actions.length, a.kind)}
            title={a.label}
          />
        ))
      )}
    </Box>
  );
}

export function NotificationNode({ data, selected }: NodeProps) {
  const d = data as NodeData & {
    notificationTemplateName?: string;
    notifyRoleIds?: string[];
    notifySubmitter?: boolean;
  };
  return (
    <Box
      sx={{
        ...base,
        borderRadius: 2,
        bgcolor: selected ? '#E3F2FD' : 'white',
        borderColor: '#1565C0',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#1565C0' }} />
      <NotificationsNoneIcon sx={{ fontSize: 18, color: '#1565C0', mb: 0.25 }} />
      <Typography variant="body2" fontWeight={700}>
        {d.label}
      </Typography>
      {d.notificationTemplateName && (
        <Typography variant="caption" color="text.secondary" display="block">
          {d.notificationTemplateName}
        </Typography>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#1565C0' }} />
    </Box>
  );
}
