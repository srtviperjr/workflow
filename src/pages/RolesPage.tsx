import { useState } from 'react';
import {
  Autocomplete,
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
  const [adGroupNames, setAdGroupNames] = useState<string[]>([]);

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setAdGroupNames([]);
    setOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setName(r.name);
    setDescription(r.description);
    setAdGroupNames(r.adGroupNames ?? []);
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) return;
    const groups = adGroupNames.map((g) => g.trim()).filter(Boolean);
    if (editing) {
      updateRole(editing.id, {
        name: name.trim(),
        description,
        adGroupNames: groups,
      });
    } else {
      addRole({ name: name.trim(), description, adGroupNames: groups });
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
            Map each role to one or more Active Directory group names
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
              <TableCell>AD Groups</TableCell>
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
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(r.adGroupNames ?? []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    ) : (
                      r.adGroupNames.map((group) => (
                        <Chip
                          key={group}
                          size="small"
                          label={group}
                          variant="outlined"
                        />
                      ))
                    )}
                  </Stack>
                </TableCell>
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
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={adGroupNames}
              onChange={(_event, value) => {
                setAdGroupNames(
                  value
                    .map((v) => (typeof v === 'string' ? v.trim() : v))
                    .filter(Boolean),
                );
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      variant="outlined"
                      label={option}
                      size="small"
                      {...tagProps}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Active Directory groups"
                  placeholder="Type a group name and press Enter"
                  helperText="Map this role to one or more Azure AD / Active Directory group names. Users in these groups would receive this role when SSO is connected."
                />
              )}
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
