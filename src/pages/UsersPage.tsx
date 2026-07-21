import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Checkbox,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApp } from '../context/AppContext';
import { COMPANIES, PROJECTS, type Company, type Project, type User } from '../types';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  company: 'BHP' as Company,
  project: 'Jansen' as Project,
  roleIds: [] as string[],
};

export function UsersPage() {
  const { data, isAdmin, addUser, updateUser, deleteUser } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      company: u.company,
      project: u.project ?? 'Jansen',
      roleIds: [...u.roleIds],
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim())
      return;
    if (editing) {
      updateUser(editing.id, form);
    } else {
      addUser(form);
    }
    setOpen(false);
  };

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
            Users
          </Typography>
          <Typography color="text.secondary">
            Manage people and assign roles
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add User
        </Button>
      </Stack>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>
                    {u.firstName} {u.lastName}
                  </Typography>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip size="small" label={u.company} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={u.project ?? '—'} variant="outlined" />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {u.roleIds.map((rid) => {
                      const role = data.roles.find((r) => r.id === rid);
                      return role ? (
                        <Chip key={rid} size="small" label={role.name} color="primary" variant="outlined" />
                      ) : null;
                    })}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(u)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={u.id === 'user-admin'}
                    onClick={() => {
                      if (confirm(`Delete ${u.firstName} ${u.lastName}?`))
                        deleteUser(u.id);
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
        <DialogTitle>{editing ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First name"
                required
                fullWidth
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
              <TextField
                label="Last name"
                required
                fullWidth
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </Stack>
            <TextField
              label="Email address"
              type="email"
              required
              fullWidth
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>Company</InputLabel>
              <Select
                label="Company"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    company: e.target.value as Company,
                  }))
                }
              >
                {COMPANIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Project</InputLabel>
              <Select
                label="Project"
                value={form.project}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    project: e.target.value as Project,
                  }))
                }
              >
                {PROJECTS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                label="Roles"
                value={form.roleIds}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    roleIds:
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value,
                  }))
                }
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) =>
                  selected
                    .map((id) => data.roles.find((r) => r.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')
                }
              >
                {data.roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    <Checkbox checked={form.roleIds.includes(r.id)} />
                    <ListItemText primary={r.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
