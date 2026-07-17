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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApp } from '../context/AppContext';
import type { Role, RoleScope } from '../types';

export function RolesPage() {
  const { data, isAdmin, addRole, updateRole, deleteRole } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adGroupNames, setAdGroupNames] = useState<string[]>([]);
  const [scope, setScope] = useState<RoleScope>('app');
  const [formIds, setFormIds] = useState<string[]>([]);

  if (!isAdmin) {
    return <Typography>Admin access required.</Typography>;
  }

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setAdGroupNames([]);
    setScope('app');
    setFormIds([]);
    setOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setName(r.name);
    setDescription(r.description);
    setAdGroupNames(r.adGroupNames ?? []);
    setScope(r.scope ?? 'app');
    setFormIds(r.formIds ?? []);
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) return;
    if (scope === 'form' && formIds.length === 0) return;
    const groups = adGroupNames.map((g) => g.trim()).filter(Boolean);
    const payload = {
      name: name.trim(),
      description,
      adGroupNames: groups,
      scope,
      formIds: scope === 'form' ? formIds : [],
    };
    if (editing) {
      updateRole(editing.id, payload);
    } else {
      addRole(payload);
    }
    setOpen(false);
  };

  const userCount = (roleId: string) =>
    data.users.filter((u) => u.roleIds.includes(roleId)).length;

  const formNames = (ids: string[]) =>
    ids
      .map((id) => data.forms.find((f) => f.id === id)?.name)
      .filter(Boolean)
      .join(', ');

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
            Core application roles or form-specific roles, with optional AD group
            mapping
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
              <TableCell>Scope</TableCell>
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
                  {r.scope === 'form' ? (
                    <Stack spacing={0.5}>
                      <Chip size="small" label="Form" color="secondary" />
                      <Typography variant="caption" color="text.secondary">
                        {formNames(r.formIds) || 'No forms'}
                      </Typography>
                    </Stack>
                  ) : (
                    <Chip size="small" label="Application" color="primary" variant="outlined" />
                  )}
                </TableCell>
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
            <FormControl fullWidth disabled={Boolean(editing?.isSystem)}>
              <InputLabel>Scope</InputLabel>
              <Select
                label="Scope"
                value={scope}
                onChange={(e) => {
                  const next = e.target.value as RoleScope;
                  setScope(next);
                  if (next === 'app') setFormIds([]);
                }}
              >
                <MenuItem value="app">Core application</MenuItem>
                <MenuItem value="form">Specific form(s)</MenuItem>
              </Select>
            </FormControl>
            {scope === 'form' && (
              <Autocomplete
                multiple
                options={data.forms}
                getOptionLabel={(f) => f.name}
                value={data.forms.filter((f) => formIds.includes(f.id))}
                onChange={(_e, value) => setFormIds(value.map((f) => f.id))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Forms"
                    required
                    helperText="This role can only act on workflows for these forms"
                  />
                )}
              />
            )}
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
                  helperText="Map this role to one or more Azure AD / Active Directory group names."
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={scope === 'form' && formIds.length === 0}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
