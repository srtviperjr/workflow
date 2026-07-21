import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { FormDefinition, RegisterColumnConfig } from '../../types';
import { columnLabel } from '../../utils/registerColumns';

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
      return copy;
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Customize columns — {form.name}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={1.5}>
          Choose which columns appear and their order. Changes are saved for
          your current identity.
        </Typography>
        <List dense disablePadding>
          {draft.map((col, index) => (
            <ListItem
              key={col.id}
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
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
                pr: 12,
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
              <ListItemText primary={columnLabel(col.id, form)} />
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            onSave(draft);
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
