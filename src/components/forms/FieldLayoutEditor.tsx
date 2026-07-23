import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import type { FormField } from '../../types';

const CANVAS_W = 720;
const CANVAS_H = 520;
const DEFAULT_W = 280;
const CARD_H = 72;

interface Props {
  open: boolean;
  fields: FormField[];
  onClose: () => void;
  onSave: (fields: FormField[]) => void;
}

function defaultLayout(index: number): { x: number; y: number; w: number } {
  return {
    x: 24,
    y: 24 + index * (CARD_H + 16),
    w: DEFAULT_W,
  };
}

/** Drag fields on a board to set form layout positions. */
export function FieldLayoutEditor({ open, fields, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<FormField[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(
      fields.map((f, i) => ({
        ...f,
        layout: f.layout
          ? { ...f.layout, w: f.layout.w ?? DEFAULT_W }
          : defaultLayout(i),
      })),
    );
  }, [open, fields]);

  const onPointerDown = (
    e: ReactPointerEvent,
    id: string,
    layout: { x: number; y: number },
  ) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      originX: layout.x,
      originY: layout.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    const { id, startX, startY, originX, originY } = dragRef.current;
    const w =
      draft.find((f) => f.id === id)?.layout?.w ?? DEFAULT_W;
    const x = Math.max(
      0,
      Math.min(CANVAS_W - w, originX + (e.clientX - startX)),
    );
    const y = Math.max(
      0,
      Math.min(CANVAS_H - CARD_H, originY + (e.clientY - startY)),
    );
    setDraft((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, layout: { ...f.layout!, x, y, w: f.layout?.w ?? DEFAULT_W } }
          : f,
      ),
    );
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (dragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Field layout</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Drag fields on the canvas to place them. Positions are used when
          filling out and previewing the form.
        </Typography>
        <Box
          ref={canvasRef}
          onPointerMove={onPointerMove}
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: CANVAS_W,
            height: CANVAS_H,
            mx: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'grey.50',
            backgroundImage:
              'linear-gradient(#eceff1 1px, transparent 1px), linear-gradient(90deg, #eceff1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            overflow: 'hidden',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          {draft.map((f) => {
            const layout = f.layout ?? defaultLayout(0);
            return (
              <Box
                key={f.id}
                onPointerDown={(e) => onPointerDown(e, f.id, layout)}
                onPointerUp={onPointerUp}
                sx={{
                  position: 'absolute',
                  left: layout.x,
                  top: layout.y,
                  width: layout.w ?? DEFAULT_W,
                  minHeight: CARD_H,
                  px: 1.5,
                  py: 1,
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  cursor: 'grab',
                  boxShadow: 1,
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {f.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {f.type}
                  {f.required ? ' · required' : ''}
                </Typography>
              </Box>
            );
          })}
          {draft.length === 0 && (
            <Stack
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              Add fields to the form first.
            </Stack>
          )}
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
        >
          Apply layout
        </Button>
      </DialogActions>
    </Dialog>
  );
}
