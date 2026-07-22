import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import type { FormDefinition, RegisterColumnConfig } from '../../types';
import {
  columnLabel,
  normalizeRegisterColumnOrder,
} from '../../utils/registerColumns';

interface Props {
  open: boolean;
  form: FormDefinition;
  columns: RegisterColumnConfig[];
  onClose: () => void;
  onSave: (columns: RegisterColumnConfig[]) => void;
}

export function CustomizeRegisterColumnsDialog({
  open,
  form,
  columns,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<RegisterColumnConfig[]>(() =>
    columns.map((c) => ({ ...c })),
  );

  useEffect(() => {
    if (open) setDraft(columns.map((c) => ({ ...c })));
  }, [open, columns]);

  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= draft.length) return;
    setDraft((cols) => {
      const copy = [...cols];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return normalizeRegisterColumnOrder(copy);
    });
  };

  const toggleSticky = (index: number) => {
    setDraft((cols) => {
      const next = cols.map((c, i) =>
        i === index ? { ...c, sticky: !c.sticky } : c,
      );
      return normalizeRegisterColumnOrder(next);
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Customize columns — {form.name}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={1.5}>
          Choose which columns appear, pin sticky columns (locked while
          scrolling horizontally), and reorder. Sticky columns stay on the
          left. Changes are saved for your current identity.
        </Typography>
        <List dense disablePadding>
          {draft.map((col, index) => (
            <ListItem
              key={col.id}
              secondaryAction={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip
                    title={
                      col.sticky
                        ? 'Unpin (stop locking while scrolling)'
                        : 'Pin sticky (lock while scrolling)'
                    }
                  >
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={col.sticky ? 'Unpin column' : 'Pin column'}
                      color={col.sticky ? 'primary' : 'default'}
                      onClick={() => toggleSticky(index)}
                    >
                      {col.sticky ? (
                        <PushPinIcon fontSize="small" />
                      ) : (
                        <PushPinOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    aria-label="Move down"
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                pr: 16,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  edge="start"
                  checked={col.visible}
                  onChange={(e) =>
                    setDraft((cols) =>
                      cols.map((c, i) =>
                        i === index ? { ...c, visible: e.target.checked } : c,
                      ),
                    )
                  }
                />
              </ListItemIcon>
              <ListItemText
                primary={columnLabel(col.id, form)}
                secondary={col.sticky ? 'Sticky' : undefined}
              />
            </ListItem>
          ))}
        </List>
        <Box mt={1.5}>
          <Button
            size="small"
            onClick={() =>
              setDraft((cols) => cols.map((c) => ({ ...c, visible: true })))
            }
          >
            Show all
          </Button>
          <Button
            size="small"
            onClick={() =>
              setDraft((cols) =>
                cols.map((c) => ({
                  ...c,
                  visible: !c.id.startsWith('field:'),
                })),
              )
            }
          >
            Meta only
          </Button>
          <FormControlLabel
            sx={{ ml: 1 }}
            control={
              <Checkbox
                size="small"
                checked={draft
                  .filter((c) => c.id === 'requestId' || c.id === 'submitter')
                  .every((c) => c.sticky)}
                onChange={(e) =>
                  setDraft((cols) =>
                    normalizeRegisterColumnOrder(
                      cols.map((c) =>
                        c.id === 'requestId' || c.id === 'submitter'
                          ? { ...c, sticky: e.target.checked }
                          : c,
                      ),
                    ),
                  )
                }
              />
            }
            label={
              <Typography variant="body2">
                Default pins (Request #, Submitter)
              </Typography>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            onSave(normalizeRegisterColumnOrder(draft));
            onClose();
          }}
          disabled={!draft.some((c) => c.visible)}
        >
          Save layout
        </Button>
      </DialogActions>
    </Dialog>
  );
}
