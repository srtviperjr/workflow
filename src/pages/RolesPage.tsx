import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';

export function RolesPage() {
  const { data, isAdmin, addRole, updateRole, deleteRole } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setName(r.name);
    setDescription(r.description);
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) return;
    if (editing) {
      updateRole(editing.id, { name: name.trim(), description });
    } else {
      addRole({ name: name.trim(), description });
    }
    setOpen(false);
  };

  const userCount = (roleId: string) =>
    data.users.filter((u) => u.roleIds.includes(roleId)).length;

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Roles
          </Typography>
          <Typography color="text.secondary">
            System roles: Requestor, Manager, Project Director, Admin
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Role
        </Button>
      </Stack>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.roles.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{r.name}</Typography>
                </TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell>{userCount(r.id)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={r.isSystem ? 'System' : 'Custom'}
                    color={r.isSystem ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(r)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={r.isSystem}
                    onClick={() => {
                      if (confirm(`Delete role ${r.name}?`)) deleteRole(r.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Role name"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
